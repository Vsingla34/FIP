// /api/send-reset-otp.js
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

  const normalEmail = email.toLowerCase().trim();
  console.log('[send-reset-otp] Request for:', normalEmail);

  try {
    // ── 1. Find user ────────────────────────────────────────
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error('[send-reset-otp] listUsers error:', listErr);
      return res.status(500).json({ error: 'Server error checking account. Please try again.' });
    }

    const authUser = listData?.users?.find(
      u => u.email?.toLowerCase() === normalEmail
    );

    if (!authUser) {
      console.log('[send-reset-otp] No account found for:', normalEmail);
      // Return specific error (better UX than silent success for reset flow)
      return res.status(404).json({ error: 'No FIP account found with this email address.' });
    }

    console.log('[send-reset-otp] Found user:', authUser.id);

    // ── 2. Generate + store OTP ──────────────────────────────
    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upsertErr } = await supabaseAdmin
      .from('password_reset_otps')
      .upsert({
        email:           normalEmail,
        otp,
        expires_at:      expiresAt,
        verified_token:  null,
        used:            false,
        created_at:      new Date().toISOString(),
      }, { onConflict: 'email' });

    if (upsertErr) {
      console.error('[send-reset-otp] DB upsert error:', upsertErr);
      return res.status(500).json({ error: 'Failed to generate OTP. Please try again.' });
    }

    console.log('[send-reset-otp] OTP stored:', otp, 'for', normalEmail);

    // ── 3. Send email via Gmail SMTP ─────────────────────────
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify SMTP connection before sending
    await transporter.verify();
    console.log('[send-reset-otp] SMTP verified, sending email...');

    const info = await transporter.sendMail({
      from:    `"FIP" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: 'Your FIP Password Reset OTP',
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#1A3C6E;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">🔐 Password Reset OTP</h1>
  </div>
  <div style="border:1px solid #E0E0E0;border-top:none;padding:28px;border-radius:0 0 10px 10px">
    <p style="color:#333;font-size:15px">Hi there,</p>
    <p style="color:#333;font-size:14px;line-height:1.6">
      We received a request to reset your FIP account password.
      Use the OTP below — it's valid for <strong>10 minutes</strong>.
    </p>
    <div style="background:#F4F6FB;border:2px dashed #1A3C6E;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
      <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1A3C6E;font-family:monospace">
        ${otp}
      </div>
      <p style="color:#888;font-size:12px;margin:8px 0 0">Valid for 10 minutes</p>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #E0E0E0;margin:20px 0"/>
    <p style="color:#aaa;font-size:11px;text-align:center">
      Federation of Indian Professionals ·
      <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a>
    </p>
  </div>
</div>`,
    });

    console.log('[send-reset-otp] Email sent, messageId:', info.messageId);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[send-reset-otp] Error:', err.message, err.code || '');
    // Give specific, actionable error messages
    if (err.code === 'EAUTH') {
      return res.status(500).json({ error: 'Email authentication failed — check Gmail App Password in Vercel env vars.' });
    }
    if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'Could not connect to email server. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
  }
}