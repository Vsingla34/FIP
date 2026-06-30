// /api/cancel-order.js — marks an abandoned order as failed
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { razorpayOrderId } = req.body;
    if (!razorpayOrderId) return res.status(400).json({ error: 'Missing razorpayOrderId' });

    // Only mark as failed if it's still 'created' (don't overwrite a paid order)
    const { error } = await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('status', 'created');

    if (error) {
      console.error('cancel-order error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ cancelled: true });
  } catch (err) {
    console.error('cancel-order fatal:', err);
    return res.status(500).json({ error: err.message });
  }
}