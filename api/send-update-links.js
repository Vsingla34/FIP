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

  const action = req.query.action || req.body?.action;

  // ── UPDATE RSVP BY TOKEN (save form data using service role) ─────────
  if (action === 'update-rsvp') {
    const { token, full_name, phone, profession, designation,
            organisation, icai_membership_no, city } = req.body || {};

    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Validate token
    const { data: tokenRow } = await supabaseAdmin
      .from('event_rsvp_tokens')
      .select('id, rsvp_id, used, expires_at')
      .eq('token', token)
      .single();

    if (!tokenRow)                                  return res.status(404).json({ error: 'invalid' });
    if (tokenRow.used)                              return res.status(410).json({ error: 'Link already used' });
    if (new Date(tokenRow.expires_at) < new Date()) return res.status(410).json({ error: 'Link has expired' });

    // Save the update (service role bypasses RLS)
    const { error: updateErr } = await supabaseAdmin
      .from('event_rsvps')
      .update({
        full_name:          (full_name          || '').trim(),
        phone:              (phone               || '').trim() || null,
        profession:         profession            || null,
        designation:        (designation         || '').trim() || null,
        organisation:       (organisation        || '').trim() || null,
        icai_membership_no: (icai_membership_no  || '').trim() || null,
        city:               (city                || '').trim() || null,
      })
      .eq('id', tokenRow.rsvp_id);

    if (updateErr) {
      console.error('RSVP update failed:', updateErr.message);
      return res.status(500).json({ error: 'Update failed: ' + updateErr.message });
    }

    // Mark token as used
    await supabaseAdmin.from('event_rsvp_tokens')
      .update({ used: true }).eq('id', tokenRow.id);

    console.log('RSVP updated via token for rsvp_id:', tokenRow.rsvp_id,
                '| ICAI:', icai_membership_no);

    return res.status(200).json({ success: true });
  }

  // ── GET RSVP BY TOKEN ─────────────────────────────────────────────────
  if (action === 'get-rsvp') {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const { data: tokenRow } = await supabaseAdmin
      .from('event_rsvp_tokens')
      .select('id,rsvp_id,event_id,used,expires_at')
      .eq('token', token).single();

    if (!tokenRow)                                return res.status(404).json({ error: 'invalid' });
    if (tokenRow.used)                            return res.status(410).json({ error: 'used' });
    if (new Date(tokenRow.expires_at) < new Date()) return res.status(410).json({ error: 'expired' });

    const { data: rsvp } = await supabaseAdmin.from('event_rsvps')
      .select('id,full_name,email,phone,profession,designation,organisation,icai_membership_no,city')
      .eq('id', tokenRow.rsvp_id).single();
    if (!rsvp) return res.status(404).json({ error: 'Registration not found' });

    const { data: event } = await supabaseAdmin.from('events')
      .select('title,event_date,event_time,location').eq('id', tokenRow.event_id).single();

    return res.status(200).json({ rsvp, event });
  }

  // ── SEND UPDATE LINKS (default action) ────────────────────────────
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
        subject: `Action Required: Complete Your ICAI Details — ${event.title}`,
        html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#0D2040 100%);padding:28px 32px">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.3px">
      FIP <span style="color:#FFD09B;font-style:italic">·</span> Federation of Indian Professionals
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px">www.fipin.org</div>
  </div>

  <!-- Apology bar -->
  <div style="background:#1A3C6E;padding:12px 32px;border-top:3px solid #FFD09B">
    <span style="color:#FFD09B;font-weight:700;font-size:13px">
      A message from FIP regarding your registration
    </span>
  </div>

  <!-- Body -->
  <div style="padding:32px;background:#fff">
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 16px">
      Dear ${rsvp.full_name || 'Member'},
    </p>

    <!-- Apology box -->
    <div style="background:#F0F7FF;border-left:4px solid #1A3C6E;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:24px">
      <p style="font-size:14px;color:#1E3A5F;line-height:1.9;margin:0">
        We sincerely apologise for the inconvenience caused. Due to a <strong>technical issue on our end</strong>,
        the details you submitted through our earlier link could not be saved in our system.
        <strong>This was entirely our fault</strong> and we take full responsibility for it.
      </p>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      We have now resolved the issue. We request you to kindly submit your details once more
      using the new secure link below. Your previously filled information has been <strong>pre-loaded</strong>
      in the form — you only need to add your <strong>ICAI Membership Number</strong> and click submit.
      It will take less than a minute.
    </p>

    <!-- Event card -->
    <div style="background:#F7F9FC;border-left:4px solid #F26522;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#F26522;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Your Registered Event</div>
      <div style="font-size:16px;font-weight:800;color:#1A3C6E;margin-bottom:4px">${event.title}</div>
      ${eventDate ? `<div style="font-size:13px;color:#718096">📅 ${eventDate}${event.event_time ? '  ·  ' + event.event_time : ''}</div>` : ''}
      ${event.location ? `<div style="font-size:13px;color:#718096;margin-top:2px">📍 ${event.location}</div>` : ''}
    </div>

    <!-- Why ICAI needed -->
    <div style="background:#FFF5E6;border:1.5px solid #F2C06E;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:800;color:#92400E;margin-bottom:6px">
        📋 Why is ICAI Membership Number required?
      </div>
      <p style="font-size:13px;color:#7C5202;line-height:1.8;margin:0">
        This event is exclusively organised for <strong>practising Chartered Accountants (CA)</strong>.
        Your <strong>ICAI Membership Number is mandatory for entry verification at the venue</strong>.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 20px">
      <a href="${updateLink}"
        style="display:inline-block;background:#F26522;color:#fff;text-decoration:none;padding:15px 44px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(242,101,34,0.35)">
        Submit My ICAI Number →
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9CA3AF;margin:0 0 24px">
      Your existing details are pre-filled. Only your ICAI number needs to be added.
    </p>

    <!-- Expiry warning -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 18px;margin-bottom:24px;text-align:center">
      <span style="font-size:12px;color:#1D4ED8;font-weight:600">
        🕐 This secure link is valid for <strong>7 days</strong>. Please submit at your earliest convenience.
      </span>
    </div>

    <p style="font-size:13px;color:#718096;line-height:1.8;margin:0 0 6px">
      We deeply regret the inconvenience and thank you for your understanding and continued support of FIP.
    </p>
    <p style="font-size:13px;color:#718096;margin:0 0 24px">
      For any assistance, please contact us at
      <a href="mailto:fippresidentoffice@gmail.com" style="color:#1A3C6E;font-weight:600">fippresidentoffice@gmail.com</a>
    </p>

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