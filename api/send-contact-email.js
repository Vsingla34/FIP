import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Return env var status so we can debug from browser console
  if (!gmailUser || !gmailPass) {
    return res.status(500).json({
      error: 'Email not configured',
      GMAIL_USER_set: !!gmailUser,
      GMAIL_APP_PASSWORD_set: !!gmailPass,
    });
  }

  try {
    const { name = '', email = '', phone = '', subject = 'General Enquiry', message = '' } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing name, email or message' });
    }

    const firstName = name.split(' ')[0];

    const transporter = nodemailer.createTransport({
      host:              'smtp.gmail.com',
      port:              465,
      secure:            true,
      connectionTimeout: 10000,
      greetingTimeout:   10000,
      socketTimeout:     15000,
      auth: { user: gmailUser, pass: gmailPass },
    });

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
              <p style="font-size:12px;color:#9CA3AF;margin:0;">Questions? Email us at fippresidentoffice@gmail.com or WhatsApp +91 95557 92955</p>
            </div>
            <div style="background:#F9FAFB;padding:12px;text-align:center;font-size:11px;color:#9CA3AF;">www.fipin.org · New Delhi, India</div>
          </div>
        </div>`,
      }),

      // ── To FIP ──
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
              <div style="background:#FEF0E8;border:1px solid #F5C4A8;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:13px;font-weight:700;color:#F26522;">
                🔔 New enquiry from the FIP website
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;width:70px;">NAME</td><td style="padding:7px 0;color:#1A3C6E;font-weight:600;border-bottom:1px solid #F3F4F6;">${name}</td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">EMAIL</td><td style="padding:7px 0;border-bottom:1px solid #F3F4F6;"><a href="mailto:${email}" style="color:#F26522;">${email}</a></td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">PHONE</td><td style="padding:7px 0;color:#374151;border-bottom:1px solid #F3F4F6;">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:7px 10px 7px 0;color:#9CA3AF;font-weight:700;">SUBJECT</td><td style="padding:7px 0;color:#1A3C6E;font-weight:600;">${subject}</td></tr>
              </table>
              <div style="font-size:11px;color:#9CA3AF;text-transform:uppercase;margin-bottom:8px;">Message</div>
              <div style="background:#F8F9FB;border-radius:6px;padding:14px;font-size:13px;white-space:pre-wrap;">${message}</div>
              <div style="text-align:center;margin-top:20px;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" style="background:#1A3C6E;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reply to ${firstName} →</a>
              </div>
            </div>
            <div style="background:#F9FAFB;padding:10px;text-align:center;font-size:11px;color:#9CA3AF;">Sent from fip-murex.vercel.app contact form</div>
          </div>
        </div>`,
      }),
    ]);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email send error:', err.code, err.message);
    return res.status(500).json({
      error: err.message,
      code:  err.code,
      hint:  err.code === 'EAUTH'
        ? 'Gmail auth failed — check GMAIL_APP_PASSWORD is a 16-char App Password'
        : err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT'
        ? 'Cannot reach smtp.gmail.com — network issue'
        : 'Unknown — check Vercel function logs',
    });
  }
}