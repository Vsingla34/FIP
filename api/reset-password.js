// /api/reset-password.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log('[reset-password] MISSING ENV VARS');
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { email, verified_token, new_password } = req.body || {};

  if (!email || !verified_token || !new_password) {
    return res.status(400).json({ error: 'Email, token and new password are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const normalEmail = email.toLowerCase().trim();
    console.log('[reset-password] Request for:', normalEmail);

    // ── 1. Validate verified_token ─────────────────────────────
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalEmail)
      .eq('verified_token', verified_token)
      .eq('used', false)
      .single();

    if (rowErr) {
      console.log('[reset-password] Token lookup error:', rowErr.message);
      return res.status(400).json({ error: 'Invalid or expired session. Please restart the reset process.' });
    }
    if (!row) {
      console.log('[reset-password] No matching token row found');
      return res.status(400).json({ error: 'Invalid session. Please restart the reset process.' });
    }
    if (new Date() > new Date(row.token_expires_at)) {
      console.log('[reset-password] Token expired at:', row.token_expires_at);
      return res.status(400).json({ error: 'Session expired (5 min limit). Please restart.' });
    }

    console.log('[reset-password] Token valid, fetching profile...');

    // ── 2. Get user id from profiles ──────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalEmail)
      .single();

    if (profileErr || !profile) {
      console.log('[reset-password] Profile not found:', profileErr?.message);
      return res.status(404).json({ error: 'Account not found.' });
    }

    console.log('[reset-password] Profile id:', profile.id, '— updating password via GoTrue admin API...');

    // ── 3. Update password — direct fetch to GoTrue admin API ──
    // Using fetch directly because supabase.auth.admin.updateUserById
    // returns empty error object ({}) for this project configuration.
    const goTrueRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${profile.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ password: new_password }),
      }
    );

    const goTrueBody = await goTrueRes.json().catch(() => ({}));
    console.log('[reset-password] GoTrue status:', goTrueRes.status, '| body:', JSON.stringify(goTrueBody).slice(0, 200));

    if (!goTrueRes.ok) {
      const errMsg = goTrueBody?.msg || goTrueBody?.message || goTrueBody?.error_description
        || goTrueBody?.error || JSON.stringify(goTrueBody);
      return res.status(500).json({ error: 'Password update failed: ' + errMsg });
    }

    console.log('[reset-password] Password updated successfully');

    // ── 4. Mark OTP as used ───────────────────────────────────
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', row.id);

    console.log('[reset-password] Done — password updated for:', normalEmail);
    return res.status(200).json({ success: true });

  } catch (err) {
    const msg = err?.message || JSON.stringify(err) || 'Unknown error';
    console.log('[reset-password] CAUGHT ERROR:', msg);
    return res.status(500).json({ error: 'Password update failed: ' + msg });
  }
}