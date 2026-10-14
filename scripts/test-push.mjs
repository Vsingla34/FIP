// Local test: node --env-file=.env scripts/test-push.mjs
// Sends a test push to every saved subscription (no admin check — local use only).
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
webpush.setVapidDetails('mailto:admin@fipin.org', process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const { data: subs, error } = await sb.from('push_subscriptions').select('*');
if (error) { console.error('DB error:', error.message); process.exit(1); }
console.log(`Found ${subs.length} subscription(s)`);

for (const s of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ title: 'New Event: Test Event', body: 'This is a test notification from FIP.', url: '/events' })
    );
    console.log('sent ✔', s.endpoint.slice(0, 50) + '…');
  } catch (e) { console.log('failed ✘', e.statusCode, e.body); }
}
