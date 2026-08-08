// /api/razorpay-webhook.js
// Razorpay calls this server-to-server after every payment.captured
// Handles ALL purchase types — browser state is irrelevant
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fipin.org';

async function sendEmail(endpoint, body) {
  try {
    await fetch(`${APP_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) { console.warn(`Email ${endpoint} failed:`, e.message); }
}

/* ── Audit every state change, whatever triggered it ── */
async function logSync({ payment_id, order_id, payment_rzp_id, source, event, oldStatus, newStatus, detail }) {
  try {
    await supabaseAdmin.from('payment_sync_log').insert({
      payment_id, razorpay_order_id: order_id, razorpay_payment_id: payment_rzp_id,
      source, event, old_status: oldStatus, new_status: newStatus, detail: detail || null,
    });
  } catch (e) { console.warn('sync log failed:', e.message); }
}

/* ── Revoke access when money goes back ──────────────────────────────────────
   Enrollment is a PROJECTION of payment state, so a refund must always undo it.
   Rows are marked cancelled rather than deleted: the audit trail survives and a
   disputed refund can be reversed by simply re-running the reconciler. */
async function revokeAccess(payment, reason) {
  const userId = payment.user_id;

  if (payment.purchase_type === 'course') {
    const patch = { status: 'cancelled', revoked_at: new Date().toISOString(), revoke_reason: reason };
    let done = false;
    if (payment.id) {
      const { data } = await supabaseAdmin.from('course_registrations')
        .update(patch).eq('payment_id', payment.id).select('id');
      done = (data?.length || 0) > 0;
    }
    if (!done && userId) {
      const ref = payment.item_ref_id || '';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
      const { data: course } = isUuid
        ? await supabaseAdmin.from('courses').select('id').eq('id', ref).maybeSingle()
        : await supabaseAdmin.from('courses').select('id').eq('slug', ref).maybeSingle();
      if (course) {
        await supabaseAdmin.from('course_registrations')
          .update(patch).eq('course_id', course.id).eq('user_id', userId);
      }
    }
  }

  if (payment.purchase_type === 'event') {
    const patch = { status: 'cancelled', revoked_at: new Date().toISOString(), revoke_reason: reason };
    let done = false;
    if (payment.id) {
      const { data } = await supabaseAdmin.from('event_rsvps')
        .update(patch).eq('payment_id', payment.id).select('id');
      done = (data?.length || 0) > 0;
    }
    if (!done && userId && payment.item_ref_id) {
      await supabaseAdmin.from('event_rsvps')
        .update(patch).eq('event_id', payment.item_ref_id).eq('user_id', userId);
    }
  }

  if (payment.purchase_type === 'membership' && userId) {
    // Membership is revoked but fip_member_no is deliberately NOT cleared —
    // the number is an identity, not an entitlement, and reissuing it later
    // would break every past invoice and email that referenced it.
    await supabaseAdmin.from('profiles').update({
      membership_status: 'Cancelled',
      account_type:      'member',
      membership_end:    new Date().toISOString().split('T')[0],
    }).eq('id', userId);
  }

  console.log(`Revoked ${payment.purchase_type} access for payment ${payment.id} (${reason})`);
}

// Vercel auto-parses JSON bodies before the handler runs. Razorpay signs the
// EXACT raw bytes it sent — a JSON.stringify() of the already-parsed body is
// not guaranteed to match byte-for-byte (whitespace, key order, number
// formatting), so signature verification against the re-serialized body is
// unreliable and was silently rejecting real webhook calls. Reading the raw
// body ourselves is the only correct way to verify Razorpay's signature.
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── 1. Verify signature against the RAW body ────────────────────
  const secret   = process.env.RAZORPAY_WEBHOOK_SECRET;
  const received = req.headers['x-razorpay-signature'];
  const rawBody  = await getRawBody(req);
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison — avoids leaking timing info about the secret.
  const validSig = received
    && expected.length === received.length
    && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));

  if (!validSig) {
    console.error('Webhook: invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const body = JSON.parse(rawBody);
  const evt  = body.event;

  // Events we act on. Everything else is acknowledged and ignored so Razorpay
  // does not retry it forever.
  const HANDLED = [
    'payment.captured',
    'payment.failed',
    'refund.created',
    'refund.processed',
    'refund.failed',
  ];
  if (!HANDLED.includes(evt)) return res.status(200).json({ received: true, ignored: evt });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUNDS — Razorpay is the source of truth for money, so a refund initiated
  // ANYWHERE (our admin UI, the Razorpay dashboard, or Razorpay support) lands
  // here and revokes access through exactly one code path.
  // ═══════════════════════════════════════════════════════════════════════════
  if (evt.startsWith('refund.')) {
    const refund = body.payload?.refund?.entity;
    if (!refund) return res.status(400).json({ error: 'No refund entity' });

    const { data: pay } = await supabaseAdmin
      .from('payments')
      .select('id,status,user_id,purchase_type,item_ref_id,item_name,total_amount,amount_refunded')
      .eq('razorpay_payment_id', refund.payment_id)
      .maybeSingle();

    if (!pay) {
      console.error('Webhook: refund for unknown payment', refund.payment_id);
      return res.status(200).json({ received: true, skipped: 'payment_not_found' });
    }

    if (evt === 'refund.failed') {
      // A pending refund can still fail bank-side after we already marked it
      // as processing and revoked access. Put both back the way they were.
      const revertStatus = Number(pay.amount_refunded || 0) > 0.01 ? 'partially_refunded' : 'paid';
      await supabaseAdmin.from('payments').update({
        status: revertStatus, razorpay_status: 'refund_failed',
        sync_note: 'Refund failed at Razorpay — access restored', last_synced_at: new Date().toISOString(),
      }).eq('id', pay.id);

      const restorePatch = { status: pay.purchase_type === 'event' ? 'confirmed' : 'registered',
                              revoked_at: null, revoke_reason: null };
      if (pay.purchase_type === 'course')
        await supabaseAdmin.from('course_registrations').update(restorePatch).eq('payment_id', pay.id);
      if (pay.purchase_type === 'event')
        await supabaseAdmin.from('event_rsvps').update(restorePatch).eq('payment_id', pay.id);
      if (pay.purchase_type === 'membership')
        console.warn('Webhook: refund.failed on a membership payment — verify membership_status by hand:', pay.id);

      await logSync({ payment_id: pay.id, payment_rzp_id: refund.payment_id, source: 'webhook',
                      event: evt, oldStatus: pay.status, newStatus: revertStatus,
                      detail: { refund_id: refund.id } });
      return res.status(200).json({ received: true, note: 'refund failed, access restored' });
    }

    // Razorpay includes the PARENT payment alongside the refund in this payload.
    // Its amount_refunded is Razorpay's own running total for this payment — use
    // that instead of adding refund.amount ourselves. Adding manually breaks the
    // moment the same refund fires twice (refund.created, then refund.processed
    // for the identical refund): a naive add would double-count it.
    const parentPayment       = body.payload?.payment?.entity;
    const cumulativeRefunded  = parentPayment?.amount_refunded != null
      ? parentPayment.amount_refunded / 100
      : Math.max(Number(pay.amount_refunded || 0), (refund.amount || 0) / 100); // fallback only
    const isFull  = parentPayment?.refund_status
      ? parentPayment.refund_status === 'full'
      : cumulativeRefunded >= Number(pay.total_amount || 0) - 0.01;

    // refund.status on the REFUND entity itself is what actually distinguishes
    // "money committed, bank transfer in flight" (pending) from "credited"
    // (processed) — this is the piece that was missing before.
    const settled   = refund.status === 'processed';
    const newStatus = settled
      ? (isFull ? 'refunded' : 'partially_refunded')
      : (isFull ? 'refund_processing' : 'partial_refund_processing');

    // Idempotency keyed per EVENT TYPE, not "any refund event" — refund.created
    // and refund.processed for the same refund id must each still be allowed
    // through once, since together they carry the Paid → Processing → Refunded
    // transition. Deduping across both (the earlier version of this code) would
    // let refund.created's log entry silently swallow refund.processed forever.
    const { data: seen } = await supabaseAdmin
      .from('payment_sync_log').select('id')
      .eq('razorpay_payment_id', refund.payment_id)
      .eq('event', evt)
      .eq('detail->>refund_id', refund.id)
      .limit(1);

    if (seen?.length) {
      console.log('Webhook: refund already applied', refund.id);
      return res.status(200).json({ received: true, skipped: 'refund_already_applied' });
    }

    await supabaseAdmin.from('payments').update({
      status:          newStatus,
      razorpay_status: refund.status,
      amount_refunded: cumulativeRefunded,
      refund_id:       refund.id,
      refunded_at:     settled ? new Date().toISOString() : null,  // only set once money actually lands
      refund_reason:   refund.notes?.reason || 'Refunded via Razorpay',
      last_synced_at:  new Date().toISOString(),
    }).eq('id', pay.id);

    // Access is revoked as soon as a FULL refund is confirmed initiated — not
    // only once the bank transfer settles days later. If it later fails, the
    // refund.failed branch above restores it. A partial refund never revokes.
    if (isFull) await revokeAccess({ ...pay, id: pay.id }, `Refund ${refund.id}`);

    await logSync({ payment_id: pay.id, payment_rzp_id: refund.payment_id, source: 'webhook',
                    event: evt, oldStatus: pay.status, newStatus,
                    detail: { refund_id: refund.id, amount: cumulativeRefunded, full: isFull, settled } });

    console.log(`Webhook: ${evt} — ${refund.id} → ${newStatus}`);
    return res.status(200).json({ received: true, status: newStatus, accessRevoked: isFull });
  }

  const rp_payment  = body.payload?.payment?.entity;
  if (!rp_payment)  return res.status(400).json({ error: 'No payment entity' });

  const razorpay_payment_id = rp_payment.id;
  const razorpay_order_id   = rp_payment.order_id;

  // ── Failed payments: record, never grant access ──────────────────────────
  if (evt === 'payment.failed') {
    const { data: pf } = await supabaseAdmin.from('payments')
      .select('id,status').eq('razorpay_order_id', razorpay_order_id).maybeSingle();
    if (pf && pf.status !== 'paid') {
      await supabaseAdmin.from('payments').update({
        status: 'failed', razorpay_status: rp_payment.status,
        razorpay_payment_id, sync_note: rp_payment.error_description || null,
        last_synced_at: new Date().toISOString(),
      }).eq('id', pf.id);
      await logSync({ payment_id: pf.id, order_id: razorpay_order_id,
                      payment_rzp_id: razorpay_payment_id, source: 'webhook', event: evt,
                      oldStatus: pf.status, newStatus: 'failed' });
    }
    return res.status(200).json({ received: true, status: 'failed' });
  }

  // ── 2. Fetch payment record (includes metadata with form data) ───
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id,status,user_id,purchase_type,item_ref_id,item_name,amount,gst_amount,total_amount,metadata')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();

  if (!payment) {
    console.error('Webhook: payment record not found for', razorpay_order_id);
    return res.status(200).json({ received: true }); // let Razorpay retry
  }

  // ── 3. Idempotency — skip if already processed ──────────────────
  if (payment.status === 'paid') {
    console.log('Webhook: already processed', razorpay_order_id);
    return res.status(200).json({ received: true, skipped: 'already_paid' });
  }

  // ── 4. Mark payment as paid ──────────────────────────────────────
  await supabaseAdmin.from('payments').update({
    status:              'paid',
    razorpay_status:     rp_payment.status || 'captured',
    razorpay_payment_id: razorpay_payment_id,
    last_synced_at:      new Date().toISOString(),
  }).eq('razorpay_order_id', razorpay_order_id);

  await logSync({ payment_id: payment.id, order_id: razorpay_order_id,
                  payment_rzp_id: razorpay_payment_id, source: 'webhook',
                  event: 'payment.captured', oldStatus: payment.status, newStatus: 'paid' });

  console.log(`Webhook: marked paid — ${razorpay_payment_id} (${payment.purchase_type})`);

  const userId   = payment.user_id;
  const meta     = payment.metadata || {};

  // ═══════════════════════════════════════════════════════════════
  // MEMBERSHIP
  // ═══════════════════════════════════════════════════════════════
  if (payment.purchase_type === 'membership' && userId) {
    const validFrom  = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
    const plan       = (payment.item_name||'').replace('FIP ','').replace(' Membership','');

    // Update profile
    const { error: memErr } = await supabaseAdmin.from('profiles').update({
      account_type:      'fip_member',
      membership_status: 'Active',
      membership_plan:   plan,
      membership_start:  validFrom,
      membership_end:    validUntil,
    }).eq('id', userId);

    if (memErr) console.error('Webhook: membership update failed:', memErr.message);
    else console.log('Webhook: membership activated for', userId);

    // Assign FIPM number
    let fipMemberNo = null;
    try {
      const { data: p } = await supabaseAdmin.from('profiles')
        .select('full_name,email,fip_member_no').eq('id', userId).single();
      if (!p?.fip_member_no) {
        const { data: num } = await supabaseAdmin.rpc('generate_fip_member_no');
        if (num) {
          fipMemberNo = num;
          await supabaseAdmin.from('profiles').update({ fip_member_no: num }).eq('id', userId);
        }
      } else {
        fipMemberNo = p.fip_member_no;
      }

      // Send membership welcome email
      const { data: profile } = await supabaseAdmin.from('profiles')
        .select('full_name,email,phone').eq('id', userId).single();

      await sendEmail('send-course-confirmation', {
        name:          profile?.full_name,
        email:         profile?.email,
        courseTitle:   payment.item_name,
        baseAmount:    payment.amount,
        transactionId: razorpay_payment_id,
        gstNumber:     meta.gst?.gst_number     || null,
        gstCompanyName:meta.gst?.gst_company_name|| null,
        gstAddress:    meta.gst?.gst_address     || null,
        membershipMode:true,
        fipMemberNo,
        validFrom,
        validUntil,
        plan,
      });
    } catch (e) { console.warn('Webhook: FIPM/email error:', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════
  // COURSE
  // ═══════════════════════════════════════════════════════════════
  if (payment.purchase_type === 'course') {
    const rsvp = meta.rsvp || {};

    try {
      // ── Find course ────────────────────────────────────────────────
      // CRITICAL: item_ref_id is normally a SLUG (Modals.jsx sends
      // `course.slug || course.id`). The previous implementation used
      //   .or(`slug.eq.${ref},id.eq.${ref}`)
      // which asks Postgres to compare the uuid column `id` against a
      // non-uuid string. Postgres aborts the WHOLE query with
      // "invalid input syntax for type uuid" (22P02), so `course` came back
      // null for EVERY slug-based course payment — the webhook then skipped
      // enrollment entirely while the payment had already been flipped to
      // 'paid', which also made verify-payment.js short-circuit. Result:
      // 100% paid-but-not-enrolled. Branch on the format instead.
      const ref = payment.item_ref_id || '';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);

      const courseCols = 'id,title,event_date,event_time,zoom_link,zoom_password,whatsapp_group_link';
      let course = null;

      if (ref) {
        const { data, error } = isUuid
          ? await supabaseAdmin.from('courses').select(courseCols).eq('id', ref).maybeSingle()
          : await supabaseAdmin.from('courses').select(courseCols).eq('slug', ref).maybeSingle();
        if (error) console.error('Webhook: course lookup error:', error.message);
        course = data || null;
      }

      // Fallback: match on the item_name we stored at order time.
      if (!course && payment.item_name) {
        const { data } = await supabaseAdmin.from('courses')
          .select(courseCols).ilike('title', `${payment.item_name.trim()}%`).maybeSingle();
        course = data || null;
      }

      if (!course) { console.error('Webhook: course not found:', payment.item_ref_id, '/', payment.item_name); }
      else {
        // course_registrations.full_name and .email are NOT NULL. If metadata.rsvp
        // is empty (older orders, or a client that didn't send rsvpData) the insert
        // would fail with a null-violation, so always fall back to the payer profile.
        let payer = null;
        if (userId) {
          const { data } = await supabaseAdmin.from('profiles')
            .select('full_name,email,phone,profession').eq('id', userId).maybeSingle();
          payer = data || null;
        }
        const regName  = rsvp.full_name || payer?.full_name || null;
        const regEmail = rsvp.email     || payer?.email     || null;

        if (!regEmail) {
          console.error('Webhook: cannot enroll — no email for order', razorpay_order_id);
        } else {
        // Check if already enrolled — match on user_id OR email so a row created
        // by either path (webhook, verify-payment, manual backfill) is detected.
        let existing = null;
        {
          const { data: byEmail } = await supabaseAdmin.from('course_registrations')
            .select('id').eq('course_id', course.id).ilike('email', regEmail).limit(1);
          existing = byEmail?.[0] || null;
          if (!existing && userId) {
            const { data: byUser } = await supabaseAdmin.from('course_registrations')
              .select('id').eq('course_id', course.id).eq('user_id', userId).limit(1);
            existing = byUser?.[0] || null;
          }
        }

        if (!existing) {
          const { error: crErr } = await supabaseAdmin.from('course_registrations').insert({
            user_id:    userId   || null,
            course_id:  course.id,
            course_title: course.title,
            full_name:  regName || regEmail,
            email:      regEmail,
            phone:      rsvp.phone      || payer?.phone      || null,
            profession: rsvp.profession || payer?.profession || null,
            zoom_link:  course.zoom_link || null,
            gst_number:       meta.gst?.gst_number      || null,
            gst_company_name: meta.gst?.gst_company_name || null,
            gst_address:      meta.gst?.gst_address      || null,
            status:     'registered',
            payment_id: payment.id,   // lets a later refund revoke exactly this row
          });
          if (crErr) console.error('Webhook: course enrollment failed:', crErr.message);
          else console.log('Webhook: enrolled in course', course.id, rsvp.email || userId);
        } else {
          console.log('Webhook: already enrolled in course', course.id);
        }

        // Send course confirmation email
        await sendEmail('send-course-confirmation', {
          name:              regName  || null,
          email:             regEmail || null,
          courseTitle:       course.title,
          eventDate:         course.event_date,
          eventTime:         course.event_time,
          zoomLink:          course.zoom_link,
          zoomPassword:      course.zoom_password,
          whatsappGroupLink: course.whatsapp_group_link,
          baseAmount:        payment.amount,
          transactionId:     razorpay_payment_id,
          gstNumber:         meta.gst?.gst_number      || null,
          gstCompanyName:    meta.gst?.gst_company_name || null,
          gstAddress:        meta.gst?.gst_address      || null,
        });
        } // end: regEmail present
      }
    } catch (e) { console.error('Webhook: course error:', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT
  // ═══════════════════════════════════════════════════════════════
  if (payment.purchase_type === 'event') {
    const rsvp = meta.rsvp;
    if (!rsvp?.email) {
      console.warn('Webhook: event payment missing rsvpData in metadata:', razorpay_order_id);
    } else {
      try {
        // Check if already enrolled
        const { data: existing } = await supabaseAdmin.from('event_rsvps')
          .select('id').eq('event_id', rsvp.event_id).eq('email', rsvp.email).maybeSingle();

        if (!existing) {
          const { error: rsvpErr } = await supabaseAdmin.from('event_rsvps').insert({
            event_id:           rsvp.event_id,
            event_name:         rsvp.event_name,
            user_id:            rsvp.user_id  || null,
            full_name:          rsvp.full_name,
            email:              rsvp.email,
            phone:              rsvp.phone    || null,
            profession:         rsvp.profession || null,
            designation:        rsvp.designation || null,
            organisation:       rsvp.organisation || null,
            icai_membership_no: rsvp.icai_membership_no || null,
            city:               rsvp.city     || null,
            is_volunteer:       rsvp.is_volunteer || false,
            gst_number:         rsvp.gst_number      || null,
            gst_company_name:   rsvp.gst_company_name || null,
            gst_address:        rsvp.gst_address      || null,
            status:             'confirmed',
            payment_id:         payment.id,
          });
          if (rsvpErr) console.error('Webhook: event enroll failed:', rsvpErr.message);
          else console.log('Webhook: enrolled in event', rsvp.event_id, rsvp.email);
        } else {
          console.log('Webhook: already enrolled in event for', rsvp.email);
        }

        // Send event confirmation email
        const { data: ev } = await supabaseAdmin.from('events')
          .select('title,event_date,event_time,location,event_type,zoom_link,whatsapp_group_link')
          .eq('id', rsvp.event_id).single();

        await sendEmail('send-event-confirmation', {
          name:              rsvp.full_name,
          email:             rsvp.email,
          eventTitle:        ev?.title,
          eventDate:         ev?.event_date,
          eventTime:         ev?.event_time,
          eventLocation:     ev?.location,
          eventType:         ev?.event_type,
          isPaid:            true,
          amount:            payment.total_amount,
          transactionId:     razorpay_payment_id,
          zoomLink:          ev?.zoom_link,
          whatsappGroupLink: ev?.whatsapp_group_link,
          gstNumber:         rsvp.gst_number      || null,
          gstCompanyName:    rsvp.gst_company_name || null,
          gstAddress:        rsvp.gst_address      || null,
        });
      } catch (e) { console.error('Webhook: event error:', e.message); }
    }
  }

  return res.status(200).json({ received: true, processed: true });
}