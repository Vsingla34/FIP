import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator &&
  'PushManager' in window && 'Notification' in window;

async function subscribeUser(userId) {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    });
  }
  const j = sub.toJSON();
  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
    { onConflict: 'endpoint' }
  );
}

/* Asks logged-in members once (after login) to enable event notifications.
   If permission was already granted, silently re-syncs the subscription. */
export default function PushPrompt() {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);

  const isMember = !!profile && (profile.account_type === 'fip_member' || profile.membership_status === 'Active');

  useEffect(() => {
    if (!user || !isMember || !supported() || !PUBLIC_KEY) return;
    if (Notification.permission === 'granted') { subscribeUser(user.id).catch(() => {}); return; }
    if (Notification.permission === 'denied') return;
    if (localStorage.getItem('fip_push_dismissed')) return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [user, isMember]);

  if (!show) return null;

  const enable = async () => {
    setShow(false);
    const perm = await Notification.requestPermission();
    if (perm === 'granted') subscribeUser(user.id).catch(() => {});
  };
  const dismiss = () => { localStorage.setItem('fip_push_dismissed', '1'); setShow(false); };

  return (
    <div style={{
      position:'fixed', left:'50%', bottom:'24px', transform:'translateX(-50%)', zIndex:9999,
      width:'min(92vw, 420px)', background:'#fff', borderRadius:'14px', padding:'18px 20px',
      boxShadow:'0 12px 40px rgba(0,0,0,.25)', borderLeft:'5px solid #1A3C6E',
      fontFamily:'inherit',
    }}>
      <div style={{fontWeight:700, color:'#1A3C6E', marginBottom:'4px'}}>
        <i className="fa-solid fa-bell" style={{marginRight:'8px'}}></i>Get event alerts
      </div>
      <div style={{fontSize:'14px', color:'#555', marginBottom:'14px'}}>
        Be the first to know when FIP announces a new event — right on your phone.
      </div>
      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
        <button onClick={dismiss} style={{background:'none', border:'none', color:'#777', cursor:'pointer'}}>Not now</button>
        <button onClick={enable} style={{background:'#1A3C6E', color:'#fff', border:'none', borderRadius:'8px', padding:'9px 18px', cursor:'pointer', fontWeight:600}}>
          Enable
        </button>
      </div>
    </div>
  );
}
