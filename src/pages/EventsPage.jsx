import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useRazorpay } from '../hooks/useRazorpay.js';
import { supabase } from '../lib/supabase.js';
import FlyerGenerator from '../components/FlyerGenerator.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'Every Sunday';
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0)  return null;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days left`;
}

const TYPE_STYLE = {
  Physical: { cls:'evt-physical', icon:'fa-location-dot' },
  Virtual:  { cls:'evt-virtual',  icon:'fa-video' },
  Hybrid:   { cls:'evt-hybrid',   icon:'fa-circle-nodes' },
};

export default function EventsPage() {
  const { user, profile } = useAuth();
  const { showToast, openModal } = useApp();
  const { pay } = useRazorpay();

  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpOpen, setRsvpOpen] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [flyerEvent, setFlyerEvent]   = useState(null); // event to show flyer for after registration
  const [form, setForm] = useState({
    full_name:'', email:'', phone:'', profession:'',
    designation:'', organisation:'', icai_membership_no:'', city:'',
    is_volunteer: false,
    wants_gst: false, gst_number:'', gst_company_name:'', gst_address:'',
  });

  useEffect(() => {
    supabase.from('events').select('*')
      .in('status', ['upcoming','ongoing'])
      .order('event_date', { ascending: true, nullsFirst: false })
      .then(async ({ data }) => {
        if (!data?.length) { setLoading(false); return; }
        // Fetch registration counts for each event
        const counts = await Promise.all(
          data.map(ev =>
            supabase.rpc('get_event_registration_count', { p_event_id: ev.id })
              .then(({ data: count }) => ({ id: ev.id, count: count || 0 }))
          )
        );
        const countMap = Object.fromEntries(counts.map(c => [c.id, c.count]));
        const isMember = false; // checked per-user below
        const allEvs = data.map(ev => ({ ...ev, registered_count: countMap[ev.id] || 0 }));
        setEvents(allEvs); // store all; filter in render using profile
        setLoading(false);
      });
  }, []);

  /* Fetch events user already registered for */
  useEffect(() => {
    if (!user) return;
    supabase.from('event_rsvps').select('event_id')
      .eq('email', user.email)
      .then(({ data }) => {
        if (data?.length) setRegisteredEventIds(new Set(data.map(r => r.event_id).filter(Boolean)));
      });
  }, [user]);

  // Pre-fill form from profile when opening RSVP
  const openRsvp = (event) => {
    setForm({
      full_name:          profile?.full_name || user?.user_metadata?.full_name || '',
      email:              user?.email || '',
      phone:              profile?.phone || '',
      profession:         profile?.profession || '',
      designation:        profile?.designation || '',
      organisation:       profile?.organisation || '',
      icai_membership_no: profile?.icai_membership_no || '',
      city:               profile?.city || '',
      is_volunteer:       false,
    });
    setSubmitted(false);
    setRsvpOpen(event);
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  /* ── Save registration to DB ── */
  const saveRsvp = async () => {
    const { error } = await supabase.from('event_rsvps').insert({
      event_id:           rsvpOpen.id,
      user_id:            user?.id || null,
      full_name:          form.full_name.trim(),
      email:              form.email.trim(),
      phone:              form.phone.trim() || null,
      profession:         form.profession || null,
      designation:        form.designation.trim() || null,
      organisation:       form.organisation.trim() || null,
      icai_membership_no: form.icai_membership_no.trim() || null,
      city:               form.city.trim() || null,
      is_volunteer:       form.is_volunteer,
      event_name:         rsvpOpen.title,
      status:             'confirmed',
      gst_number:         form.wants_gst ? form.gst_number.trim() || null : null,
      gst_company_name:   form.wants_gst ? form.gst_company_name.trim() || null : null,
      gst_address:        form.wants_gst ? form.gst_address.trim() || null : null,
    });
    return error;
  };

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);

    // ── Strict validation: ALL fields required ─────────────────────────────
    const missing = [];
    if (!form.full_name.trim())          missing.push('Full Name');
    if (!form.email.trim())              missing.push('Email');
    if (!form.phone.trim())              missing.push('Mobile Number');
    if (!form.profession)                missing.push('Profession');
    if (!form.designation.trim())        missing.push('Designation');
    if (!form.organisation.trim())       missing.push('Organisation / Firm');
    if (!form.icai_membership_no.trim()) missing.push('ICAI / ICSI / ICMAI Membership No.');
    if (!form.city.trim())               missing.push('City');
    if (missing.length > 0) {
      setSubmitting(false);
      showToast(`Please fill in: ${missing.join(', ')}`, true);
      return;
    }

    // ── Profession eligibility check ─────────────────────────────────────
    const allowed = rsvpOpen?.allowed_professions;
    if (allowed?.length && !allowed.includes(form.profession)) {
      setSubmitting(false);
      showToast(`This event is open to: ${allowed.join(', ')} only.`, true);
      return;
    }

    // ── Capacity check ───────────────────────────────────────────────────
    if (rsvpOpen?.capacity) {
      const { count } = await supabase.from('event_rsvps')
        .select('id', { count: 'exact', head: true }).eq('event_id', rsvpOpen.id);
      if ((count || 0) >= rsvpOpen.capacity) {
        setSubmitting(false);
        showToast('Sorry, this event is now fully booked!', true);
        return;
      }
    }

    const isPaid = rsvpOpen?.price > 0 && !rsvpOpen?.is_free;

    if (isPaid) {
      if (!user) {
        setSubmitting(false);
        setRsvpOpen(null);
        openModal('register');
        showToast('Please create an account to register for paid events.', true);
        return;
      }

      // Capture event + form data NOW before closing modal (avoids stale closure)
      const capturedEvent = { ...rsvpOpen };
      const capturedForm  = { ...form };

      setRsvpOpen(null);    // close modal
      setSubmitting(false);

      await pay({
        purchaseType: 'event',
        itemName:     capturedEvent.title,
        itemRefId:    capturedEvent.id,
        onSuccess: async () => {
          // Use captured data — not stale rsvpOpen/form
          const { error } = await supabase.from('event_rsvps').insert({
            event_id:           capturedEvent.id,
            event_name:         capturedEvent.title,
            user_id:            user?.id || null,
            full_name:          capturedForm.full_name.trim(),
            email:              capturedForm.email.trim(),
            phone:              capturedForm.phone?.trim() || null,
            profession:         capturedForm.profession || null,
            designation:        capturedForm.designation?.trim() || null,
            organisation:       capturedForm.organisation?.trim() || null,
            icai_membership_no: capturedForm.icai_membership_no?.trim() || null,
            city:               capturedForm.city?.trim() || null,
            is_volunteer:       capturedForm.is_volunteer,
            status:             'confirmed',
          });
          if (error && error.code !== '23505') {
            showToast('Payment done but RSVP save failed. Please contact support.', true);
          } else {
            setRegisteredEventIds(prev => new Set([...prev, capturedEvent.id]));
            showToast(`You're registered for ${capturedEvent.title}! 🎉`);
            // Send paid confirmation email
            fetch('/api/send-event-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name:               capturedForm.full_name,
                email:              capturedForm.email,
                eventTitle:         capturedEvent.title,
                eventDate:          capturedEvent.event_date,
                eventTime:          capturedEvent.event_time,
                eventLocation:      capturedEvent.location,
                eventType:          capturedEvent.event_type,
                isPaid:             true,
                amount:             capturedEvent.price,
                zoomLink:           capturedEvent.zoom_link,
                whatsappGroupLink:  capturedEvent.whatsapp_group_link,
                gstNumber:          capturedForm.wants_gst ? capturedForm.gst_number : null,
                gstCompanyName:     capturedForm.wants_gst ? capturedForm.gst_company_name : null,
                gstAddress:         capturedForm.wants_gst ? capturedForm.gst_address : null,
              }),
            }).catch(() => {});
            // Show flyer if enabled
            if (capturedEvent.enable_flyer !== false) {
              setTimeout(() => setFlyerEvent({ event: capturedEvent, name: capturedForm.full_name }), 400);
            }
          }
        },
      });
      return;
    }

    // Free event — save directly
    const error = await saveRsvp();
    setSubmitting(false);

    if (error) {
      setSubmitting(false);
      if (error.code === '23505' || error.message?.includes('unique')) {
        showToast('You have already registered for this event!', true);
        setRegisteredEventIds(prev => new Set([...prev, rsvpOpen.id]));
        setRsvpOpen(null);
      } else if (error.message?.includes('EVENT_FULL')) {
        showToast('Sorry, this event is now fully booked!', true);
        // Refresh event counts so card shows Fully Booked
        setEvents(prev => prev.map(ev => ev.id === rsvpOpen.id
          ? { ...ev, registered_count: ev.capacity }
          : ev
        ));
        setRsvpOpen(null);
      } else {
        showToast('Registration failed: ' + (error.message || 'Please try again.'), true);
      }
      return;
    }

    // Send confirmation email (non-blocking)
    fetch('/api/send-event-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:               form.full_name,
        email:              form.email,
        eventTitle:         rsvpOpen.title,
        eventDate:          rsvpOpen.event_date,
        eventTime:          rsvpOpen.event_time,
        eventLocation:      rsvpOpen.location,
        eventType:          rsvpOpen.event_type,
        isPaid:             false,
        zoomLink:           rsvpOpen.zoom_link,
        whatsappGroupLink:  rsvpOpen.whatsapp_group_link,
      }),
    }).catch(() => {});

    // Update registered count on card
    setEvents(prev => prev.map(ev => ev.id === rsvpOpen.id
      ? { ...ev, registered_count: (ev.registered_count || 0) + 1 }
      : ev
    ));
    setRegisteredEventIds(prev => new Set([...prev, rsvpOpen.id]));
    // Show flyer if event has it enabled
    if (rsvpOpen.enable_flyer !== false) {
      const captured = { ...rsvpOpen };
      const capturedName = form.full_name;
      setSubmitted(true);
      setTimeout(() => { setRsvpOpen(null); setFlyerEvent({ event: captured, name: capturedName }); }, 600);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <>
      {/* Flyer popup after event registration */}
      {flyerEvent && (
        <FlyerGenerator
          name={flyerEvent.name}
          flyerTemplateUrl={flyerEvent.event.flyer_template_url}
          onClose={() => setFlyerEvent(null)}
        />
      )}
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Events</span></div>
          <h1>Events &amp; Programmes</h1>
          <p>Events are at the heart of the Federation of Indian Professionals (FIP), bringing together finance, legal, and business professionals through conferences, seminars, workshops, networking sessions, leadership forums, and community initiatives. Every event is designed to inspire learning, encourage meaningful connections, and create opportunities for collaboration, professional excellence, and collective growth.</p>
        </div>
      </div>

      {/* ── RECENT HIGHLIGHTS ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="shflex" style={{marginBottom:'32px'}}>
            <div>
              <span className="eyebrow">Recent Highlights</span>
              <h2 className="section-heading">Past <span>Events</span></h2>
              <p className="section-sub">Explore highlights from our recent events that brought together distinguished speakers, industry leaders, and professionals from across the country. These moments reflect FIP's commitment to knowledge sharing, networking, and creating lasting professional impact.</p>
            </div>
          </div>
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
            <i className="fa-solid fa-images" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
            <p style={{fontSize:'14px'}}>Event highlights and photo galleries coming soon.</p>
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS ── */}
      <section className="section">
        <div className="container">
          <div className="shflex" style={{marginBottom:'32px'}}>
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2 className="section-heading">Upcoming <span>Events</span></h2>
              <p className="section-sub">FIP hosts physical meet-ups, heritage visits, webinars, and multi-city summits.</p>
            </div>
          </div>

          {loading ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',display:'block',marginBottom:'12px',color:'var(--orange)'}}></i>
              Loading events…
            </div>
          ) : events.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-calendar-xmark" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
              No upcoming events right now. Check back soon!
            </div>
          ) : (
            <div className="event-grid">
              {events.filter(ev => !ev.is_private || profile?.role==='admin' || profile?.is_admin || profile?.membership_status==='Active' || profile?.account_type==='fip_member').map(ev => {
                const ts = TYPE_STYLE[ev.event_type] || TYPE_STYLE.Physical;
                const dl = daysLeft(ev.event_date);
                return (
                  <div className="ev-light" key={ev.id}>
                    {/* Event banner image if provided */}
                    {ev.image_url && (
                      <div style={{margin:'-20px -20px 16px',borderRadius:'12px 12px 0 0',overflow:'hidden',height:'160px'}}>
                        <img src={ev.image_url} alt={ev.title}
                          style={{width:'100%',height:'100%',objectFit:'cover'}}
                          onError={e => e.target.closest('div').style.display='none'}/>
                      </div>
                    )}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
                      <div className="ev-date">
                        <i className="fa-regular fa-calendar"></i> {formatDate(ev.event_date)}
                        {ev.event_time && <span style={{marginLeft:'6px',opacity:.7}}>· {ev.event_time}</span>}
                      </div>
                      {dl && <span style={{fontSize:'11px',fontWeight:700,color:'var(--orange)',background:'var(--orange-pale)',border:'1px solid #F5C4A8',padding:'2px 8px',borderRadius:'10px'}}>{dl}</span>}
                    </div>
                    <div className="ev-title">{ev.title}</div>
                    <div className="ev-desc">{ev.description}</div>

                    {/* Tags */}
                    {ev.tags?.length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px',margin:'10px 0'}}>
                        {ev.tags.map((t,i) => (
                          <span key={i} style={{fontSize:'10px',fontWeight:600,color:'var(--blue-mid)',background:'var(--blue-pale)',border:'1px solid #C0CDE8',padding:'2px 8px',borderRadius:'10px'}}>{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="ev-footer">
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
                        <span className={`ev-type ${ts.cls}`}>
                          <i className={`fa-solid ${ts.icon}`}></i> {ev.event_type}
                          {ev.city && ` · ${ev.city}`}
                        </span>
                        {ev.is_private && (
                          <span style={{fontSize:'10px',background:'rgba(242,101,34,0.1)',color:'var(--orange)',padding:'2px 8px',borderRadius:'10px',fontWeight:700,border:'1px solid rgba(242,101,34,0.3)'}}>
                            <i className="fa-solid fa-lock" style={{marginRight:'4px'}}></i>Members Only
                          </span>
                        )}
                        {ev.capacity && (
                          <span style={{fontSize:'11px',color:'var(--text-light)'}}>
                            <i className="fa-solid fa-users" style={{marginRight:'3px'}}></i>{(ev.registered_count||0)>=(ev.capacity||999999)?'Fully Booked':`${ev.registered_count||0}/${ev.capacity} seats filled`}
                          </span>
                        )}
                        {ev.is_free
                          ? <span style={{fontSize:'11px',fontWeight:700,color:'var(--green)'}}>Free</span>
                          : <span style={{fontSize:'11px',fontWeight:700,color:'var(--blue)'}}>₹{ev.price}</span>
                        }
                      </div>
                      {(() => {
                        const isFull = ev.capacity && (ev.registered_count||0) >= ev.capacity;
                        const isReg  = registeredEventIds.has(ev.id);
                        return (
                          <button
                            className="ev-rsvp-btn"
                            style={{
                              background: isReg ? 'var(--green)' : isFull ? '#6B7280' : ev.price>0&&!ev.is_free ? 'var(--orange)' : undefined,
                              cursor: isReg || isFull ? 'default' : 'pointer',
                              opacity: isFull && !isReg ? 0.8 : 1,
                            }}
                            onClick={() => { if (!isReg && !isFull) openRsvp(ev); }}>
                            {isReg
                              ? <><i className="fa-solid fa-circle-check" style={{marginRight:'5px'}}></i>Seat Booked</>
                              : isFull
                              ? <><i className="fa-solid fa-ban" style={{marginRight:'5px'}}></i>Fully Booked</>
                              : ev.price > 0 && !ev.is_free
                              ? <><i className="fa-solid fa-lock"></i> Book Seat — ₹{Number(ev.price).toLocaleString('en-IN')}</>
                              : <><i className="fa-solid fa-calendar-check"></i> Book Seat — Free</>
                            }
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          REGISTRATION MODAL
      ══════════════════════════════════ */}
      {rsvpOpen && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:'560px'}}>
            {!submitting && (
              <button className="modal-close" onClick={() => setRsvpOpen(null)}>&#x2715;</button>
            )}

            {submitted || registeredEventIds.has(rsvpOpen?.id) ? (
              /* ── Success ── */
              <div style={{textAlign:'center',padding:'24px 8px'}}>
                <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'var(--green-pale)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:'26px',color:'var(--green)'}}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="modal-title">Registration Confirmed!</div>
                <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'8px'}}>
                  You're registered for <strong>{rsvpOpen.title}</strong>.
                  {rsvpOpen.event_date && <> We'll see you on <strong>{formatDate(rsvpOpen.event_date)}</strong>.</>}
                </p>
                {form.is_volunteer && (
                  <div style={{background:'var(--orange-pale)',border:'1px solid #F5C4A8',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'var(--orange)',marginBottom:'16px'}}>
                    <i className="fa-solid fa-hand-holding-heart" style={{marginRight:'6px'}}></i>
                    Thank you for volunteering! Our team will contact you soon.
                  </div>
                )}
                <button className="btn btn-outline-blue btn-sm" onClick={() => setRsvpOpen(null)}>Close</button>
              </div>
            ) : (
              <>
                {/* ── Event info ── */}
                <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'20px'}}>
                  <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>{rsvpOpen.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                    <span><i className="fa-regular fa-calendar" style={{marginRight:'4px'}}></i>{formatDate(rsvpOpen.event_date)}</span>
                    {rsvpOpen.event_time && <span><i className="fa-regular fa-clock" style={{marginRight:'4px'}}></i>{rsvpOpen.event_time}</span>}
                    {rsvpOpen.venue && <span><i className="fa-solid fa-location-dot" style={{marginRight:'4px'}}></i>{rsvpOpen.venue}</span>}
                  </div>
                </div>

                <div className="modal-title" style={{marginBottom:'4px'}}>Register for this Event</div>
                <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'10px'}}>
                  All fields marked * are required.
                </p>
                {rsvpOpen?.allowed_professions?.length > 0 && (
                  <div style={{background:'rgba(242,101,34,0.08)',border:'1px solid rgba(242,101,34,0.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',fontSize:'12px',color:'#C05621',fontWeight:600}}>
                    <i className="fa-solid fa-circle-info" style={{marginRight:'6px'}}></i>
                    Open to: <strong>{rsvpOpen.allowed_professions.join(', ')}</strong>
                  </div>
                )}

                {/* Paid event pricing banner */}
                {rsvpOpen.price > 0 && !rsvpOpen.is_free && (
                  <div style={{background:'linear-gradient(135deg,#FFF5E6,#FFE8CC)',border:'2px solid var(--orange)',borderRadius:'10px',padding:'14px 16px',marginBottom:'18px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <span style={{fontSize:'13px',fontWeight:600,color:'#92400E'}}>Event Registration Fee</span>
                      <span style={{fontSize:'20px',fontWeight:900,color:'var(--orange)'}}>₹{Number(rsvpOpen.price).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{fontSize:'11px',color:'#92400E',display:'flex',alignItems:'center',gap:'5px'}}>
                      <i className="fa-solid fa-lock" style={{color:'var(--orange)'}}></i>
                      Fill your details below then you'll be redirected to secure payment via Razorpay.
                    </div>
                  </div>
                )}

                <form onSubmit={handleRsvpSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-input" name="full_name" type="text"
                        placeholder="CA / CS / Adv. Full Name"
                        value={form.full_name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-input" name="email" type="email"
                        placeholder="you@example.com"
                        value={form.email} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input className="form-input" name="phone" type="tel"
                        placeholder="+91 XXXXX XXXXX" required
                        value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profession *</label>
                      <select className="form-select" name="profession" value={form.profession} onChange={handleChange} required>
                        <option value="">Select profession *</option>
                        <option>Chartered Accountant</option>
                        <option>Company Secretary</option>
                        <option>Cost Accountant</option>
                        <option>Advocate</option>
                        <option>Student</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Designation *</label>
                      <input className="form-input" name="designation" type="text"
                        placeholder="e.g. Partner, Senior Manager" required
                        value={form.designation} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Organisation / Firm *</label>
                      <input className="form-input" name="organisation" type="text"
                        placeholder="Firm or Company name" required
                        value={form.organisation} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ICAI / ICSI / ICMAI Membership No. *
                      </label>
                      <input className="form-input" name="icai_membership_no" type="text"
                        placeholder="e.g. 123456 / A12345 / M12345" required
                        value={form.icai_membership_no} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <input className="form-input" name="city" type="text"
                        placeholder="Your city" required
                        value={form.city} onChange={handleChange} />
                    </div>
                  </div>

                  {/* GST Invoice section */}
                  <div className="form-group">
                    <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',padding:'12px 14px',background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)'}}>
                      <input type="checkbox" checked={form.wants_gst}
                        onChange={e => setForm(f => ({...f, wants_gst: e.target.checked, gst_number:'', gst_company_name:'', gst_address:''}))}
                        style={{width:'16px',height:'16px',accentColor:'var(--blue)',flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>
                          <i className="fa-solid fa-file-invoice" style={{marginRight:'6px',color:'var(--orange)'}}></i>
                          I need a GST Invoice
                        </div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>
                          A tax invoice will be sent to your email for business reimbursement
                        </div>
                      </div>
                    </label>
                    {form.wants_gst && (
                      <div style={{marginTop:'12px',padding:'14px',background:'#F7F9FC',border:'1px solid var(--border)',borderRadius:'8px',display:'flex',flexDirection:'column',gap:'10px'}}>
                        <div className="form-group" style={{margin:0}}>
                          <label className="form-label">GSTIN (GST Number) *</label>
                          <input className="form-input" type="text" placeholder="e.g. 07AABCU9603R1ZV"
                            value={form.gst_number} onChange={e=>setForm(f=>({...f,gst_number:e.target.value.toUpperCase()}))}
                            style={{textTransform:'uppercase',letterSpacing:'.5px'}}/>
                        </div>
                        <div className="form-group" style={{margin:0}}>
                          <label className="form-label">Company / Firm Name *</label>
                          <input className="form-input" type="text" placeholder="Registered business name"
                            value={form.gst_company_name} onChange={e=>setForm(f=>({...f,gst_company_name:e.target.value}))}/>
                        </div>
                        <div className="form-group" style={{margin:0}}>
                          <label className="form-label">Registered Address *</label>
                          <textarea className="form-input" rows={2} placeholder="Full registered address with PIN code"
                            value={form.gst_address} onChange={e=>setForm(f=>({...f,gst_address:e.target.value}))}
                            style={{resize:'none'}}/>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Volunteer checkbox */}
                  <div className="form-group">
                    <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer',padding:'12px 14px',background:'var(--orange-pale)',border:'1px solid #F5C4A8',borderRadius:'var(--radius-md)'}}>
                      <input type="checkbox" name="is_volunteer" checked={form.is_volunteer} onChange={handleChange}
                        style={{width:'16px',height:'16px',marginTop:'2px',accentColor:'var(--orange)',flexShrink:0}} />
                      <div>
                        <div style={{fontSize:'13px',fontWeight:700,color:'var(--orange)'}}>
                          <i className="fa-solid fa-hand-holding-heart" style={{marginRight:'6px'}}></i>
                          I want to volunteer for this event
                        </div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>
                          Our team will reach out with volunteer roles and responsibilities.
                        </div>
                      </div>
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'4px'}} disabled={submitting}>
                    {submitting
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Registering…</>
                      : <><i className="fa-solid fa-calendar-check"></i> Confirm RSVP</>
                    }
                  </button>
                  <p style={{textAlign:'center',fontSize:'11px',color:'var(--text-light)',marginTop:'10px'}}>
                    <i className="fa-solid fa-lock" style={{marginRight:'4px',color:'var(--green)'}}></i>
                    Your details are secure and will only be used for this event.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}