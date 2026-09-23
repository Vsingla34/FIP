import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';

// Haversine formula — same as the dashboard's check-in flow. Duplicated
// rather than imported/shared, since this component needs to be fully
// self-contained and mountable globally without depending on
// DashboardPage's internals.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function CheckInReminder() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [dueRsvp, setDueRsvp] = useState(null); // the RSVP row for today's un-checked-in event, or null
  const [stage, setStage] = useState('prompt'); // 'prompt' | 'locating' | 'ok' | 'too_far' | 'error'
  const [checkinResult, setCheckinResult] = useState(null); // { lat, lng, distance, radius }
  const [errorMsg, setErrorMsg] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Look for a registration, for an event happening today, that hasn't
  // been checked into yet. Runs once per browser session (not on every
  // SPA navigation) — dismissing shouldn't bring it back on the next
  // page click, but a fresh visit/reload is a fair time to ask again.
  useEffect(() => {
    if (!user) return;
    const dismissedKey = `checkin_reminder_dismissed_${user.id}`;
    if (sessionStorage.getItem(dismissedKey)) return;

    supabase
      .from('event_rsvps')
      .select('id, event_name, status, attended, events(title, event_date, event_end_date, venue_lat, venue_lng, checkin_radius_meters)')
      .eq('user_id', user.id)
      .eq('attended', false)
      .neq('status', 'cancelled')
      .then(({ data, error }) => {
        if (error || !data) return;
        const today = new Date();
        const match = data.find(r => {
          const ev = r.events;
          if (!ev?.event_date || !ev?.venue_lat || !ev?.venue_lng) return false;
          const start = new Date(ev.event_date); start.setHours(0,0,0,0);
          const end = new Date(ev.event_end_date || ev.event_date); end.setHours(23,59,59,999);
          return today >= start && today <= end;
        });
        if (match) setDueRsvp(match);
      });
  }, [user]);

  const dismiss = useCallback(() => {
    if (user) sessionStorage.setItem(`checkin_reminder_dismissed_${user.id}`, '1');
    setDueRsvp(null);
  }, [user]);

  const verifyLocation = () => {
    const ev = dueRsvp.events;
    if (!navigator.geolocation) {
      setStage('error'); setErrorMsg('Your browser does not support location services.');
      return;
    }
    setStage('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = distanceMeters(latitude, longitude, Number(ev.venue_lat), Number(ev.venue_lng));
        const radius = ev.checkin_radius_meters || 300;
        setCheckinResult({ lat: latitude, lng: longitude, distance: dist, radius });
        setStage(dist <= radius ? 'ok' : 'too_far');
      },
      (err) => {
        setStage('error');
        setErrorMsg(err.code === 1
          ? 'Location permission denied — please allow location access to check in.'
          : 'Could not get your location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const confirmCheckIn = async () => {
    if (!checkinResult || stage !== 'ok') return;
    setConfirming(true);
    const { error } = await supabase.from('event_rsvps').update({
      attended: true,
      checked_in_at: new Date().toISOString(),
      checkin_lat: checkinResult.lat,
      checkin_lng: checkinResult.lng,
      checkin_distance_meters: Math.round(checkinResult.distance),
    }).eq('id', dueRsvp.id);
    setConfirming(false);
    if (error) { showToast('Check-in failed: ' + error.message, true); return; }
    showToast('Checked in! 🎉');
    setDueRsvp(null);
  };

  if (!dueRsvp) return null;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(10,20,40,0.55)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
      onClick={() => stage === 'prompt' && dismiss()}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', borderRadius:'16px', maxWidth:'420px', width:'100%',
        padding:'28px 26px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', position:'relative',
      }}>
        {stage !== 'locating' && !confirming && (
          <button onClick={dismiss} style={{position:'absolute',top:'16px',right:'16px',background:'none',border:'none',fontSize:'18px',color:'var(--text-light)',cursor:'pointer'}}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}

        {stage === 'prompt' && (
          <>
            <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'16px',fontSize:'22px',color:'#fff'}}>
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div style={{fontSize:'18px',fontWeight:800,color:'var(--blue)',marginBottom:'6px'}}>You're registered for today's event!</div>
            <p style={{fontSize:'13.5px',color:'var(--text-muted)',marginBottom:'22px',lineHeight:1.6}}>
              <strong>{dueRsvp.events?.title || dueRsvp.event_name}</strong> is happening today. Check in now to confirm your attendance.
            </p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={verifyLocation}
                style={{flex:1,background:'var(--orange)',color:'#fff',border:'none',borderRadius:'8px',padding:'12px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                <i className="fa-solid fa-location-dot"></i> Check In Now
              </button>
              <button onClick={dismiss}
                style={{background:'transparent',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px 16px',fontWeight:600,fontSize:'14px',color:'var(--text-muted)',cursor:'pointer'}}>
                Maybe Later
              </button>
            </div>
          </>
        )}

        {stage === 'locating' && (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'26px',color:'var(--orange)',display:'block',marginBottom:'14px'}}></i>
            Getting your location…
          </div>
        )}

        {stage === 'error' && (
          <div style={{textAlign:'center',padding:'10px 0'}}>
            <i className="fa-solid fa-triangle-exclamation" style={{fontSize:'26px',color:'#DC2626',display:'block',marginBottom:'12px'}}></i>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'18px'}}>{errorMsg}</p>
            <button onClick={verifyLocation} style={{background:'var(--blue)',color:'#fff',border:'none',borderRadius:'8px',padding:'10px 18px',fontWeight:700,cursor:'pointer'}}>
              <i className="fa-solid fa-rotate-right"></i> Try Again
            </button>
          </div>
        )}

        {(stage === 'ok' || stage === 'too_far') && checkinResult && (
          <>
            {stage === 'ok' ? (
              <div style={{background:'var(--green-pale)',border:'1px solid #9ADDC3',borderRadius:'10px',padding:'14px 16px',marginBottom:'18px',display:'flex',alignItems:'center',gap:'10px'}}>
                <i className="fa-solid fa-circle-check" style={{color:'var(--green)',fontSize:'20px'}}></i>
                <div>
                  <div style={{fontSize:'13.5px',fontWeight:700,color:'#166534'}}>You're at the venue!</div>
                  <div style={{fontSize:'11.5px',color:'#166534'}}>{Math.round(checkinResult.distance)}m from the venue — within range.</div>
                </div>
              </div>
            ) : (
              <div style={{background:'#FEF3E2',border:'1px solid #F5C98E',borderRadius:'10px',padding:'14px 16px',marginBottom:'18px',display:'flex',alignItems:'center',gap:'10px'}}>
                <i className="fa-solid fa-triangle-exclamation" style={{color:'var(--orange)',fontSize:'20px'}}></i>
                <div>
                  <div style={{fontSize:'13.5px',fontWeight:700,color:'#92400E'}}>Too far from the venue</div>
                  <div style={{fontSize:'11.5px',color:'#92400E'}}>About {Math.round(checkinResult.distance)}m away — need to be within {checkinResult.radius}m.</div>
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:'10px'}}>
              {stage === 'ok' ? (
                <button onClick={confirmCheckIn} disabled={confirming}
                  style={{flex:1,background:'var(--orange)',color:'#fff',border:'none',borderRadius:'8px',padding:'12px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {confirming ? <><i className="fa-solid fa-spinner fa-spin"></i> Checking in…</> : <><i className="fa-solid fa-check"></i> Confirm Check-In</>}
                </button>
              ) : (
                <button onClick={verifyLocation}
                  style={{flex:1,background:'var(--blue)',color:'#fff',border:'none',borderRadius:'8px',padding:'12px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  <i className="fa-solid fa-rotate-right"></i> Refresh Location
                </button>
              )}
              <button onClick={dismiss} disabled={confirming}
                style={{background:'transparent',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px 16px',fontWeight:600,fontSize:'14px',color:'var(--text-muted)',cursor:'pointer'}}>
                Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}