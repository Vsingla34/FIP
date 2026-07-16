// /api/validate-coupon.js
// Validates a coupon code and returns discount info without creating an order
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { code, purchase_type, original_amount } = req.body || {};
  if (!code || !original_amount) {
    return res.status(400).json({ error: 'Code and original_amount are required.' });
  }

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return res.status(404).json({ error: 'Coupon code not found or inactive.' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (coupon.valid_from  && today < coupon.valid_from)  return res.status(400).json({ error: 'Coupon is not active yet.' });
  if (coupon.valid_until && today > coupon.valid_until) return res.status(400).json({ error: 'Coupon has expired.' });
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return res.status(400).json({ error: 'Coupon usage limit reached.' });
  }
  if (coupon.applies_to !== 'all' && coupon.applies_to !== purchase_type) {
    const label = coupon.applies_to === 'membership' ? 'membership purchases' : 'course purchases';
    return res.status(400).json({ error: `This coupon is only valid for ${label}.` });
  }
  if (coupon.min_order && Number(original_amount) < coupon.min_order) {
    return res.status(400).json({ error: `Minimum order amount ₹${coupon.min_order} required.` });
  }

  let discount = coupon.discount_type === 'percent'
    ? Math.round(Number(original_amount) * coupon.discount_value / 100)
    : Math.min(coupon.discount_value, Number(original_amount));

  if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);

  const final_amount = Math.max(0, Number(original_amount) - discount);
  const label = coupon.discount_type === 'percent'
    ? `${coupon.discount_value}% off`
    : `₹${coupon.discount_value} off`;

  return res.status(200).json({
    discount_amount: discount,
    final_amount,
    message: `${label} applied${coupon.description ? ' — ' + coupon.description : ''}!`,
  });
}