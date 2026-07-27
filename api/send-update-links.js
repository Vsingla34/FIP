// /api/send-update-links.js
// Admin triggers this to send update links to incomplete event registrants
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { adminId, eventId, rsvpIds } = req.body || {};
  if (!adminId || !eventId || !rsvpIds?.length) {
    return res.status(400).json({ error: 'adminId, eventId and rsvpIds are required' });
  }

  // Verify admin
  const { data: admin } = await supabaseAdmin
    .from('profiles').select('role,is_admin').eq('id', adminId).single();
  if (!admin || (admin.role !== 'admin' && !admin.is_admin)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  // Get event details
  const { data: event } = await supabaseAdmin
    .from('events').select('title,event_date,event_time').eq('id', eventId).single();
  if (!event) return res.status(400).json({ error: 'Event not found' });

  // Get the registrants
  const { data: rsvps, error } = await supabaseAdmin
    .from('event_rsvps')
    .select('id,full_name,email,phone,profession,designation,organisation,icai_membership_no,city')
    .in('id', rsvpIds);
  if (error || !rsvps?.length) {
    return res.status(400).json({ error: 'No valid registrants found' });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fipin.org';
  const transporter = getTransporter();
  const results = { sent: 0, failed: 0, errors: [] };

  for (const rsvp of rsvps) {
    if (!rsvp.email) { results.failed++; continue; }
    try {
      // Create a secure token for this registrant
      const { data: tokenRow } = await supabaseAdmin
        .from('event_rsvp_tokens')
        .insert({ rsvp_id: rsvp.id, event_id: eventId, email: rsvp.email })
        .select('token')
        .single();

      if (!tokenRow?.token) throw new Error('Token creation failed');

      const updateLink = `${appUrl}/event-update?token=${tokenRow.token}`;
      const eventDate  = event.event_date
        ? new Date(event.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
        : '';

      await transporter.sendMail({
        from:    `"FIP – Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
        to:      rsvp.email,
        subject: `Important: ICAI Membership Number Required — ${event.title}`,
        html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#0D2040 100%);padding:28px 32px;text-align:left">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.3px">
      FIP <span style="color:#FFD09B;font-style:italic">·</span> Federation of Indian Professionals
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px">www.fipin.org</div>
  </div>

  <!-- Orange notice bar -->
  <div style="background:#F26522;padding:12px 32px;display:flex;align-items:center;gap:10px">
    <span style="font-size:18px">⚠️</span>
    <span style="color:#fff;font-weight:700;font-size:13px;letter-spacing:.2px">
      ACTION REQUIRED — Your Registration is Incomplete
    </span>
  </div>

  <!-- Body -->
  <div style="padding:32px;background:#fff">
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 6px">
      Dear ${rsvp.full_name || 'Member'},
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      Thank you for registering for the upcoming FIP event:
    </p>

    <!-- Event card -->
    <div style="background:#F7F9FC;border-left:4px solid #1A3C6E;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:16px;font-weight:800;color:#1A3C6E;margin-bottom:4px">${event.title}</div>
      ${eventDate ? `<div style="font-size:13px;color:#718096">📅 ${eventDate}${event.event_time ? '  ·  ' + event.event_time : ''}</div>` : ''}
      ${event.location ? `<div style="font-size:13px;color:#718096;margin-top:2px">📍 ${event.location}</div>` : ''}
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 16px">
      We are pleased to inform you that your seat has been reserved. However, upon review of your
      registration, we have noted that your <strong style="color:#C05621">ICAI / ICSI / ICMAI Membership
      Number</strong> has not been provided.
    </p>

    <!-- ICAI notice box -->
    <div style="background:#FFF5E6;border:1.5px solid #F2C06E;border-radius:10px;padding:18px 22px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:800;color:#92400E;margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">📋</span> Why is this required?
      </div>
      <p style="font-size:13px;color:#7C5202;line-height:1.8;margin:0">
        This event is exclusively organised for <strong>practising Chartered Accountants (CA)</strong>. As per FIP's event policy, your <strong>ICAI Membership Number is mandatory for entry verification at the venue</strong>. Without this information, we may be unable to confirm your seat.
      </p>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 24px">
      To complete your registration, please click the button below. Your previously submitted details
      have been pre-filled — you only need to provide the missing information.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 24px">
      <a href="${updateLink}"
        style="display:inline-block;background:#F26522;color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(242,101,34,0.35)">
        Complete My Registration →
      </a>
    </div>

    <!-- Expiry warning -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 18px;margin-bottom:28px;text-align:center">
      <span style="font-size:12px;color:#1D4ED8;font-weight:600">
        🕐 This secure link is valid for <strong>7 days</strong> from the date of this email.
        Please act promptly to confirm your participation.
      </span>
    </div>

    <p style="font-size:13px;color:#718096;line-height:1.7;margin:0 0 8px">
      Should you require any assistance, please do not hesitate to reach out to us at
      <a href="mailto:fippresidentoffice@gmail.com" style="color:#1A3C6E;font-weight:600">fippresidentoffice@gmail.com</a>.
    </p>
    <p style="font-size:13px;color:#718096;margin:0">
      We look forward to welcoming you at the event.
    </p>

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E2E8F0">
      <p style="font-size:12px;color:#A0AEC0;margin:0 0 4px">Warm regards,</p>
      <p style="font-size:13px;color:#2D3748;font-weight:700;margin:0">Team FIP</p>
      <p style="font-size:12px;color:#A0AEC0;margin:4px 0 0">Federation of Indian Professionals · <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a></p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#F7F9FC;padding:14px 32px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0">
      This email was sent because you registered for an FIP event. If you did not register, please ignore this email.
    </p>
  </div>
</div>`,
      });
      results.sent++;
    } catch (e) {
      results.failed++;
      results.errors.push({ email: rsvp.email, error: e.message });
    }
  }

  return res.status(200).json({ ...results, total: rsvps.length });
}