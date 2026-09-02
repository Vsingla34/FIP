// /api/password-reset.js
// Handles all 3 password-reset steps via ?action= param
// action=send-otp | action=verify-otp | action=reset
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
  if (!action) return res.status(400).json({ error: 'action is required' });

  // ── STEP 1: Send OTP ──────────────────────────────────────────────
  if (action === 'send-otp') {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const normalEmail = email.toLowerCase().trim();

    let { data: profile } = await supabaseAdmin
      .from('profiles').select('id,full_name').eq('email', normalEmail).maybeSingle();

    if (!profile) {
      // Ghost user check: they may have started signing up but never
      // completed OTP verification, so an auth.users row exists with no
      // matching profiles row. Without this, they're permanently stuck —
      // password reset fails (no profile), and re-registering also fails
      // (Supabase rejects a duplicate email already in auth.users). Self-heal
      // by creating the missing profile now, using whatever they originally
      // entered at signup.
      const { data: ghostRows } = await supabaseAdmin.rpc('admin_find_auth_user_by_email', { p_email: normalEmail });
      const ghost = ghostRows?.[0];
      if (ghost) {
        const meta = ghost.raw_user_meta_data || {};
        const { data: healed, error: healErr } = await supabaseAdmin.from('profiles').insert({
          id: ghost.id,
          email: normalEmail,
          full_name: meta.full_name || 'FIP Member',
          phone: meta.phone || null,
          profession: meta.profession || null,
          account_type: meta.account_type || 'guest_user',
          membership_status: 'Inactive',
          role: 'member',
          profile_public: true,
        }).select('id,full_name').single();
        if (!healErr && healed) profile = healed;
        else if (healErr) console.error('Ghost-user self-heal failed:', healErr.message);
      }
    }

    if (!profile) return res.status(404).json({ error: 'No account found with that email.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('password_reset_otps').insert({
      email: normalEmail, otp, expires_at: expiresAt, used: false,
    });

    try {
      await getTransporter().sendMail({
        from: `"FIP" <${process.env.GMAIL_USER}>`,
        to: normalEmail,
        subject: 'Your FIP Password Reset Code',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#1A3C6E;padding:20px;border-radius:10px 10px 0 0;text-align:center">
            <h2 style="color:#fff;margin:0">Password Reset</h2>
          </div>
          <div style="border:1px solid #E0E0E0;padding:24px;border-radius:0 0 10px 10px">
            <p>Hi ${profile.full_name || 'there'},</p>
            <p>Your one-time password reset code is:</p>
            <div style="text-align:center;margin:24px 0">
              <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1A3C6E">${otp}</span>
            </div>
            <p style="color:#666;font-size:13px">This code expires in 15 minutes. Do not share it with anyone.</p>
          </div>
        </div>`,
      });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to send email: ' + e.message });
    }
  }

  // ── STEP 2: Verify OTP ────────────────────────────────────────────
  if (action === 'verify-otp') {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
    const normalEmail = email.toLowerCase().trim();

    const { data: row } = await supabaseAdmin.from('password_reset_otps')
      .select('*').eq('email', normalEmail).eq('used', false)
      .order('created_at', { ascending: false }).limit(1).single();

    if (!row) return res.status(400).json({ error: 'No active OTP found. Please request a new one.' });
    if (new Date() > new Date(row.expires_at)) return res.status(400).json({ error: 'OTP has expired.' });
    if (row.otp !== otp.trim()) return res.status(400).json({ error: 'Incorrect OTP.' });

    const verifiedToken = randomUUID();
    await supabaseAdmin.from('password_reset_otps')
      .update({ verified_token: verifiedToken, token_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
      .eq('id', row.id);

    return res.status(200).json({ verified_token: verifiedToken });
  }

  // ── STEP 3: Reset password ────────────────────────────────────────
  if (action === 'reset') {
    const { email, verified_token, new_password } = req.body || {};
    if (!email || !verified_token || !new_password)
      return res.status(400).json({ error: 'Email, token and new password are required.' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const normalEmail = email.toLowerCase().trim();
    const { data: row } = await supabaseAdmin.from('password_reset_otps')
      .select('*').eq('email', normalEmail).eq('verified_token', verified_token).eq('used', false).single();

    if (!row) return res.status(400).json({ error: 'Invalid session. Please restart.' });
    if (new Date() > new Date(row.token_expires_at)) return res.status(400).json({ error: 'Session expired. Please restart.' });

    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', normalEmail).single();
    if (!profile) return res.status(404).json({ error: 'Account not found.' });

    const goTrueRes = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ password: new_password }),
    });

    if (!goTrueRes.ok) {
      const b = await goTrueRes.json().catch(() => ({}));
      return res.status(500).json({ error: 'Password update failed: ' + (b?.msg || b?.error || 'Unknown') });
    }

    await supabaseAdmin.from('password_reset_otps').update({ used: true }).eq('id', row.id);
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action: ' + action });
}