// /api/send-event-confirmation.js — Sends confirmation email after event registration
import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.GMAIL_USER) return res.status(200).json({ skipped: true });

  const { name, email, eventTitle, eventDate, eventTime, eventLocation, eventType, isPaid, amount, zoomLink, whatsappGroupLink } = req.body || {};
  if (!email || !eventTitle) return res.status(400).json({ error: 'email and eventTitle are required' });

  const dateStr   = formatDate(eventDate);
  const isOnline  = eventType === 'Online' || eventType === 'Webinar';

  const html = `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#0D2040 100%);padding:24px 28px">
    <div style="font-size:20px;font-weight:700;color:#fff">Federation of Indian Professionals</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">www.fipin.org</div>
  </div>

  <!-- Green success bar -->
  <div style="background:#16A34A;padding:12px 28px;display:flex;align-items:center;gap:10px">
    <span style="font-size:18px">✅</span>
    <span style="color:#fff;font-weight:700;font-size:14px">
      ${isPaid ? 'Payment Confirmed — Seat Reserved!' : 'Registration Confirmed — Seat Reserved!'}
    </span>
  </div>

  <!-- Body -->
  <div style="padding:28px;background:#fff">
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 6px">Dear ${name || 'Participant'},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      ${isPaid
        ? `Your payment of <strong>₹${Number(amount||0).toLocaleString('en-IN')}</strong> has been received and your seat is confirmed.`
        : 'Your registration has been received and your seat is confirmed.'}
    </p>

    <!-- Event card -->
    <div style="background:#F7F9FC;border-left:4px solid #1A3C6E;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#F26522;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
        ${eventType || 'Event'} · FIP
      </div>
      <div style="font-size:17px;font-weight:800;color:#1A3C6E;margin-bottom:10px">${eventTitle}</div>
      ${dateStr ? `
      <div style="font-size:13px;color:#718096;margin-bottom:4px">
        📅 <strong>${dateStr}</strong>${eventTime ? `&nbsp;·&nbsp;${eventTime}` : ''}
      </div>` : ''}
      ${eventLocation ? `
      <div style="font-size:13px;color:#718096;margin-bottom:4px">
        📍 ${eventLocation}
      </div>` : ''}
      ${isOnline && zoomLink ? `
      <div style="margin-top:12px">
        <a href="${zoomLink}" style="display:inline-block;background:#2D8CFF;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;margin-right:8px">
          Join via Zoom →
        </a>
      </div>` : ''}
    ${whatsappGroupLink ? `
      <div style="margin-top:12px">
        <a href="${whatsappGroupLink}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px">
          💬 Join WhatsApp Group →
        </a>
      </div>` : ''}
    </div>

    <!-- What to bring / notes -->
    <div style="background:#FFF5E6;border:1.5px solid #F2C06E;border-radius:8px;padding:16px 18px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:8px">📋 Please note</div>
      <ul style="font-size:13px;color:#7C5202;margin:0;padding-left:18px;line-height:1.8">
        <li>Please carry a valid photo ID and your membership/professional ID for verification at the venue.</li>
        <li>Be present at least 15 minutes before the scheduled start time.</li>
        ${isOnline ? '<li>The Zoom link will be available above. Please test your audio/video before joining.</li>' : ''}
        <li>For any assistance, contact us at <strong>fippresidentoffice@gmail.com</strong></li>
      </ul>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      We look forward to seeing you at the event. If you have any questions, do not hesitate to reach out.
    </p>

    <div style="border-top:1px solid #E2E8F0;padding-top:16px">
      <p style="font-size:12px;color:#A0AEC0;margin:0 0 2px">Warm regards,</p>
      <p style="font-size:13px;color:#2D3748;font-weight:700;margin:0">Team FIP</p>
      <p style="font-size:11px;color:#A0AEC0;margin:4px 0 0">Federation of Indian Professionals · www.fipin.org</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#F7F9FC;padding:12px 28px;border-top:1px solid #E2E8F0;text-align:center">
    <p style="font-size:11px;color:#A0AEC0;margin:0">
      This email was sent because you registered for an FIP event. Please do not reply to this email.
    </p>
  </div>
</div>`;

  try {
    await getTransporter().sendMail({
      from:    `"FIP — Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: `✅ Seat Confirmed: ${eventTitle}`,
      html,
    });
    return res.status(200).json({ sent: true });
  } catch (e) {
    console.error('Event confirmation email failed:', e.message);
    return res.status(500).json({ error: e.message });
  }
}