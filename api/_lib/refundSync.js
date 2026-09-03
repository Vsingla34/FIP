import nodemailer from 'nodemailer';
import { ensureCreditNoteNumber } from './invoicing.js';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

// Same visual template as the tax invoice (Federation of Indian Professionals
// header, same layout) — a credit note is legally the mirror image of an
// invoice, so it should look unmistakably like the same family of document,
// not a completely different design.
function generateCreditNoteHTML({ creditNoteNo, originalInvoiceNo, noteDate, buyerName, buyerEmail, itemName, refundAmount, refundReason, isFullRefund }) {
  const fmt  = n => Number(n).toLocaleString('en-IN');
  const fmtD = new Date(noteDate || Date.now()).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  return `<div style="margin:24px 0;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden"><div style="background:#7C2D12;padding:14px 22px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;color:#FED7AA;letter-spacing:1px;text-transform:uppercase;font-weight:700">Credit Note</div><div style="font-size:17px;font-weight:900;color:#fff">Federation of Indian Professionals</div></div><div style="text-align:right"><div style="font-size:11px;color:rgba(255,255,255,0.5)">Credit Note No.</div><div style="font-size:13px;font-weight:700;color:#FED7AA;font-family:monospace">${creditNoteNo}</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">${fmtD}</div></div></div><div style="padding:18px 22px;background:#fff">${originalInvoiceNo ? `<div style="font-size:12px;color:#6B7280;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F3F4F6">Against Invoice No. <strong style="font-family:monospace;color:#1A3C6E">${originalInvoiceNo}</strong></div>` : ''}<div style="margin-bottom:18px"><div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Issued To</div><div style="font-size:13px;font-weight:700;color:#1A3C6E">${buyerName}</div><div style="font-size:12px;color:#6B7280">${buyerEmail}</div></div><table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr style="background:#F7F9FC"><th style="text-align:left;padding:8px 12px;font-size:11px;color:#6B7280;font-weight:700">Description</th><th style="text-align:right;padding:8px 12px;font-size:11px;color:#6B7280;font-weight:700">Amount Refunded</th></tr><tr style="background:#F7F9FC"><td style="padding:10px 12px;font-size:14px;font-weight:800;color:#1A3C6E">${itemName}${isFullRefund ? ' (Full Refund)' : ' (Partial Refund)'}</td><td style="padding:10px 12px;font-size:16px;font-weight:900;color:#DC2626;text-align:right">−₹${fmt(refundAmount)}</td></tr></table>${refundReason ? `<div style="font-size:12px;color:#6B7280;margin-bottom:14px"><strong>Reason:</strong> ${refundReason}</div>` : ''}<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 16px"><div style="font-size:13px;font-weight:700;color:#B91C1C">This amount has been refunded to your original payment method.</div></div><p style="font-size:11px;color:#9CA3AF;text-align:center;margin:12px 0 0">Computer-generated credit note. No signature required.</p></div></div>`;
}

export async function sendCreditNoteEmail(supabaseAdmin, paymentId) {
  try {
    const { data: pay } = await supabaseAdmin.from('payments')
      .select('id, user_id, item_name, purchase_type, amount_refunded, total_amount, refund_reason, invoice_number, credit_note_number, credit_note_generated_at, metadata')
      .eq('id', paymentId).maybeSingle();
    if (!pay || !pay.credit_note_number) return; // nothing to send if no credit note exists

    // Buyer contact — prefer the profile (real account), fall back to
    // whatever was captured in the payment's own metadata at checkout time
    // (covers guest bookings and free-event fallbacks with no linked account).
    let buyerName = pay.metadata?.rsvp?.full_name || null;
    let buyerEmail = pay.metadata?.rsvp?.email || null;
    if (pay.user_id) {
      const { data: profile } = await supabaseAdmin.from('profiles')
        .select('full_name, email').eq('id', pay.user_id).maybeSingle();
      if (profile) { buyerName = profile.full_name || buyerName; buyerEmail = profile.email || buyerEmail; }
    }
    if (!buyerEmail || !process.env.GMAIL_USER) return; // nothing to send to, or email not configured

    const isFullRefund = Number(pay.amount_refunded) >= Number(pay.total_amount) - 0.01;
    const html = generateCreditNoteHTML({
      creditNoteNo: pay.credit_note_number,
      originalInvoiceNo: pay.invoice_number,
      noteDate: pay.credit_note_generated_at,
      buyerName: buyerName || 'FIP Member',
      buyerEmail,
      itemName: pay.item_name,
      refundAmount: pay.amount_refunded,
      refundReason: pay.refund_reason,
      isFullRefund,
    });

    await getTransporter().sendMail({
      from: `"FIP" <${process.env.GMAIL_USER}>`,
      to: buyerEmail,
      subject: `Credit Note ${pay.credit_note_number} — Refund Processed`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <p>Hi ${buyerName || 'there'},</p>
        <p>Your refund for <strong>${pay.item_name}</strong> has been processed. Please find your credit note below for your records.</p>
        ${html}
      </div>`,
    });
  } catch (e) {
    // Never let an email failure affect the refund itself — the refund and
    // its credit note NUMBER are already correctly recorded regardless.
    console.warn('sendCreditNoteEmail failed:', e.message);
  }
}

export async function revokeAccess(supabaseAdmin, payment, reason) {
  const userId = payment.user_id;
  const patch = { status: 'cancelled', revoked_at: new Date().toISOString(), revoke_reason: reason };

  if (payment.purchase_type === 'course') {
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
    await supabaseAdmin.from('profiles').update({
      membership_status: 'Cancelled',
      account_type:      'member',
      membership_end:    new Date().toISOString().split('T')[0],
    }).eq('id', userId);
  }
}

async function restoreAccess(supabaseAdmin, payment) {
  const restorePatch = { status: payment.purchase_type === 'event' ? 'confirmed' : 'registered',
                          revoked_at: null, revoke_reason: null };
  if (payment.purchase_type === 'course')
    await supabaseAdmin.from('course_registrations').update(restorePatch).eq('payment_id', payment.id);
  if (payment.purchase_type === 'event')
    await supabaseAdmin.from('event_rsvps').update(restorePatch).eq('payment_id', payment.id);
  if (payment.purchase_type === 'membership')
    console.warn('refundSync: refund.failed on a membership payment — verify membership_status by hand:', payment.id);
}

async function logSync(supabaseAdmin, row) {
  try { await supabaseAdmin.from('payment_sync_log').insert(row); }
  catch (e) { console.warn('sync log failed:', e.message); }
}

/**
 * Apply a refund's state to our DB — the ONE place this logic exists.
 *
 * @param supabaseAdmin  service-role client
 * @param pay            our payments row (must include: id,status,user_id,purchase_type,item_ref_id,total_amount,amount_refunded)
 * @param refund         Razorpay refund entity {id, payment_id, amount, status, notes}
 * @param parentPayment  Razorpay PAYMENT entity (has amount_refunded, refund_status) — from the
 *                       webhook payload's payload.payment.entity, or a fresh GET /payments/{id}
 *                       when called synchronously right after creating the refund.
 * @param eventLabel     'refund.created' | 'refund.processed' | 'refund.failed' — used only for
 *                       the idempotency key, so a synchronous admin-triggered apply and the
 *                       eventual real webhook event for the SAME refund dedupe against each other.
 * @param source         'webhook' | 'admin_refund' — recorded in the audit log only.
 */
export async function applyRefundUpdate(supabaseAdmin, { pay, refund, parentPayment, eventLabel, source }) {
  if (eventLabel === 'refund.failed') {
    const rzpRefundStatus = parentPayment?.refund_status ?? null;
    const revertStatus = rzpRefundStatus === 'partial' ? 'partially_refunded' : 'paid';

    await supabaseAdmin.from('payments').update({
      status: revertStatus, razorpay_status: 'failed', refund_status: rzpRefundStatus,
      sync_note: 'Refund failed at Razorpay — access restored', last_synced_at: new Date().toISOString(),
    }).eq('id', pay.id);

    await restoreAccess(supabaseAdmin, pay);

    await logSync(supabaseAdmin, { payment_id: pay.id, razorpay_payment_id: refund.payment_id, source,
                    event: eventLabel, old_status: pay.status, new_status: revertStatus,
                    detail: { refund_id: refund.id, refund_status: rzpRefundStatus } });
    return { status: revertStatus, refundStatus: rzpRefundStatus, accessRevoked: false, skipped: false };
  }

  // Idempotency keyed per EVENT LABEL, not "any refund event" — refund.created
  // and refund.processed for the same refund id must each still be allowed
  // through once. This also protects a synchronous admin-triggered apply from
  // double-applying when the real webhook for the SAME refund arrives later:
  // whichever gets there first "wins" the row, the second is a no-op.
  const { data: seen } = await supabaseAdmin
    .from('payment_sync_log').select('id')
    .eq('razorpay_payment_id', refund.payment_id)
    .eq('event', eventLabel)
    .eq('detail->>refund_id', refund.id)
    .limit(1);

  if (seen?.length) {
    return { status: pay.status, refundStatus: pay.refund_status, accessRevoked: false, skipped: true };
  }

  // Razorpay's own running total for this payment — never add refund.amount
  // ourselves, that breaks the moment the same refund fires twice.
  const cumulativeRefunded = parentPayment?.amount_refunded != null
    ? parentPayment.amount_refunded / 100
    : Math.max(Number(pay.amount_refunded || 0), (refund.amount || 0) / 100); // fallback only

  const rzpRefundStatus = parentPayment?.refund_status
    ?? (cumulativeRefunded >= Number(pay.total_amount || 0) - 0.01 ? 'full'
        : cumulativeRefunded > 0 ? 'partial' : null); // fallback only
  const isFull = rzpRefundStatus === 'full';

  const settled = refund.status === 'processed';
  const newStatus = settled
    ? (isFull ? 'refunded' : 'partially_refunded')
    : (isFull ? 'refund_processing' : 'partial_refund_processing');

  await supabaseAdmin.from('payments').update({
    status:          newStatus,
    razorpay_status: refund.status,
    refund_status:   rzpRefundStatus,
    amount_refunded: cumulativeRefunded,
    refund_id:       refund.id,
    refunded_at:     settled ? new Date().toISOString() : null,
    refund_reason:   refund.notes?.reason || 'Refunded via Razorpay',
    last_synced_at:  new Date().toISOString(),
  }).eq('id', pay.id);

  if (isFull) await revokeAccess(supabaseAdmin, { ...pay, id: pay.id }, `Refund ${refund.id}`);

  // Credit note only once the refund has actually settled — refund.created
  // (still processing) shouldn't produce one yet, only refund.processed.
  // Applies to partial refunds too, not just full ones.
  if (settled) {
    await ensureCreditNoteNumber(supabaseAdmin, pay.id, new Date().toISOString());
    await sendCreditNoteEmail(supabaseAdmin, pay.id);
  }

  await logSync(supabaseAdmin, { payment_id: pay.id, razorpay_payment_id: refund.payment_id, source,
                  event: eventLabel, old_status: pay.status, new_status: newStatus,
                  detail: { refund_id: refund.id, amount: cumulativeRefunded, refund_status: rzpRefundStatus, settled } });

  return { status: newStatus, refundStatus: rzpRefundStatus, accessRevoked: isFull, skipped: false };
}