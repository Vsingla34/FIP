// /api/create-order.js — Vercel Serverless Function

import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// ── Initialized once, reused across warm invocations ──────────
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const MEMBERSHIP_PRICES = { Standard: 500, Renewal: 200 };
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment gateway not configured. Please contact support.' });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) {
      return res.status(500).json({ error: 'Database not configured. Please contact support.' });
    }

    const { userId, purchaseType, itemRefId, planName, planPrice, rsvpData, gstData } = req.body;
    if (!userId || !purchaseType) {
      return res.status(400).json({ error: 'Missing required fields: userId and purchaseType' });
    }

    // Verify user exists
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();
    if (pErr || !profile) return res.status(401).json({ error: 'User not found.' });

    // Determine amount
    let amount, itemName;
    if (purchaseType === 'membership') {
      // Use admin-set price from site_settings if available, fallback to planPrice or default
      let basePrice = planPrice || MEMBERSHIP_PRICES[planName] || 500;
      try {
        const { data: settings } = await supabaseAdmin
          .from('site_settings').select('value').eq('key','membership').maybeSingle();
        if (settings?.value) {
          const v = settings.value;
          basePrice = planName === 'Renewal'
            ? (v.renewal_price  || basePrice)
            : (v.standard_price || basePrice);
        }
      } catch (e) { /* use fallback */ }
      amount   = Number(basePrice);
      itemName = `FIP ${planName || 'Standard'} Membership`;
    } else if (purchaseType === 'course') {
      const { data: course, error: cErr } = await supabaseAdmin
        .from('courses').select('id, title, price, slug').eq('slug', itemRefId).single();
      if (cErr || !course) return res.status(400).json({ error: 'Course not found' });
      if (!course.price || course.price === 0) return res.status(400).json({ error: 'This course is free' });
      amount   = course.price;
      itemName = course.title;

    } else if (purchaseType === 'event') {
      const { data: event, error: eErr } = await supabaseAdmin
        .from('events').select('id, title, price, is_free').eq('id', itemRefId).single();
      if (eErr || !event) return res.status(400).json({ error: 'Event not found' });
      if (event.is_free || !event.price || event.price === 0) return res.status(400).json({ error: 'This event is free' });
      amount   = event.price;
      itemName = event.title;

    } else {
      return res.status(400).json({ error: 'Invalid purchaseType' });
    }

    const gst   = Math.round(amount * 0.18);
    const total = amount + gst;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   total * 100,
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
        metadata:          (rsvpData || gstData) ? {
          ...(rsvpData ? { rsvp: rsvpData } : {}),
          ...(gstData  ? { gst:  gstData  } : {}),
        } : null,
      })
      .select().single();

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
    console.error('create-order fatal:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}