// /event-update?token=UUID
// Pre-filled form for registrants to complete missing details
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const PROFESSIONS = [
  'Chartered Accountant','Company Secretary',
  'Cost Accountant','Advocate','Student','Other',
];

export default function EventUpdatePage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');

  const [status,  setStatus]  = useState('loading'); // loading | ready | expired | success | error
  const [rsvpId,  setRsvpId]  = useState(null);
  const [event,   setEvent]   = useState(null);
  const [form,    setForm]    = useState({
    full_name:'', email:'', phone:'', profession:'',
    designation:'', organisation:'', icai_membership_no:'', city:'',
  });
  const [saving,  setSaving]  = useState(false);
  const [errMsg,  setErrMsg]  = useState('');

  /* ── 1. Validate token + pre-fill form via secure API ─ */
  useEffect(() => {
    if (!token) { setStatus('expired'); return; }

    (async () => {
      try {
        const res = await fetch('/api/send-update-links?action=get-rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.status === 410) { setStatus('expired'); return; }  // used or expired
        if (res.status === 404) { setStatus('expired'); return; }  // invalid token
        if (!res.ok)            { setStatus('error');   return; }

        const { rsvp, event: ev } = await res.json();

        setRsvpId(rsvp.id);
        setEvent(ev);
        setForm({
          full_name:          rsvp.full_name          || '',
          email:              rsvp.email              || '',
          phone:              rsvp.phone              || '',
          profession:         rsvp.profession         || '',
          designation:        rsvp.designation        || '',
          organisation:       rsvp.organisation       || '',
          icai_membership_no: rsvp.icai_membership_no || '',
          city:               rsvp.city               || '',
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
  }, [token]);

  /* ── 2. Handle submit ───────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');

    // Validate all required fields
    const missing = [];
    if (!form.full_name.trim())          missing.push('Full Name');
    if (!form.email.trim())              missing.push('Email');
    if (!form.phone.trim())              missing.push('Mobile Number');
    if (!form.profession)                missing.push('Profession');
    if (!form.designation.trim())        missing.push('Designation');
    if (!form.organisation.trim())       missing.push('Organisation / Firm');
    if (!form.icai_membership_no.trim()) missing.push('ICAI / ICSI / ICMAI Membership No.');
    if (!form.city.trim())               missing.push('City');
    if (missing.length) {
      setErrMsg(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('event_rsvps')
      .update({
        full_name:          form.full_name.trim(),
        phone:              form.phone.trim(),
        profession:         form.profession,
        designation:        form.designation.trim(),
        organisation:       form.organisation.trim(),
        icai_membership_no: form.icai_membership_no.trim(),
        city:               form.city.trim(),
      })
      .eq('id', rsvpId);

    if (error) {
      setErrMsg('Update failed. Please try again or contact support.');
      setSaving(false);
      return;
    }

    // Mark token as used
    await supabase.from('event_rsvp_tokens')
      .update({ used: true }).eq('token', token);

    setSaving(false);
    setStatus('success');
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  /* ── UI states ──────────────────────────────────────── */
  if (status === 'loading') return (
    <div style={centreStyle}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'32px',color:'#1A3C6E',display:'block',marginBottom:'12px'}}></i>
      <p style={{color:'#666'}}>Loading your registration…</p>
    </div>
  );

  if (status === 'expired') return (
    <div style={{...centreStyle, maxWidth:'440px'}}>
      <div style={{fontSize:'48px',marginBottom:'16px'}}>🔗</div>
      <h2 style={{color:'#1A3C6E',marginBottom:'8px'}}>Link Expired or Invalid</h2>
      <p style={{color:'#666',lineHeight:1.7,marginBottom:'20px'}}>
        This update link has already been used or has expired (links are valid for 7 days).
        Please contact FIP if you still need to update your registration.
      </p>
      <a href="mailto:fippresidentoffice@gmail.com"
        style={{display:'inline-block',background:'#1A3C6E',color:'#fff',padding:'12px 28px',borderRadius:'8px',textDecoration:'none',fontWeight:700}}>
        Contact FIP
      </a>
    </div>
  );

  if (status === 'success') return (
    <div style={{...centreStyle, maxWidth:'440px'}}>
      <div style={{fontSize:'56px',marginBottom:'16px'}}>✅</div>
      <h2 style={{color:'#15803D',marginBottom:'8px'}}>Registration Updated!</h2>
      <p style={{color:'#555',lineHeight:1.7,marginBottom:'24px'}}>
        Your registration details have been saved. Your seat for{' '}
        <strong>{event?.title}</strong> is confirmed.
      </p>
      <div style={{background:'#F0FFF4',border:'1px solid #86EFAC',borderRadius:'10px',padding:'16px',textAlign:'left',marginBottom:'20px'}}>
        <div style={{fontWeight:700,color:'#15803D',marginBottom:'8px'}}>What you updated:</div>
        {[
          ['Name',           form.full_name],
          ['Membership No.', form.icai_membership_no],
          ['Profession',     form.profession],
          ['City',           form.city],
        ].map(([k,v]) => v && (
          <div key={k} style={{fontSize:'13px',color:'#166534',marginBottom:'4px'}}>
            <strong>{k}:</strong> {v}
          </div>
        ))}
      </div>
      <a href="https://www.fipin.org"
        style={{display:'inline-block',background:'#1A3C6E',color:'#fff',padding:'11px 28px',borderRadius:'8px',textDecoration:'none',fontWeight:700}}>
        Visit FIP Website
      </a>
    </div>
  );

  if (status === 'error') return (
    <div style={centreStyle}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>❌</div>
      <h2 style={{color:'#C0392B'}}>Something went wrong</h2>
      <p style={{color:'#666'}}>Please contact <a href="mailto:fippresidentoffice@gmail.com">fippresidentoffice@gmail.com</a></p>
    </div>
  );

  /* ── Main form ─────────────────────────────────── */
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
    : null;

  return (
    <div style={{minHeight:'100vh',background:'#F4F6FB',padding:'40px 16px'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <a href="/" style={{display:'inline-block',marginBottom:'20px'}}>
            <img src="/logo.png" alt="FIP" style={{height:'48px'}} onError={e=>{e.target.style.display='none'}}/>
          </a>
          <h1 style={{fontSize:'22px',fontWeight:900,color:'#1A3C6E',marginBottom:'6px'}}>
            Complete Your Registration
          </h1>
          {event && (
            <div style={{background:'#1A3C6E',color:'#fff',borderRadius:'10px',padding:'12px 20px',textAlign:'left',marginTop:'14px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'rgba(255,208,155,0.8)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>Event</div>
              <div style={{fontWeight:800,fontSize:'16px'}}>{event.title}</div>
              {eventDate && (
                <div style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'3px'}}>
                  📅 {eventDate}{event.event_time ? ` · ${event.event_time}` : ''}{event.location ? ` · ${event.location}` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info banner */}
        <div style={{background:'#FFF5E6',border:'1px solid #F2C06E',borderRadius:'10px',padding:'12px 16px',marginBottom:'20px',fontSize:'13px',color:'#92400E',lineHeight:1.6}}>
          <strong>👋 Hi {form.full_name?.split(' ')[0] || 'there'}!</strong> We've pre-filled your existing details below.
          Please verify everything and fill in any missing fields — especially your <strong>Membership Number</strong>.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{background:'#fff',borderRadius:'16px',padding:'28px',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} name="full_name" type="text" value={form.full_name}
                onChange={handleChange} placeholder="Your full name" required/>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Email</label>
              <input style={{...inputStyle, background:'#F4F6FB', color:'#888'}} name="email"
                type="email" value={form.email} disabled title="Email cannot be changed"/>
            </div>
          </div>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Mobile Number *</label>
              <input style={inputStyle} name="phone" type="tel" value={form.phone}
                onChange={handleChange} placeholder="+91 XXXXX XXXXX" required/>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Profession *</label>
              <select style={inputStyle} name="profession" value={form.profession}
                onChange={handleChange} required>
                <option value="">Select profession</option>
                {PROFESSIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Highlighted ICAI field */}
          <div style={{...groupStyle, marginBottom:'16px'}}>
            <label style={{...labelStyle, color:'#C05621'}}>
              ICAI / ICSI / ICMAI Membership No. *
              {!form.icai_membership_no && (
                <span style={{background:'#FEF3C7',color:'#92400E',fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',marginLeft:'8px'}}>
                  MISSING — please fill
                </span>
              )}
            </label>
            <input
              style={{
                ...inputStyle,
                border: !form.icai_membership_no ? '2px solid #F26522' : '1.5px solid #CBD5E1',
                background: !form.icai_membership_no ? '#FFF5E6' : '#fff',
              }}
              name="icai_membership_no" type="text" value={form.icai_membership_no}
              onChange={handleChange} placeholder="e.g. 123456 / A12345 / M12345" required/>
          </div>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Designation *</label>
              <input style={inputStyle} name="designation" type="text" value={form.designation}
                onChange={handleChange} placeholder="e.g. Partner, FCA" required/>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Organisation / Firm *</label>
              <input style={inputStyle} name="organisation" type="text" value={form.organisation}
                onChange={handleChange} placeholder="Firm or Company name" required/>
            </div>
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>City *</label>
            <input style={inputStyle} name="city" type="text" value={form.city}
              onChange={handleChange} placeholder="Your city" required/>
          </div>

          {errMsg && (
            <div style={{background:'#FEE2E2',border:'1px solid #F5BDBA',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',color:'#C0392B',fontSize:'13px',fontWeight:600}}>
              ⚠️ {errMsg}
            </div>
          )}

          <button type="submit" disabled={saving}
            style={{width:'100%',background:saving?'#94A3B8':'#1A3C6E',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',fontWeight:800,fontSize:'15px',cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',transition:'background .2s'}}>
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</>
              : <><i className="fa-solid fa-circle-check"></i> Confirm &amp; Update Registration</>}
          </button>

          <p style={{textAlign:'center',fontSize:'11px',color:'#94A3B8',marginTop:'12px',marginBottom:0}}>
            🔒 Your information is secure and used only for event registration.
          </p>
        </form>

      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const centreStyle = { minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'32px 16px' };
const rowStyle    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'16px' };
const groupStyle  = { display:'flex', flexDirection:'column', gap:'5px' };
const labelStyle  = { fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.5px' };
const inputStyle  = { border:'1.5px solid #CBD5E1', borderRadius:'8px', padding:'10px 14px', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit', transition:'border .15s' };