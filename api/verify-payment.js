// /api/verify-payment.js
// Vercel Serverless Function — verifies Razorpay payment signature
// This is the ONLY place a payment is marked "paid" — never trust the frontend

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    // ── 1. Verify the signature using HMAC SHA256 ──
    // This proves the payment response actually came from Razorpay
    // and wasn't forged by someone calling our API directly with fake data.
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      // Mark as failed in DB for audit trail
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', razorpay_order_id);

      return res.status(400).json({ error: 'Payment verification failed', verified: false });
    }

    // ── 2. Fetch the payment row we created at order time ──
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    if (payment.status === 'paid') {
      // Already processed (idempotency — avoid double-processing on retry)
      return res.status(200).json({ verified: true, alreadyProcessed: true, payment });
    }

    // ── 3. Mark payment as paid ──
    const validFrom  = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'paid',
        valid_from:  payment.purchase_type === 'membership' ? validFrom  : null,
        valid_until: payment.purchase_type === 'membership' ? validUntil : null,
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    // ── 4. Apply the effect — activate membership OR enroll in course ──
    if (payment.purchase_type === 'membership') {
      await supabaseAdmin
        .from('profiles')
        .update({
          account_type:       'member',
          membership_status:  'Active',
          membership_plan:    payment.item_name.replace('FIP ', '').replace(' Membership', ''),
          membership_start:   validFrom,
          membership_end:     validUntil,
        })
        .eq('id', userId);
    } else if (payment.purchase_type === 'course') {
      await supabaseAdmin
        .from('course_enrollments')
        .upsert({
          user_id:         userId,
          course_title:    payment.item_name,
          course_category: payment.item_ref_id,
          price_paid:      payment.total_amount,
          amount_paid:     payment.total_amount,
          payment_id:      payment.id,
          status:          'Enrolled',
        }, { onConflict: 'user_id,course_title' });
    }

    return res.status(200).json({ verified: true, payment: updatedPayment });

  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}