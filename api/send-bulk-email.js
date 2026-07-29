// /api/send-bulk-email.js
// Sends a custom email to a list of selected members (admin only)
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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

  const { userId, subject, content, recipientIds, recipients: directRecipients } = req.body || {};

  if (!subject || !content || (!recipientIds?.length && !directRecipients?.length)) {
    return res.status(400).json({ error: 'subject, content and recipients are required' });
  }

  // Verify caller is admin
  const { data: caller } = await supabaseAdmin
    .from('profiles').select('role,is_admin').eq('id', userId).single();
  if (!caller || (caller.role !== 'admin' && !caller.is_admin)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  // Build recipients list — either from profile IDs or direct email/name pairs
  let recipients = directRecipients || [];
  if (recipientIds?.length) {
    const { data: profileRecipients, error } = await supabaseAdmin
      .from('profiles').select('full_name,email').in('id', recipientIds);
    if (error || !profileRecipients?.length) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }
    recipients = profileRecipients;
  }
  if (!recipients.length) {
    return res.status(400).json({ error: 'No valid recipients found' });
  }

  const transporter = getTransporter();
  const results = { sent: 0, failed: 0, errors: [] };

  for (const r of recipients) {
    if (!r.email) continue;
    try {
      const personalised = content
        .replace(/\{name\}/gi, r.full_name || 'Member')
        .replace(/\[name\]/gi, r.full_name || 'Member');

      await transporter.sendMail({
        from:    `"FIP – Federation of Indian Professionals" <${process.env.GMAIL_USER}>`,
        to:      r.email,
        subject: subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1A3C6E;padding:20px 28px;border-radius:10px 10px 0 0">
              <img src="https://www.fipin.org/logo.png" alt="FIP" height="40" style="filter:brightness(0) invert(1)"/>
            </div>
            <div style="border:1px solid #E0E0E0;border-top:none;padding:32px 28px;border-radius:0 0 10px 10px">
              ${personalised.replace(/\n/g, '<br/>')}
              <hr style="border:none;border-top:1px solid #E0E0E0;margin:28px 0"/>
              <p style="font-size:12px;color:#999;margin:0">
                Federation of Indian Professionals ·
                <a href="https://www.fipin.org" style="color:#1A3C6E">www.fipin.org</a>
              </p>
            </div>
          </div>`,
      });
      results.sent++;
    } catch (e) {
      results.failed++;
      results.errors.push({ email: r.email, error: e.message });
    }
  }

  return res.status(200).json({ ...results, total: recipients.length });
}