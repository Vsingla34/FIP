// /api/verify-reset-otp.js
// Step 2: Validate the 6-digit OTP → return a short-lived verified_token
import { createClient } from '@supabase/supabase-js';
import { randomUUID }   from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  try {
    const normalEmail = email.toLowerCase().trim();

    // Find the latest unused OTP for this email
    const { data: row, error } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !row) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new one.' });
    }

    // Check expiry
    if (new Date() > new Date(row.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check OTP matches
    if (row.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    }

    // Issue a verified_token valid for 5 minutes
    const verifiedToken    = randomUUID();
    const tokenExpiresAt   = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabaseAdmin.from('password_reset_otps')
      .update({ verified_token: verifiedToken, token_expires_at: tokenExpiresAt })
      .eq('id', row.id);

    return res.status(200).json({ verified_token: verifiedToken });

  } catch (err) {
    console.error('[verify-reset-otp]', err);
    return res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
}