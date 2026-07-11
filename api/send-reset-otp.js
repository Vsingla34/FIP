// /api/send-reset-otp.js
// Step 1: Generate & email a 6-digit OTP using our own Gmail SMTP
import nodemailer   from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    // Check if user exists (don't reveal if they don't — just send if they do)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = users?.some(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (userExists) {
      // Generate 6-digit OTP
      const otp        = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt  = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Upsert OTP row (one active OTP per email at a time)
      await supabaseAdmin.from('password_reset_otps').upsert({
        email:        email.toLowerCase().trim(),
        otp,
        expires_at:   expiresAt,
        verified_token: null,
        used:         false,
        created_at:   new Date().toISOString(),
      }, { onConflict: 'email' });

      // Send via Gmail (same SMTP used for course emails)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });

      const firstName = email.split('@')[0];
      await transporter.sendMail({
        from:    `"FIP" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: 'Your FIP Password Reset OTP',
        html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#1A3C6E;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">🔐 Password Reset OTP</h1>
  </div>
  <div style="border:1px solid #E0E0E0;border-top:none;padding:28px;border-radius:0 0 10px 10px">
    <p style="color:#333;font-size:15px">Hi ${firstName},</p>
    <p style="color:#333;font-size:14px;line-height:1.6">
      We received a request to reset your FIP account password.
      Use the OTP below to continue:
    </p>
    <div style="background:#F4F6FB;border:2px dashed #1A3C6E;border-radius:10px;padding:20px;text-align:center;margin:20px 0">
      <div style="font-size:38px;font-weight:900;letter-spacing:12px;color:#1A3C6E;font-family:monospace">
        ${otp}
      </div>
      <p style="color:#888;font-size:12px;margin:8px 0 0">Valid for 10 minutes</p>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6">
      If you didn't request this, you can safely ignore this email.
      Your password will not be changed.
    </p>
    <hr style="border:none;border-top:1px solid #E0E0E0;margin:20px 0"/>
    <p style="color:#aaa;font-size:11px;text-align:center">
      Federation of Indian Professionals · 
      <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a>
    </p>
  </div>
</div>`,
      });
    }

    // Always return success (don't reveal if email exists)
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[send-reset-otp]', err);
    return res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
  }
}