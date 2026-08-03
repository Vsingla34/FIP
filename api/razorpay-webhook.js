// /api/razorpay-webhook.js
// Razorpay calls this directly — independent of user's browser
// Setup: Razorpay Dashboard → Settings → Webhooks → Add URL: https://www.fipin.org/api/razorpay-webhook
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 1. Verify webhook signature (security — prevents fake webhooks)
  const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSig      = req.headers['x-razorpay-signature'];
  const body             = JSON.stringify(req.body);
  const expectedSig      = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (receivedSig !== expectedSig) {
    console.error('Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Razorpay webhook event:', event.event);

  // 2. Only process successful payments
  if (event.event !== 'payment.captured') {
    return res.status(200).json({ received: true });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) return res.status(400).json({ error: 'No payment entity' });

  const razorpay_payment_id = payment.id;
  const razorpay_order_id   = payment.order_id;

  // 3. Check if already processed (idempotency)
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status, user_id, purchase_type, item_ref_id, item_name, total_amount')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();

  if (!existing) {
    console.error('Payment record not found for order:', razorpay_order_id);
    return res.status(200).json({ received: true }); // Don't return error — Razorpay will retry
  }

  if (existing.status === 'paid') {
    console.log('Already processed:', razorpay_order_id);
    return res.status(200).json({ received: true, already_processed: true });
  }

  // 4. Mark payment as paid
  await supabaseAdmin.from('payments').update({
    status:               'paid',
    razorpay_payment_id:  razorpay_payment_id,
  }).eq('razorpay_order_id', razorpay_order_id);

  console.log('Payment marked paid via webhook:', razorpay_payment_id);

  const userId = existing.user_id;

  // 5. Apply effect based on purchase type
  if (existing.purchase_type === 'membership' && userId) {
    const validFrom  = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];

    // Core membership update
    await supabaseAdmin.from('profiles').update({
      account_type:      'fip_member',
      membership_status: 'Active',
      membership_plan:   (existing.item_name||'').replace('FIP ','').replace(' Membership',''),
      membership_start:  validFrom,
      membership_end:    validUntil,
    }).eq('id', userId);

    // Assign FIPM number
    try {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles').select('fip_member_no').eq('id', userId).single();
      if (!currentProfile?.fip_member_no) {
        const { data: fipNo } = await supabaseAdmin.rpc('generate_fip_member_no');
        if (fipNo) await supabaseAdmin.from('profiles').update({ fip_member_no: fipNo }).eq('id', userId);
      }
    } catch (e) { console.warn('FIPM assignment error:', e.message); }
  }

  if (existing.purchase_type === 'course' && userId) {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, title, event_date, event_time, zoom_link, zoom_password, whatsapp_group_link')
      .eq('slug', existing.item_ref_id)
      .maybeSingle();

    if (course) {
      // Enroll in course
      await supabaseAdmin.from('course_registrations').upsert({
        user_id:   userId,
        course_id: course.id,
        status:    'registered',
      }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
    }
  }

  if (existing.purchase_type === 'event' && userId) {
    // Event registration is handled by frontend onSuccess
    // Webhook just ensures payment is marked paid
    console.log('Event payment confirmed via webhook:', razorpay_order_id);
  }

  return res.status(200).json({ received: true, processed: true });
}