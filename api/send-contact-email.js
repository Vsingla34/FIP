import nodemailer from 'nodemailer';

function getTransporter(user, pass) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    auth: { user, pass },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: 'Email not configured' });
  }

  const transporter = getTransporter(gmailUser, gmailPass);
  const { type } = req.body || {};

  /* ── ADMIN REPLY to user ─────────────────────────────────────── */
  if (type === 'reply') {
    const { to, name, subject, message, original } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });

    const firstName = (name || 'Member').split(' ')[0];

    await transporter.sendMail({
      from:    `"FIP — Team" <${gmailUser}>`,
      to,
      subject: subject || 'Response from FIP Team',
      html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3C6E 0%,#0D2040 100%);padding:24px 28px">
    <div style="font-size:20px;font-weight:700;color:#fff">Federation of Indian Professionals</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px">www.fipin.org</div>
  </div>

  <!-- Body -->
  <div style="padding:28px;background:#fff">
    <p style="font-size:16px;color:#1A3C6E;font-weight:700;margin:0 0 6px">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      Thank you for reaching out to us. We have reviewed your enquiry and are pleased to provide the following response:
    </p>

    <!-- Admin reply box -->
    <div style="background:#F0F7FF;border-left:4px solid #1A3C6E;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#F26522;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
        Response from FIP Team
      </div>
      <div style="font-size:14px;color:#2D3748;line-height:1.8;white-space:pre-wrap">${message}</div>
    </div>

    ${original ? `
    <!-- Original query reference -->
    <div style="background:#F9FAFB;border:1px solid #E2E8F0;border-radius:8px;padding:14px 18px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
        Your original query
      </div>
      <div style="font-size:13px;color:#6B7280;line-height:1.7;white-space:pre-wrap">${original}</div>
    </div>` : ''}

    <p style="font-size:14px;color:#4A5568;line-height:1.8;margin:0 0 20px">
      We hope this addresses your query. Please feel free to reach out if you have any further questions.
    </p>

    <!-- Sign off -->
    <div style="border-top:1px solid #E2E8F0;padding-top:18px">
      <p style="font-size:13px;color:#718096;margin:0 0 4px">Warm regards,</p>
      <p style="font-size:14px;color:#1A3C6E;font-weight:700;margin:0">Team FIP</p>
      <p style="font-size:12px;color:#9CA3AF;margin:4px 0 0">
        Federation of Indian Professionals<br/>
        <a href="https://www.fipin.org" style="color:#F26522;text-decoration:none">www.fipin.org</a>
        &nbsp;·&nbsp;fippresidentoffice@gmail.com
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#F7F9FC;padding:12px 28px;border-top:1px solid #E2E8F0;text-align:center">
    <p style="font-size:11px;color:#A0AEC0;margin:0">
      This is a response to your enquiry on the FIP website. Please do not reply to this email directly.
    </p>
  </div>
</div>`,
    });

    return res.status(200).json({ success: true });
  }

  /* ── NEW CONTACT FORM submission ─────────────────────────────── */
  try {
    const { name = '', email = '', phone = '', subject = 'General Enquiry', message = '' } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing name, email or message' });

    const firstName = name.split(' ')[0];
    const baseStyle = 'font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.7;';

    await Promise.all([
      // ── To sender ──
      transporter.sendMail({
        from:    `"Federation of Indian Professionals" <${gmailUser}>`,
        to:      email,
        subject: `We've received your message — FIP`,
        html: `<div style="${baseStyle}padding:24px;background:#F0F2F8;">
          <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#1A3C6E;padding:20px 28px;text-align:center;">
              <span style="font-size:24px;font-weight:900;color:#fff;font-family:Georgia,serif;">F<span style="color:#F26522;">|</span>P</span>
              <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:4px;">FEDERATION OF INDIAN PROFESSIONALS</div>
            </div>
            <div style="padding:28px;">
              <h2 style="color:#1A3C6E;margin:0 0 12px;font-size:20px;">Message Received!</h2>
              <p style="margin:0 0 16px;">Hi <strong>${firstName}</strong>, we've received your enquiry and will get back to you within <strong>24 working hours</strong>.</p>
              <div style="background:#FEF9F5;border-left:3px solid #F26522;padding:12px 16px;margin-bottom:16px;">
                <div style="font-size:11px;color:#9CA3AF;text-transform:uppercase;margin-bottom:4px;">${subject}</div>
                <div style="font-size:13px;color:#6B7280;">${message.replace(/\n/g, '<br/>')}</div>
              </div>
              <p style="font-size:12px;color:#9CA3AF;margin:0;">Questions? Email us at fippresidentoffice@gmail.com</p>
            </div>
            <div style="background:#F9FAFB;padding:12px;text-align:center;font-size:11px;color:#9CA3AF;">www.fipin.org · New Delhi, India</div>
          </div>
        </div>`,
      }),

      // ── To FIP admin ──
      transporter.sendMail({
        from:    `"FIP Website" <${gmailUser}>`,
        to:      'Fipmediaoffice@gmail.com',
        replyTo: email,
        subject: `[FIP Contact] ${subject} — from ${name}`,
        html: `<div style="${baseStyle}padding:24px;background:#F0F2F8;">
          <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#1A3C6E;padding:16px 28px;">
              <span style="font-size:18px;font-weight:900;color:#fff;font-family:Georgia,serif;">F<span style="color:#F26522;">|</span>P</span>
              <span style="font-size:12px;color:rgba(255,255,255,0.6);margin-left:10px;">New Contact Form Submission</span>
            </div>
            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;width:70px;">NAME</td><td style="padding:7px 0;color:#1A3C6E;font-weight:600;border-bottom:1px solid #F3F4F6;">${name}</td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">EMAIL</td><td style="padding:7px 0;border-bottom:1px solid #F3F4F6;"><a href="mailto:${email}" style="color:#F26522;">${email}</a></td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">PHONE</td><td style="padding:7px 0;color:#374151;border-bottom:1px solid #F3F4F6;">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">SUBJECT</td><td style="padding:7px 0;color:#1A3C6E;font-weight:600;">${subject}</td></tr>
              </table>
              <div style="font-size:11px;color:#9CA3AF;text-transform:uppercase;margin-bottom:8px;">Message</div>
              <div style="background:#F8F9FB;border-radius:6px;padding:14px;font-size:13px;white-space:pre-wrap;">${message}</div>
            </div>
          </div>
        </div>`,
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email send error:', err.code, err.message);
    return res.status(500).json({ error: err.message, code: err.code });
  }
}