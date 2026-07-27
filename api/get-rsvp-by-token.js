// /api/get-rsvp-by-token.js
// Validates a token and returns the registrant's data (server-side, service role)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token is required' });

  // 1. Validate the token
  const { data: tokenRow } = await supabaseAdmin
    .from('event_rsvp_tokens')
    .select('id, rsvp_id, event_id, used, expires_at')
    .eq('token', token)
    .single();

  if (!tokenRow)                               return res.status(404).json({ error: 'invalid' });
  if (tokenRow.used)                           return res.status(410).json({ error: 'used' });
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(410).json({ error: 'expired' });

  // 2. Fetch registrant details
  const { data: rsvp } = await supabaseAdmin
    .from('event_rsvps')
    .select('id, full_name, email, phone, profession, designation, organisation, icai_membership_no, city')
    .eq('id', tokenRow.rsvp_id)
    .single();

  if (!rsvp) return res.status(404).json({ error: 'Registration not found' });

  // 3. Fetch event details
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, event_date, event_time, location')
    .eq('id', tokenRow.event_id)
    .single();

  return res.status(200).json({ rsvp, event });
}