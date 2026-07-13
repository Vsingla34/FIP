// /api/send-reset-otp.js
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  // ── Guard: check env vars are set ──────────────────────────────
  const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GMAIL_USER    = process.env.GMAIL_USER;
  const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log('[send-reset-otp] MISSING ENV VARS — SUPABASE_URL:', !!SUPABASE_URL, 'SERVICE_KEY:', !!SERVICE_KEY);
    return res.status(500).json({ error: 'Server misconfiguration. Please contact support.' });
  }
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.log('[send-reset-otp] MISSING ENV VARS — GMAIL_USER:', !!GMAIL_USER, 'GMAIL_PASS:', !!GMAIL_PASS);
    return res.status(500).json({ error: 'Email service not configured. Please contact support.' });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalEmail = email.toLowerCase().trim();
  console.log('[send-reset-otp] Request for:', normalEmail, '| URL prefix:', SUPABASE_URL.slice(0, 30));

  try {
    // ── 1. Look up user in public.profiles ─────────────────────
    console.log('[send-reset-otp] Querying profiles...');
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', normalEmail)
      .single();

    if (profileErr) {
      console.log('[send-reset-otp] Profile query error:', profileErr.code, profileErr.message);
    }

    if (profileErr || !profile) {
      console.log('[send-reset-otp] No profile found for:', normalEmail);
      return res.status(404).json({
        error: 'No FIP account found with this email address.',
      });
    }

    console.log('[send-reset-otp] Found profile:', profile.id);

    // ── 2. Generate + store OTP ────────────────────────────────
    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    console.log('[send-reset-otp] Upserting OTP to DB...');
    const { error: upsertErr } = await supabaseAdmin
      .from('password_reset_otps')
      .upsert(
        { email: normalEmail, otp, expires_at: expiresAt, verified_token: null, used: false },
        { onConflict: 'email' }
      );

    if (upsertErr) {
      console.log('[send-reset-otp] DB upsert error:', upsertErr.message);
      return res.status(500).json({ error: 'Failed to generate OTP. Please try again.' });
    }

    console.log('[send-reset-otp] OTP stored, sending email...');

    // ── 3. Send via Gmail SMTP ─────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"FIP" <${GMAIL_USER}>`,
      to:      email,
      subject: 'Your FIP Password Reset OTP',
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#1A3C6E;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">🔐 Password Reset OTP</h1>
  </div>
  <div style="border:1px solid #E0E0E0;border-top:none;padding:28px;border-radius:0 0 10px 10px">
    <p style="color:#333;font-size:15px">Hi ${profile.full_name?.split(' ')[0] || 'there'},</p>
    <p style="color:#333;font-size:14px;line-height:1.6">
      Use the OTP below to reset your FIP account password.
      It expires in <strong>10 minutes</strong>.
    </p>
    <div style="background:#F4F6FB;border:2px dashed #1A3C6E;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
      <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1A3C6E;font-family:monospace">
        ${otp}
      </div>
      <p style="color:#888;font-size:12px;margin:8px 0 0">Valid for 10 minutes · Do not share this OTP</p>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6">
      If you did not request a password reset, please ignore this email.
      Your account remains secure.
    </p>
    <hr style="border:none;border-top:1px solid #E0E0E0;margin:20px 0"/>
    <p style="color:#aaa;font-size:11px;text-align:center">
      Federation of Indian Professionals ·
      <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a>
    </p>
  </div>
</div>`,
    });

    console.log('[send-reset-otp] Email sent successfully to:', email);
    return res.status(200).json({ success: true });

  } catch (err) {
    // Use console.log (not console.error) so it appears in Vercel info logs
    console.log('[send-reset-otp] CAUGHT ERROR:', err.message, '| code:', err.code || 'none');
    if (err.code === 'EAUTH') {
      return res.status(500).json({ error: 'Email auth failed — check GMAIL_APP_PASSWORD in Vercel env vars.' });
    }
    if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'Could not connect to email server. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
  }
}