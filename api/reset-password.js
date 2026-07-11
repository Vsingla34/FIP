// /api/reset-password.js
// Step 3: Validate verified_token → update password via Supabase Admin API
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email, verified_token, new_password } = req.body || {};
  if (!email || !verified_token || !new_password) {
    return res.status(400).json({ error: 'Email, token and new password are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const normalEmail = email.toLowerCase().trim();

    // Find row with matching verified_token
    const { data: row, error } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalEmail)
      .eq('verified_token', verified_token)
      .eq('used', false)
      .single();

    if (error || !row) {
      return res.status(400).json({ error: 'Invalid or expired session. Please restart the reset process.' });
    }

    // Check token expiry (5 minutes)
    if (new Date() > new Date(row.token_expires_at)) {
      return res.status(400).json({ error: 'Session expired. Please restart the reset process.' });
    }

    // Find the auth user by email
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const authUser = users?.find(u => u.email?.toLowerCase() === normalEmail);
    if (!authUser) return res.status(404).json({ error: 'User not found.' });

    // Update password via Admin API (no session needed)
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: new_password }
    );
    if (updateErr) throw updateErr;

    // Mark OTP row as used
    await supabaseAdmin.from('password_reset_otps')
      .update({ used: true })
      .eq('id', row.id);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ error: 'Password update failed: ' + err.message });
  }
}