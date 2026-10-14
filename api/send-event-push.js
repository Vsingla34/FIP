// /api/send-event-push.js
// Sends a Web Push notification about an event to all FIP members who have
// enabled notifications (admin only).
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, eventId } = req.body || {};
  if (!userId || !eventId) return res.status(400).json({ error: 'userId and eventId are required' });

  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  webpush.setVapidDetails(
    `mailto:${process.env.GMAIL_USER || 'admin@fipin.org'}`,
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Verify caller is admin
  const { data: caller } = await supabaseAdmin
    .from('profiles').select('role,is_admin').eq('id', userId).single();
  if (!caller || (caller.role !== 'admin' && !caller.is_admin)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { data: ev } = await supabaseAdmin
    .from('events').select('id,title,event_date,event_time,venue,city').eq('id', eventId).single();
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  // Members only: same definition the admin panel uses
  const { data: members } = await supabaseAdmin
    .from('profiles').select('id')
    .or('account_type.eq.fip_member,membership_status.eq.Active');
  const memberIds = (members || []).map(m => m.id);
  if (!memberIds.length) return res.status(200).json({ sent: 0, failed: 0, total: 0 });

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', memberIds);

  const when = [ev.event_date, ev.event_time].filter(Boolean).join(' · ');
  const where = ev.venue || ev.city || '';
  const payload = JSON.stringify({
    title: `New Event: ${ev.title}`,
    body:  [when, where].filter(Boolean).join(' — ') || 'Tap to view details and register.',
    url:   '/events',
  });

  const results = { sent: 0, failed: 0, total: (subs || []).length };
  const dead = [];
  await Promise.all((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      results.sent++;
    } catch (e) {
      results.failed++;
      if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id); // expired
    }
  }));
  if (dead.length) await supabaseAdmin.from('push_subscriptions').delete().in('id', dead);

  return res.status(200).json(results);
}
