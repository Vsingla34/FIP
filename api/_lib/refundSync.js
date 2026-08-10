
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

  await logSync(supabaseAdmin, { payment_id: pay.id, razorpay_payment_id: refund.payment_id, source,
                  event: eventLabel, old_status: pay.status, new_status: newStatus,
                  detail: { refund_id: refund.id, amount: cumulativeRefunded, refund_status: rzpRefundStatus, settled } });

  return { status: newStatus, refundStatus: rzpRefundStatus, accessRevoked: isFull, skipped: false };
}