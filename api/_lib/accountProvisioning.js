
import { randomBytes } from 'crypto';


export async function findOrCreateAccount(supabaseAdmin, { email, full_name, phone }) {
  const normalEmail = email.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from('profiles').select('id').eq('email', normalEmail).maybeSingle();
  if (existing) return { userId: existing.id, isNewAccount: false };

  // Random, never-shown password — nobody is meant to know or use it. The
  // account only becomes usable once they set their own via Forgot Password.
  const placeholderPassword = randomBytes(24).toString('hex');

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalEmail,
    password: placeholderPassword,
    email_confirm: true, // admin is vouching for them — they didn't self-verify by email
    user_metadata: { full_name: full_name || '' },
  });
  if (createErr) throw new Error('Account creation failed: ' + createErr.message);

  const userId = created.user.id;

  // Ensure a profiles row exists. If a DB trigger already creates one on
  // auth.users insert, this upsert just fills in what we know on top of it.
  const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: normalEmail,
    full_name: full_name || null,
    phone: phone || null,
    account_type: 'member',
    membership_status: 'None',
  }, { onConflict: 'id' });
  if (profileErr) {
    // Not fatal — the auth user exists and can still set a password and log
    // in — but worth knowing about if profile fields look incomplete later.
    console.error('accountProvisioning: profile upsert failed for', userId, profileErr.message);
  }

  return { userId, isNewAccount: true };
}

/**
 * Email them, pointing at the site's existing Forgot Password flow — that
 * flow generates its own OTP correctly when they actually use it.
 */
export async function sendAccountSetupEmail(getTransporter, { email, full_name, isNewAccount, contextLine }) {
  const normalEmail = email.trim().toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fipin.org';

  const subject = isNewAccount
    ? "You're registered with FIP — set your password to access your account"
    : 'Your registration is confirmed';

  await getTransporter().sendMail({
    from: `"FIP" <${process.env.GMAIL_USER}>`,
    to: normalEmail,
    subject,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#1A3C6E;padding:20px;border-radius:10px 10px 0 0;text-align:center">
        <h2 style="color:#fff;margin:0">Welcome to FIP</h2>
      </div>
      <div style="border:1px solid #E0E0E0;padding:24px;border-radius:0 0 10px 10px">
        <p>Hi ${full_name || 'there'},</p>
        <p>${contextLine || 'An FIP admin has registered you.'}</p>
        ${isNewAccount ? `
        <p>An account has been created for you using this email address. To access your
           dashboard, set your password:</p>
        <ol style="color:#333;line-height:1.9">
          <li>Go to <a href="${appUrl}" style="color:#1A3C6E;font-weight:700">fipin.org</a></li>
          <li>Click <strong>Sign In → Forgot Password</strong></li>
          <li>Enter your email: <strong>${normalEmail}</strong></li>
          <li>You'll receive a one-time code — enter it and choose a password</li>
        </ol>
        ` : `<p>You already have an FIP account under this email — sign in as usual to see it on your dashboard.</p>`}
      </div>
    </div>`,
  });
}