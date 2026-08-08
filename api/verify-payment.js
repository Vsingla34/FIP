// /api/verify-payment.js
// Vercel Serverless Function — verifies Razorpay payment + sends confirmation email

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ── Email transporter ── */
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/* ── Email templates ── */
function membershipEmailHTML({ name, plan, amount, gst, total, validFrom, validUntil, paymentId, orderId, memberId, profession, city }) {
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
    <div style="position:absolute;bottom:-20px;left:20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
    <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:3px;margin-bottom:2px;position:relative;">FIP</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;position:relative;">Federation of Indian Professionals</div>
    <div style="margin-top:24px;font-size:52px;position:relative;">🎉</div>
    <h1 style="font-size:28px;font-weight:900;color:#fff;margin:10px 0 6px;position:relative;">Welcome to FIP, ${firstName}!</h1>
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0;position:relative;">Your membership is officially active. We're thrilled to have you!</p>
  </div>

  <!-- Member ID golden strip -->
  <div style="background:linear-gradient(90deg,#B8860B,#DAA520,#B8860B);padding:18px 32px;text-align:center;">
    <div style="font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;">Your FIP Member ID</div>
    <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:4px;font-family:monospace;">${memberId}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;">Use this ID in all FIP communications</div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:36px 40px;">

    <!-- Warm personal message -->
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 10px;">Dear ${name},</p>
    <p style="font-size:14px;color:#4B5563;line-height:1.9;margin:0 0 16px;">
      On behalf of the entire FIP family, we extend a heartfelt welcome to you! 
      You've just joined <strong>India's most vibrant professional community</strong> — 
      3,000+ Chartered Accountants, Company Secretaries, Cost Accountants and Advocates 
      who share your commitment to excellence and growth.
    </p>
    <p style="font-size:14px;color:#4B5563;line-height:1.9;margin:0 0 24px;">
      Your journey with FIP begins today. We look forward to seeing you at our events, 
      engaging with you on committees, and celebrating your professional milestones together.
    </p>

    <!-- Membership card -->
    <div style="background:linear-gradient(135deg,#1A3C6E,#1B4A9E);border-radius:14px;padding:22px 24px;color:#fff;margin:0 0 24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Membership Type</div>
          <div style="font-size:20px;font-weight:900;color:#FFD09B;">${plan} Member</div>
        </div>
        <div style="font-size:22px;font-weight:900;color:rgba(255,255,255,0.12);letter-spacing:2px;">FIP</div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:12px;display:flex;justify-content:space-between;">
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-bottom:3px;">Member ID</div>
          <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:1.5px;font-family:monospace;">${memberId}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-bottom:3px;">Valid Until</div>
          <div style="font-size:13px;font-weight:700;color:#FFD09B;">${formatDate(validUntil)}</div>
        </div>
      </div>
    </div>

    <!-- What you've unlocked -->
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px 22px;margin:0 0 24px;">
      <div style="font-size:13px;font-weight:800;color:#15803D;margin-bottom:14px;">
        🔓 Your Member Benefits Are Now Active
      </div>
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#166534;width:50%;">✅ Member Directory Access</td>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Priority Event Registration</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Exclusive Job Board</td>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Committee Membership</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Webinars & CPE Courses</td>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Networking Events</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Digital Certificate</td>
          <td style="padding:5px 0;font-size:13px;color:#166534;">✅ Monthly Newsletter</td>
        </tr>
      </table>
    </div>

    <!-- Payment receipt -->
    <div style="background:#F9FAFB;border-radius:10px;padding:18px 20px;border:1px solid #E5E7EB;margin:0 0 28px;">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">🧾 Payment Receipt</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6B7280;padding:7px 0;border-bottom:1px solid #E5E7EB;">
        <span>${plan} Membership</span><span>₹${amount}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6B7280;padding:7px 0;border-bottom:1px solid #E5E7EB;">
        <span>GST @ 18%</span><span>₹${gst}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#1A3C6E;padding:10px 0 4px;">
        <span>Total Paid</span><span>₹${total}</span>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;line-height:1.9;">
        <div><strong>Payment ID:</strong> ${paymentId}</div>
        <div><strong>Order ID:</strong> ${orderId}</div>
        <div><strong>Member ID:</strong> ${memberId}</div>
        <div><strong>Valid From:</strong> ${formatDate(validFrom)} &nbsp;→&nbsp; <strong>Until:</strong> ${formatDate(validUntil)}</div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 8px;">
      <a href="https://www.fipin.org/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#F26122,#E05010);color:#fff;text-decoration:none;padding:16px 44px;border-radius:12px;font-weight:900;font-size:16px;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(242,97,34,0.35);">
        Explore Your Dashboard →
      </a>
    </div>
    <p style="text-align:center;font-size:13px;color:#9CA3AF;margin:14px 0 0;">
      Questions? Write to us at 
      <a href="mailto:fippresidentoffice@gmail.com" style="color:#1A3C6E;font-weight:600;">fippresidentoffice@gmail.com</a> 
      or WhatsApp <strong>+91 99998 30938</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#1A3C6E;border-radius:0 0 16px 16px;padding:26px 40px;text-align:center;">
    <div style="font-size:15px;font-weight:800;color:#FFD09B;margin-bottom:6px;">Connect · Collaborate · Conquer</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);">© 2026 Federation of Indian Professionals · www.fipin.org</div>
    <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;">
      <a href="https://www.fipin.org" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Website</a>
      <a href="https://www.fipin.org/events" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Events</a>
      <a href="https://www.fipin.org/dashboard" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Dashboard</a>
      <a href="https://www.fipin.org/courses" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Courses</a>
    </div>
  </div>

</div>
</body>
</html>`;
}


function courseEmailHTML({ name, courseTitle, amount, gst, total, paymentId, orderId, memberId, profession }) {
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
    <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:3px;margin-bottom:2px;">FIP</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;">Federation of Indian Professionals</div>
    <div style="margin-top:20px;font-size:36px;">📚</div>
    <h1 style="font-size:26px;font-weight:800;color:#fff;margin:8px 0 4px;">You're Enrolled, ${firstName}!</h1>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0;">Your learning journey starts now.</p>
  </div>

  <!-- Member ID strip -->
  <div style="background:#F26122;padding:14px 32px;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">Your Member ID</div>
    <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:3px;font-family:monospace;">${memberId}</div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:36px 40px;">
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 8px;">Dear ${name},</p>
    <p style="font-size:14px;color:#4B5563;line-height:1.8;margin:0 0 20px;">
      Thank you for investing in your professional growth! You now have 
      <strong>lifetime access</strong> to the course below. Learn at your own pace, 
      revisit content anytime, and earn your certificate upon completion.
    </p>

    <!-- Course card -->
    <div style="background:linear-gradient(135deg,#FFF7ED,#FFF0E0);border:2px solid #FED7AA;border-radius:14px;padding:22px 24px;margin:0 0 24px;">
      <div style="font-size:10px;color:#9A3412;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px;">📖 Course Enrolled</div>
      <div style="font-size:18px;font-weight:800;color:#1A3C6E;margin-bottom:6px;">${courseTitle}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <span style="font-size:12px;color:#6B7280;background:#fff;padding:3px 10px;border-radius:20px;border:1px solid #E5E7EB;">⏱ Lifetime Access</span>
        <span style="font-size:12px;color:#6B7280;background:#fff;padding:3px 10px;border-radius:20px;border:1px solid #E5E7EB;">📱 Watch Anytime</span>
        <span style="font-size:12px;color:#6B7280;background:#fff;padding:3px 10px;border-radius:20px;border:1px solid #E5E7EB;">🏆 Certificate Included</span>
      </div>
    </div>

    <!-- Payment receipt -->
    <div style="background:#F9FAFB;border-radius:10px;padding:18px 20px;border:1px solid #E5E7EB;margin:0 0 24px;">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">🧾 Payment Receipt</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6B7280;padding:7px 0;border-bottom:1px solid #E5E7EB;">
        <span>${courseTitle}</span><span>₹${amount}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6B7280;padding:7px 0;border-bottom:1px solid #E5E7EB;">
        <span>GST @ 18%</span><span>₹${gst}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#1A3C6E;padding:10px 0 4px;">
        <span>Total Paid</span><span>₹${total}</span>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;line-height:1.8;">
        <div><strong>Payment ID:</strong> ${paymentId}</div>
        <div><strong>Order ID:</strong> ${orderId}</div>
        <div><strong>Member ID:</strong> ${memberId}</div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="https://www.fipin.org/courses"
        style="display:inline-block;background:linear-gradient(135deg,#F26122,#E05010);color:#fff;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:800;font-size:15px;box-shadow:0 4px 16px rgba(242,97,34,0.35);">
        Start Learning Now →
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9CA3AF;margin:12px 0 0;">
      Questions? Reach us at <a href="mailto:fippresidentoffice@gmail.com" style="color:#1A3C6E;font-weight:600;">fippresidentoffice@gmail.com</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#1A3C6E;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
    <div style="font-size:14px;font-weight:700;color:#FFD09B;margin-bottom:6px;">Connect · Collaborate · Conquer</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.45);">© 2026 Federation of Indian Professionals · www.fipin.org</div>
    <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;">
      <a href="https://www.fipin.org" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Website</a>
      <a href="https://www.fipin.org/courses" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Courses</a>
      <a href="https://www.fipin.org/dashboard" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:none;">Dashboard</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

/* ── Send payment confirmation email ── */
async function sendPaymentEmail({ profile, payment, validFrom, validUntil, memberId }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Email env vars missing — skipping email');
    return;
  }

  const transporter = getTransporter();
  const name = profile.full_name || 'Member';
  const email = profile.email;
  const amount = payment.amount;
  const gst = payment.gst_amount || 0;
  const total = payment.total_amount;
  const paymentId = payment.razorpay_payment_id;
  const orderId = payment.razorpay_order_id;

  let subject, html;

  if (payment.purchase_type === 'membership') {
    const plan = payment.item_name?.replace('FIP ', '').replace(' Membership', '') || 'Standard';
    subject = `✅ FIP ${plan} Membership Activated — Payment Confirmed`;
    html = membershipEmailHTML({ name, plan, amount, gst, total, validFrom, validUntil, paymentId, orderId, memberId, profession: profile?.profession, city: profile?.city });
  } else if (payment.purchase_type === 'course') {
    subject = `✅ Enrolled: ${payment.item_name} — Payment Confirmed`;
    html = courseEmailHTML({ name, courseTitle: payment.item_name, amount, gst, total, paymentId, orderId, memberId, profession: profile?.profession });
  } else {
    return;
  }

  try {
    await transporter.sendMail({
      from:    `"FIP — Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject,
      html,
    });
    console.log(`Payment email sent to ${email}`);
  } catch (err) {
    // Don't fail the payment verification if email fails
    console.error('Payment email failed:', err.message);
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   ADMIN ACTIONS — merged into this function because Vercel Hobby caps the
   project at 12 serverless functions and we are at the cap. Routed by
   ?action= on the query string. Both require an admin Supabase JWT.
   ══════════════════════════════════════════════════════════════════════════ */

const RZP_AUTH = 'Basic ' + Buffer
  .from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)
  .toString('base64');

async function rzp(path, init = {}) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: RZP_AUTH, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error?.description || `Razorpay ${r.status}`);
  return body;
}

/* Verify the caller is a real admin. Never trust an isAdmin flag from the
   client — resolve the JWT to a user, then read that user's own profile. */
async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, error: 'Missing authorization token' };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { ok: false, error: 'Invalid session' };
  const { data: prof } = await supabaseAdmin
    .from('profiles').select('id,role,is_admin').eq('id', user.id).maybeSingle();
  if (!prof || (prof.role !== 'admin' && prof.is_admin !== true)) {
    return { ok: false, error: 'Admin access required' };
  }
  return { ok: true, adminId: user.id };
}

async function logSync(row) {
  try { await supabaseAdmin.from('payment_sync_log').insert(row); }
  catch (e) { console.warn('sync log failed:', e.message); }
}

/* ── action=refund ─────────────────────────────────────────────────────────
   Initiates the refund at Razorpay and stops. It deliberately does NOT revoke
   access here: Razorpay will fire refund.processed, and the webhook revokes.
   One path for dashboard refunds and site refunds alike means they can never
   diverge. */
async function handleRefund(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(403).json({ error: auth.error });

  const { paymentId, amount, reason, speed } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: 'paymentId (our payments.id) required' });

  const { data: pay } = await supabaseAdmin
    .from('payments')
    .select('id,razorpay_payment_id,total_amount,amount_refunded,status,item_name,purchase_type')
    .eq('id', paymentId).maybeSingle();

  if (!pay)                          return res.status(404).json({ error: 'Payment not found' });
  if (!pay.razorpay_payment_id)      return res.status(400).json({ error: 'No Razorpay payment id — nothing was captured' });
  if (pay.status === 'refunded')     return res.status(400).json({ error: 'Already fully refunded' });

  const alreadyRefunded = Number(pay.amount_refunded || 0);
  const refundable      = Number(pay.total_amount || 0) - alreadyRefunded;
  const amountRupees    = amount != null ? Number(amount) : refundable;

  if (!(amountRupees > 0))            return res.status(400).json({ error: 'Refund amount must be positive' });
  if (amountRupees > refundable + 0.01)
    return res.status(400).json({ error: `Only ₹${refundable.toFixed(2)} remains refundable` });

  try {
    const refund = await rzp(`/payments/${pay.razorpay_payment_id}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100),          // Razorpay works in paise
        speed:  speed === 'optimum' ? 'optimum' : 'normal',
        notes:  { reason: reason || 'Refund issued by FIP admin', item: pay.item_name || '' },
      }),
    });

    await supabaseAdmin.from('payments').update({
      refund_reason: reason || 'Refund issued by FIP admin',
      refunded_by:   auth.adminId,
    }).eq('id', pay.id);

    await logSync({
      payment_id: pay.id, razorpay_payment_id: pay.razorpay_payment_id,
      source: 'admin_refund', event: 'refund.initiated',
      old_status: pay.status, new_status: pay.status,
      detail: { refund_id: refund.id, amount: amountRupees, by: auth.adminId },
    });

    return res.status(200).json({
      success: true,
      refundId: refund.id,
      amount: amountRupees,
      note: 'Refund initiated. Access is revoked automatically when Razorpay confirms it.',
    });
  } catch (e) {
    console.error('Refund failed:', e.message);
    return res.status(500).json({ error: 'Refund failed: ' + e.message });
  }
}

/* ── action=reconcile ──────────────────────────────────────────────────────
   Pulls the truth from Razorpay for recent orders and repairs any drift. This
   is the backstop that would have caught the Aug-6 enrollment outage on day
   one: the webhook can silently fail, but this notices the DB disagrees with
   Razorpay and says so. Pass dryRun to inspect before changing anything. */
async function handleReconcile(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(403).json({ error: auth.error });

  const days   = Math.min(Number(req.body?.days || 7), 90);
  const dryRun = req.body?.dryRun !== false;   // safe by default
  const since  = new Date(Date.now() - days * 864e5).toISOString();

  const { data: rows } = await supabaseAdmin
    .from('payments')
    .select('id,razorpay_order_id,razorpay_payment_id,status,total_amount,amount_refunded,purchase_type,item_name,user_id,created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  const changes = [];
  let checked = 0, errors = 0;

  for (const row of rows || []) {
    if (!row.razorpay_order_id) continue;
    checked++;
    try {
      const { items = [] } = await rzp(`/orders/${row.razorpay_order_id}/payments`);
      const captured = items.find(i => i.status === 'captured' || i.status === 'refunded');

      // Razorpay has no captured payment, but we think it is paid.
      if (!captured) {
        if (row.status === 'paid') {
          changes.push({ payment_id: row.id, order: row.razorpay_order_id,
                         from: row.status, to: 'failed',
                         issue: 'DB says paid, Razorpay has no captured payment' });
          if (!dryRun) {
            await supabaseAdmin.from('payments')
              .update({ status: 'failed', last_synced_at: new Date().toISOString(),
                        sync_note: 'Reconciler: no captured payment at Razorpay' })
              .eq('id', row.id);
          }
        }
        continue;
      }

      const refundedRupees = (captured.amount_refunded || 0) / 100;
      const totalRupees    = (captured.amount || 0) / 100;
      const fullyRefunded  = refundedRupees >= totalRupees - 0.01 && refundedRupees > 0;
      const truth = fullyRefunded ? 'refunded' : refundedRupees > 0 ? 'partially_refunded' : 'paid';

      const statusDrift = row.status !== truth;
      const amountDrift = Math.abs(Number(row.amount_refunded || 0) - refundedRupees) > 0.01;

      if (statusDrift || amountDrift) {
        changes.push({ payment_id: row.id, order: row.razorpay_order_id,
                       from: row.status, to: truth,
                       issue: statusDrift ? 'status differs from Razorpay' : 'refund amount differs' });
        if (!dryRun) {
          await supabaseAdmin.from('payments').update({
            status: truth,
            razorpay_status: captured.status,
            razorpay_payment_id: captured.id,
            amount_refunded: refundedRupees,
            last_synced_at: new Date().toISOString(),
            sync_note: 'Corrected by reconciler',
          }).eq('id', row.id);

          await logSync({ payment_id: row.id, razorpay_order_id: row.razorpay_order_id,
                          razorpay_payment_id: captured.id, source: 'reconcile',
                          event: 'status.corrected', old_status: row.status, new_status: truth,
                          detail: { refunded: refundedRupees, by: auth.adminId } });
        }
      }
    } catch (e) { errors++; console.error('Reconcile', row.razorpay_order_id, e.message); }
  }

  // Second pass: money and access disagree. Reads the SQL view.
  let drift = [];
  try {
    const { data } = await supabaseAdmin.from('payment_enrollment_drift').select('*').limit(200);
    drift = data || [];
  } catch (e) { console.warn('drift view unavailable — run razorpay_sync_schema.sql'); }

  return res.status(200).json({
    dryRun, days, checked, errors,
    statusChanges: changes.length,
    changes,
    enrollmentDrift: drift.length,
    drift,
    note: dryRun
      ? 'Nothing was written. Re-send with dryRun:false to apply.'
      : 'Payment statuses corrected. Enrollment drift is listed for review.',
  });
}

/* ── Main handler ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin sub-routes (see note above on the 12-function cap)
  const action = req.query?.action;
  if (action === 'refund')    return handleRefund(req, res);
  if (action === 'reconcile') return handleReconcile(req, res);

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    // 1. Verify HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', razorpay_order_id);
      return res.status(400).json({ error: 'Payment verification failed', verified: false });
    }

    // 2. Fetch payment row
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments').select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !payment) return res.status(404).json({ error: 'Payment record not found' });

    // The Razorpay webhook usually wins the race and flips status to 'paid'
    // server-side. This function used to return here, which meant the enrollment
    // block below was skipped whenever the webhook fired first — if the webhook's
    // own enrollment then failed for any reason, the user was left paid and NOT
    // enrolled with nothing to catch it. Never return early: fall through and
    // re-run the effects, which are all idempotent (guarded by existence checks).
    const alreadyProcessed = payment.status === 'paid';

    // 3. Mark payment as paid
    const validFrom  = new Date().toISOString().split('T')[0];
    // Membership expires on March 31 (end of Indian financial year)
    function getMembershipExpiry() {
      const now   = new Date();
      const year  = now.getFullYear();
      const march31 = new Date(year, 2, 31); // month 2 = March
      return (now > march31)
        ? new Date(year + 1, 2, 31).toISOString().split('T')[0]
        : march31.toISOString().split('T')[0];
    }
    const validUntil = getMembershipExpiry();

    let updatedPayment = payment;
    if (!alreadyProcessed) {
      const { data: up, error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id,
          razorpay_signature,
          status:      'paid',
          valid_from:  payment.purchase_type === 'membership' ? validFrom  : null,
          valid_until: payment.purchase_type === 'membership' ? validUntil : null,
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) return res.status(500).json({ error: 'Failed to update payment status' });
      updatedPayment = up;
    }

    // 4. Apply effect (activate membership OR enroll in course)
    if (payment.purchase_type === 'membership') {
      // ── Step 1: Always update core membership fields (critical) ──────────
      const { error: profileUpdateError } = await supabaseAdmin.from('profiles').update({
        account_type:      'fip_member',
        membership_status: 'Active',
        membership_plan:   payment.item_name.replace('FIP ', '').replace(' Membership', ''),
        membership_start:  validFrom,
        membership_end:    validUntil,
      }).eq('id', userId);

      if (profileUpdateError) {
        console.error('CRITICAL: Profile membership update failed:', profileUpdateError.message, 'userId:', userId);
      } else {
        console.log('Profile updated to FIP Member:', userId);
      }

      // ── Step 2: Generate + save FIP Member Number (always assign one) ──────
      try {
        // NOTE: this used to read `profile`, which is declared with `const` further
        // down in this same function — a temporal-dead-zone ReferenceError that the
        // surrounding catch swallowed, so no FIP member number was ever assigned
        // here. Fetch the current row explicitly instead.
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles').select('fip_member_no').eq('id', userId).maybeSingle();

        if (!currentProfile?.fip_member_no) {
          let fipMemberNo = null;

          // Try DB sequence first (preferred — gives sequential nice numbers)
          try {
            const { data: seqData, error: seqErr } = await supabaseAdmin
              .rpc('generate_fip_member_no');
            if (!seqErr && seqData) fipMemberNo = seqData;
          } catch (_) { /* sequence not available */ }

          // Fallback: generate from timestamp if RPC failed
          if (!fipMemberNo) {
            const ts = Date.now().toString().slice(-6); // last 6 digits of timestamp
            fipMemberNo = `FIPM${ts}`;
            // Ensure uniqueness — retry if collision
            const { data: existing } = await supabaseAdmin
              .from('profiles').select('id').eq('fip_member_no', fipMemberNo).maybeSingle();
            if (existing) fipMemberNo = `FIPM${Date.now().toString().slice(-6)}`;
          }

          if (fipMemberNo) {
            const { error: noErr } = await supabaseAdmin
              .from('profiles').update({ fip_member_no: fipMemberNo }).eq('id', userId);
            if (noErr) console.error('FIP Member No save failed:', noErr.message);
            else console.log('FIP Member No assigned:', fipMemberNo, 'to', userId);
          }
        }
      } catch (e) { console.error('FIP Member No assignment error:', e.message); }

      // Complete referral if user was referred
      try {
        await supabaseAdmin.rpc('complete_referral', { p_referred_id: userId });
      } catch (e) { console.warn('Referral complete failed:', e.message); }

      // Increment coupon usage if a coupon was applied
      if (payment.coupon_id) {
        try {
          await supabaseAdmin.rpc('increment_coupon_usage', { p_coupon_id: payment.coupon_id });
        } catch (e) { console.warn('Coupon increment failed:', e.message); }
      }

    } else if (payment.purchase_type === 'course') {
      // Look up course. item_ref_id is normally a slug but Modals.jsx falls back
      // to the uuid (`course.slug || course.id`), so handle both, then fall back
      // to the item_name captured at order time.
      const ref    = payment.item_ref_id || '';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
      const cols   = 'id, title, event_date, event_time, zoom_link, zoom_password, whatsapp_group_link';

      let course = null;
      if (ref) {
        const { data } = isUuid
          ? await supabaseAdmin.from('courses').select(cols).eq('id', ref).maybeSingle()
          : await supabaseAdmin.from('courses').select(cols).eq('slug', ref).maybeSingle();
        course = data || null;
      }
      if (!course && payment.item_name) {
        const { data } = await supabaseAdmin.from('courses')
          .select(cols).ilike('title', `${payment.item_name.trim()}%`).maybeSingle();
        course = data || null;
      }
      if (!course) console.error('verify-payment: course not found for', ref, '/', payment.item_name);

      // Fetch user profile for name/email
      const { data: payer } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, phone, profession')
        .eq('id', userId).single();

      // Insert into course_registrations (so it shows in dashboard).
      // IMPORTANT: course_registrations has NO unique constraint (verified via
      // pg_constraint), so `.upsert(..., { onConflict: ... })` will ALWAYS fail —
      // Postgrest requires a real unique/exclusion constraint matching onConflict's
      // columns, and none exists. That was why paid enrollments were silently
      // never written even though the payment succeeded. Using a plain insert here,
      // guarded by a pre-check so retries/duplicate webhooks don't create dup rows.
      // Prefer the form data captured at order time, fall back to the profile.
      const rsvpMeta  = payment.metadata?.rsvp || {};
      const gstMeta   = payment.metadata?.gst  || {};
      const regEmail  = rsvpMeta.email     || payer?.email     || null;
      const regName   = rsvpMeta.full_name || payer?.full_name || null;

      let regError = null;
      let didInsert = false;

      // course_id is NOT NULL — never attempt an insert without a resolved course.
      if (course && regEmail) {
        let existingReg = null;
        const { data: byEmail } = await supabaseAdmin
          .from('course_registrations')
          .select('id').eq('course_id', course.id).ilike('email', regEmail).limit(1);
        existingReg = byEmail?.[0] || null;
        if (!existingReg) {
          const { data: byUser } = await supabaseAdmin
            .from('course_registrations')
            .select('id').eq('course_id', course.id).eq('user_id', userId).limit(1);
          existingReg = byUser?.[0] || null;
        }

        if (!existingReg) {
          const { error } = await supabaseAdmin
            .from('course_registrations')
            .insert({
              user_id:    userId,
              course_id:  course.id,
              course_title: course.title || payment.item_name,
              full_name:  regName || regEmail,
              email:      regEmail,
              phone:      rsvpMeta.phone      || payer?.phone      || null,
              profession: rsvpMeta.profession || payer?.profession || null,
              gst_number:       gstMeta.gst_number       || null,
              gst_company_name: gstMeta.gst_company_name || null,
              gst_address:      gstMeta.gst_address      || null,
              status:     'registered',
              zoom_link:  course.zoom_link || null,
              payment_id: payment.id,   // lets a later refund revoke exactly this row
            });
          regError = error;
          didInsert = !error;
          if (!error) console.log('verify-payment: enrolled', regEmail, 'in', course.id);
        }
      }

      if (regError) {
        console.error('course_registrations insert error:', regError.message);
      }

      // Send course confirmation email with WhatsApp link.
      // If the webhook already processed this payment it already sent the email —
      // only send here when this call is the one that actually created the row.
      if (regEmail && course && (!alreadyProcessed || didInsert)) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.fipin.org'}/api/send-course-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name:               regName || regEmail,
              email:              regEmail,
              courseTitle:        course.title,
              eventDate:          course.event_date,
              eventTime:          course.event_time,
              zoomLink:           course.zoom_link,
              zoomPassword:       course.zoom_password,
              whatsappGroupLink:  course.whatsapp_group_link,
            }),
          });
        } catch (e) { console.warn('Course confirmation email failed:', e.message); }
      }
    }

    // 5. Fetch user profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('full_name, email, profile_slug, profession, city')
      .eq('id', userId).single();

    // Generate friendly Member ID
    // Guard every branch: profile_slug is nullable, and the old ternary
    // dereferenced it whenever fip_member_no was set but the slug was null.
    const memberId =
      profile?.fip_member_no
        ? profile.fip_member_no
        : profile?.profile_slug
          ? 'FIP-' + profile.profile_slug.split('-').slice(-1)[0].toUpperCase()
          : 'FIP-' + userId.slice(0, 6).toUpperCase();

    // 6. Send confirmation email (non-blocking)
    sendPaymentEmail({
      profile,
      payment: { ...updatedPayment, razorpay_payment_id, razorpay_order_id },
      validFrom,
      validUntil,
      memberId,
    }).catch(e => console.error('Email error:', e));

    // 7. Increment coupon usage if one was applied
    if (payment.coupon_id) {
      supabaseAdmin
        .from('coupons')
        .update({ used_count: (payment.used_count || 0) + 1 })
        .eq('id', payment.coupon_id)
        .then(() => {})
        .catch(() => {});
    }

    return res.status(200).json({ verified: true, payment: updatedPayment });

  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}