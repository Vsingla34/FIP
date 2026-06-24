import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, subject, message, messageId } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });

  const firstName   = name.split(' ')[0];
  const subjectLine = subject || 'General Enquiry';

  // Set Vercel function timeout response early — don't let it hang
  res.setHeader('Connection', 'close');

  const transporter = nodemailer.createTransport({
    host:             'smtp.gmail.com',
    port:             465,
    secure:           true,           // SSL — faster than STARTTLS on 587
    connectionTimeout: 10000,         // 10s connection timeout
    greetingTimeout:   10000,
    socketTimeout:     15000,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const confirmHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F2F8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F8;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1A3C6E;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center;">
  <span style="font-family:Georgia,serif;font-size:28px;font-weight:900;color:#fff;">F<span style="color:#F26522;">|</span>P</span>
  <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Federation of Indian Professionals</div>
</td></tr>
<tr><td style="background:#fff;padding:36px 40px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <h2 style="font-family:Georgia,serif;font-size:24px;color:#1A3C6E;margin:0 0 8px;">We've received your message!</h2>
  <p style="font-size:15px;color:#6B7280;margin:0 0 24px;line-height:1.6;">Hi <strong style="color:#1A3C6E;">${firstName}</strong>, thank you for reaching out to FIP. We will get back to you within <strong>24 working hours</strong>.</p>
  <div style="background:#F8F9FB;border-left:4px solid #F26522;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Message</div>
    <div style="font-size:13px;font-weight:700;color:#1A3C6E;margin-bottom:6px;">${subjectLine}</div>
    <div style="font-size:13px;color:#6B7280;line-height:1.7;">${message.replace(/\n/g,'<br/>')}</div>
  </div>
  <div style="background:#EEF2FF;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:700;color:#1A3C6E;margin-bottom:10px;">Reach us directly:</div>
    <div style="font-size:12px;color:#6B7280;line-height:2.2;">
      📧 <a href="mailto:fippresidentoffice@gmail.com" style="color:#F26522;text-decoration:none;">fippresidentoffice@gmail.com</a><br/>
      📞 <a href="tel:+919999830938" style="color:#F26522;text-decoration:none;">+91 99998 30938</a><br/>
      💬 <a href="https://wa.me/919555792955" style="color:#F26522;text-decoration:none;">WhatsApp: +91 95557 92955</a>
    </div>
  </div>
  <div style="text-align:center;">
    <a href="https://fip-murex.vercel.app" style="display:inline-block;background:#F26522;color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Visit FIP Website →</a>
  </div>
</td></tr>
<tr><td style="padding:16px;text-align:center;font-size:11px;color:#9CA3AF;">Federation of Indian Professionals · New Delhi, India · www.fipin.org</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const notifyHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F2F8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F8;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1A3C6E;padding:20px 32px;border-radius:12px 12px 0 0;">
  <span style="font-family:Georgia,serif;font-size:22px;font-weight:900;color:#fff;">F<span style="color:#F26522;">|</span>P</span>
  <span style="font-size:13px;color:rgba(255,255,255,0.6);margin-left:12px;">New Contact Form Submission</span>
</td></tr>
<tr><td style="background:#fff;padding:32px 40px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#FEF0E8;border:1px solid #F5C4A8;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:700;color:#F26522;">🔔 New enquiry received from the FIP website</div>
  </div>
  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border-collapse:collapse;">
    <tr style="border-bottom:1px solid #F3F4F6;"><td width="90" style="padding:10px 12px 10px 0;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Name</td><td style="padding:10px 0;font-size:14px;color:#1A3C6E;font-weight:600;">${name}</td></tr>
    <tr style="border-bottom:1px solid #F3F4F6;"><td style="padding:10px 12px 10px 0;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#F26522;font-size:14px;font-weight:600;text-decoration:none;">${email}</a></td></tr>
    <tr style="border-bottom:1px solid #F3F4F6;"><td style="padding:10px 12px 10px 0;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Phone</td><td style="padding:10px 0;font-size:14px;color:#1A3C6E;">${phone || 'Not provided'}</td></tr>
    <tr><td style="padding:10px 12px 10px 0;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;">Subject</td><td style="padding:10px 0;font-size:14px;color:#1A3C6E;font-weight:600;">${subjectLine}</td></tr>
  </table>
  <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Message</div>
  <div style="background:#F8F9FB;border-radius:8px;padding:16px 20px;font-size:14px;color:#374151;line-height:1.75;white-space:pre-wrap;">${message}</div>
  <div style="text-align:center;margin-top:28px;">
    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subjectLine)}" style="display:inline-block;background:#1A3C6E;color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Reply to ${firstName} →</a>
  </div>
</td></tr>
<tr><td style="padding:16px;text-align:center;font-size:11px;color:#9CA3AF;">Sent automatically from the FIP website contact form.</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  try {
    // Verify env vars are set
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Missing env vars:', {
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
      });
      return res.status(500).json({ error: 'Email not configured. Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars.' });
    }

    // Verify SMTP connection first
    await transporter.verify();
    console.log('SMTP connection verified');

    await Promise.all([
      transporter.sendMail({
        from:    `"Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `We've received your message — FIP`,
        html:    confirmHTML,
      }),
      transporter.sendMail({
        from:    `"FIP Website" <${process.env.GMAIL_USER}>`,
        to:      'Fipmediaoffice@gmail.com',
        replyTo: email,
        subject: `[FIP Contact] ${subjectLine} — from ${name}`,
        html:    notifyHTML,
      }),
    ]);

    console.log('Both emails sent successfully');

    if (messageId) {
      await supabaseAdmin.from('contact_messages').update({ status: 'read' }).eq('id', messageId);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email error code:', err.code);
    console.error('Email error message:', err.message);
    console.error('Email error response:', err.response);
    return res.status(500).json({
      error: err.message,
      code:  err.code,
      hint:  err.code === 'EAUTH'
        ? 'Gmail auth failed. Check GMAIL_USER and GMAIL_APP_PASSWORD env vars. Make sure you are using an App Password, not your regular Gmail password.'
        : err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT'
        ? 'Cannot connect to Gmail SMTP. Check network or try port 587.'
        : 'Unknown error',
    });
  }
}