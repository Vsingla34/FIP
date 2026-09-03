// api/_lib/invoicing.js
//
// Underscore-prefixed — not a route, doesn't count against the 12-function cap.
//
// Called from every place a payment transitions to "paid" (webhook,
// verify-payment fallback, the reconciler's auto-heal) and every place a
// refund is processed. Centralized here so the "only generate once, never
// twice" guard exists in exactly one place, rather than being reimplemented
// slightly differently in six call sites — that kind of duplication is
// exactly what produced the two-different-invoice-numbers bug earlier in
// this project.

/**
 * Assigns an invoice number to a payment if it doesn't already have one.
 * Safe to call multiple times for the same payment — idempotent.
 */
export async function ensureInvoiceNumber(supabaseAdmin, paymentId) {
  const { data: payment } = await supabaseAdmin
    .from('payments').select('id, invoice_number, created_at').eq('id', paymentId).maybeSingle();
  if (!payment) return null;
  if (payment.invoice_number) return payment.invoice_number; // already has one — never overwrite

  const { data: invoiceNo, error } = await supabaseAdmin
    .rpc('get_next_invoice_number', { p_doc_type: 'invoice', p_date: payment.created_at });
  if (error) { console.error('ensureInvoiceNumber failed:', error.message); return null; }

  const { error: updErr } = await supabaseAdmin.from('payments')
    .update({ invoice_number: invoiceNo, invoice_generated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .is('invoice_number', null); // extra race-safety: only write if still null
  if (updErr) { console.error('ensureInvoiceNumber update failed:', updErr.message); return null; }

  return invoiceNo;
}

/**
 * Assigns a credit note number to a payment if it's been refunded and
 * doesn't already have one. Uses the ORIGINAL payment date for financial-year
 * placement of the underlying invoice, but the credit note itself is dated
 * to when the refund actually happened (its own, separate financial year
 * classification) — a refund processed in a later financial year than the
 * original sale is completely normal and should be numbered in ITS OWN year.
 */
export async function ensureCreditNoteNumber(supabaseAdmin, paymentId, refundDate) {
  const { data: payment } = await supabaseAdmin
    .from('payments').select('id, credit_note_number, refund_status, amount_refunded').eq('id', paymentId).maybeSingle();
  if (!payment) return null;
  if (payment.credit_note_number) return payment.credit_note_number; // already has one
  if (!payment.amount_refunded || Number(payment.amount_refunded) <= 0) return null; // nothing was actually refunded

  const asOf = refundDate ? new Date(refundDate) : new Date();
  const { data: creditNo, error } = await supabaseAdmin
    .rpc('get_next_invoice_number', { p_doc_type: 'credit_note', p_date: asOf.toISOString() });
  if (error) { console.error('ensureCreditNoteNumber failed:', error.message); return null; }

  const { error: updErr } = await supabaseAdmin.from('payments')
    .update({ credit_note_number: creditNo, credit_note_generated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .is('credit_note_number', null);
  if (updErr) { console.error('ensureCreditNoteNumber update failed:', updErr.message); return null; }

  return creditNo;
}