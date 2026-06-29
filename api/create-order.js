// /api/create-order.js — Vercel Serverless Function

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Check env vars first
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay env vars');
      return res.status(500).json({ error: 'Payment gateway not configured. Please contact support.' });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) {
      console.error('Missing Supabase env vars');
      return res.status(500).json({ error: 'Database not configured. Please contact support.' });
    }

    // Dynamic imports (works better in Vercel serverless)
    const Razorpay = (await import('razorpay')).default;
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    const { userId, purchaseType, itemRefId, planName } = req.body;
    if (!userId || !purchaseType) {
      return res.status(400).json({ error: 'Missing required fields: userId and purchaseType' });
    }

    // Verify user
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();
    if (pErr || !profile) {
      console.error('Profile fetch error:', pErr);
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    // Determine amount
    const MEMBERSHIP_PRICES = { Standard: 500, Renewal: 200 };
    let amount, itemName;

    if (purchaseType === 'membership') {
      amount   = MEMBERSHIP_PRICES[planName] ?? 500;
      itemName = `FIP ${planName || 'Standard'} Membership`;
    } else if (purchaseType === 'course') {
      const { data: course, error: cErr } = await supabaseAdmin
        .from('courses')
        .select('id, title, price, slug')
        .eq('slug', itemRefId)
        .single();
      if (cErr || !course) return res.status(400).json({ error: 'Course not found' });
      if (!course.price || course.price === 0)
        return res.status(400).json({ error: 'This course is free' });
      amount   = course.price;
      itemName = course.title;
    } else {
      return res.status(400).json({ error: 'Invalid purchaseType: must be membership or course' });
    }

    const gst   = Math.round(amount * 0.18);
    const total = amount + gst;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   total * 100, // paise
      currency: 'INR',
      receipt:  `fip_${purchaseType}_${Date.now()}`,
      notes:    { userId, purchaseType, itemRefId: itemRefId || '', itemName },
    });

    // Record in DB
    const { data: paymentRow, error: iErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id:           userId,
        purchase_type:     purchaseType,
        item_name:         itemName,
        item_ref_id:       itemRefId || null,
        amount,
        gst_amount:        gst,
        total_amount:      total,
        razorpay_order_id: order.id,
        status:            'created',
      })
      .select()
      .single();

    if (iErr) {
      console.error('DB insert error:', iErr);
      return res.status(500).json({ error: 'Failed to record order: ' + iErr.message });
    }

    return res.status(200).json({
      orderId:      order.id,
      amount:       total * 100,
      currency:     'INR',
      keyId:        RAZORPAY_KEY_ID,
      paymentRowId: paymentRow.id,
      prefill:      { name: profile.full_name, email: profile.email },
      itemName,
      breakdown:    { amount, gst, total },
    });

  } catch (err) {
    console.error('create-order fatal error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}