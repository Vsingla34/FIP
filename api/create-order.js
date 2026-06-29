import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const MEMBERSHIP_PRICES = { Standard: 500, Renewal: 200 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { userId, purchaseType, itemRefId, planName } = req.body;
    if (!userId || !purchaseType) return res.status(400).json({ error: 'Missing fields' });

    // Verify user exists
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles').select('id,full_name,email').eq('id', userId).single();
    if (pErr || !profile) return res.status(401).json({ error: 'Invalid user' });

    let amount, itemName;

    if (purchaseType === 'membership') {
      amount   = MEMBERSHIP_PRICES[planName] ?? 500;
      itemName = `FIP ${planName || 'Standard'} Membership`;

    } else if (purchaseType === 'course') {
      // Look up price from DB — never trust client
      const { data: course, error: cErr } = await supabaseAdmin
        .from('courses').select('id,title,price,slug').eq('slug', itemRefId).single();
      if (cErr || !course) return res.status(400).json({ error: 'Course not found' });
      if (!course.price || course.price === 0)
        return res.status(400).json({ error: 'This course is free — no payment needed' });
      amount   = course.price;
      itemName = course.title;

    } else {
      return res.status(400).json({ error: 'Invalid purchase type' });
    }

    const gst   = Math.round(amount * 0.18);
    const total = amount + gst;

    const order = await razorpay.orders.create({
      amount:   total * 100,
      currency: 'INR',
      receipt:  `fip_${purchaseType}_${Date.now()}`,
      notes:    { userId, purchaseType, itemRefId: itemRefId || '', itemName },
    });

    const { data: paymentRow, error: iErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId, purchase_type: purchaseType,
        item_name: itemName, item_ref_id: itemRefId || null,
        amount, gst_amount: gst, total_amount: total,
        razorpay_order_id: order.id, status: 'created',
      })
      .select().single();

    if (iErr) return res.status(500).json({ error: 'Failed to record order' });

    return res.status(200).json({
      orderId: order.id, amount: total * 100, currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentRowId: paymentRow.id,
      prefill: { name: profile.full_name, email: profile.email },
      itemName,
      breakdown: { amount, gst, total },
    });

  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
}