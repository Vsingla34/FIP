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

function formatDateRange(start, end) {
  if (!start) return 'Every Sunday';
  if (!end || end === start) return formatDate(start);
  const s = new Date(start), e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString('en-IN', sameMonth ? { day:'numeric' } : { day:'numeric', month:'long' });
  const endFmt   = e.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  return `${startFmt} – ${endFmt}`;
}

function daysLeft(startStr, endStr) {
  if (!startStr) return null;
  const now   = new Date();
  const start = new Date(startStr);
  const end   = endStr ? new Date(endStr) : start;
  if (now > end) return null;
  if (now >= start) return 'Ongoing';
  const diff = Math.ceil((start - now) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days left`;
}

// Resolves what THIS user should be charged for an event. Dual pricing
// (price_member/price_non_member) takes priority when set; older events that
// predate this feature fall back to the single price/is_free they already had.
function getEventPrice(event, isMember) {
  if (!event) return 0;
  const hasDual = event.price_member != null || event.price_non_member != null;
  if (hasDual) return Number(isMember ? (event.price_member || 0) : (event.price_non_member || 0));
  return event.is_free ? 0 : Number(event.price || 0);
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
  const isFipMember = profile?.membership_status === 'Active';

  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpOpen, setRsvpOpen] = useState(null);
  const effectiveEventPrice = getEventPrice(rsvpOpen, isFipMember);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [flyerEvent, setFlyerEvent]   = useState(null); // event to show flyer for after registration
  const [form, setForm] = useState({
    full_name:'', email:'', phone:'',
    designation:'', organisation:'',
    wants_gst: false, gst_number:'', gst_company_name:'', gst_address:'',
    customFieldResponses: {},
  });

  useEffect(() => {
    // status alone isn't enough — nothing auto-flips an event to 'completed'
    // once its date passes, so a past event with status still 'upcoming'
    // (the common case: nobody remembered to update it) used to stay stuck
    // in this list forever. Cross-check event_date >= today too, so a stale
    // status can no longer surface a past event here.
    const todayStr = new Date().toISOString().split('T')[0];
    supabase.from('events').select('*')
      .in('status', ['upcoming','ongoing'])
      .or(`event_date.gte.${todayStr},event_end_date.gte.${todayStr},event_date.is.null`)
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
      designation:        profile?.designation || '',
      organisation:       profile?.organisation || '',
      wants_gst: false, gst_number:'', gst_company_name:'', gst_address:'',
      customFieldResponses: {},
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
      designation:        form.designation.trim() || null,
      organisation:       form.organisation.trim() || null,
      event_name:         rsvpOpen.title,
      status:             'confirmed',
      gst_number:         form.wants_gst ? form.gst_number.trim() || null : null,
      gst_company_name:   form.wants_gst ? form.gst_company_name.trim() || null : null,
      gst_address:        form.wants_gst ? form.gst_address.trim() || null : null,
      custom_field_responses: form.customFieldResponses || {},
    });
    return error;
  };

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);

    // ── Validation: only Name, Email, Mobile are required now — Organisation
    // and Designation are optional. Profession/ICAI/City are no longer part
    // of the base form (see note below); admins needing them for a specific
    // event can add them back via Custom Registration Fields.
    const missing = [];
    if (!form.full_name.trim())          missing.push('Full Name');
    if (!form.email.trim())              missing.push('Email');
    if (!form.phone.trim())              missing.push('Mobile Number');
    if (missing.length > 0) {
      setSubmitting(false);
      showToast(`Please fill in: ${missing.join(', ')}`, true);
      return;
    }

    // NOTE: the profession-eligibility gate (allowed_professions) has been
    // retired along with the Profession field it depended on — it would
    // otherwise block every registration, since form.profession no longer
    // exists. If per-event profession restriction is needed again, it should
    // be rebuilt against a Custom Registration Field instead of this fixed one.

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

    const isPaid = effectiveEventPrice > 0;

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
        // Save form data with order so webhook can enroll if browser closes
        rsvpData: {
          event_id:           capturedEvent.id,
          event_name:         capturedEvent.title,
          user_id:            user?.id || null,
          full_name:          capturedForm.full_name.trim(),
          email:              capturedForm.email.trim(),
          phone:              capturedForm.phone?.trim() || null,
          designation:        capturedForm.designation?.trim() || null,
          organisation:       capturedForm.organisation?.trim() || null,
          gst_number:         capturedForm.wants_gst ? capturedForm.gst_number : null,
          gst_company_name:   capturedForm.wants_gst ? capturedForm.gst_company_name : null,
          gst_address:        capturedForm.wants_gst ? capturedForm.gst_address : null,
          custom_field_responses: capturedForm.customFieldResponses || {},
          status:             'confirmed',
        },
        onSuccess: async () => {
          // Use captured data — not stale rsvpOpen/form
          const { error } = await supabase.from('event_rsvps').insert({
            event_id:           capturedEvent.id,
            event_name:         capturedEvent.title,
            user_id:            user?.id || null,
            full_name:          capturedForm.full_name.trim(),
            email:              capturedForm.email.trim(),
            phone:              capturedForm.phone?.trim() || null,
            designation:        capturedForm.designation?.trim() || null,
            organisation:       capturedForm.organisation?.trim() || null,
            custom_field_responses: capturedForm.customFieldResponses || {},
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
                customSubject:      capturedEvent.email_subject || null,
                customBody:         capturedEvent.email_body    || null,
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
        customSubject:      rsvpOpen.email_subject || null,
        customBody:         rsvpOpen.email_body    || null,
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
                const dl = daysLeft(ev.event_date, ev.event_end_date);
                return (
                  <div className="ev-card" key={ev.id}>
                    {ev.image_url ? (
                      <div className="ev-card-banner">
                        <img src={ev.image_url} alt={ev.title}
                          onError={e => e.target.closest('.ev-card-banner').style.display='none'}/>
                      </div>
                    ) : <div className="ev-card-accent"/>}

                    <div className="ev-card-body">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
                        <div className="ev-datestamp">
                          <div className="ev-datestamp-box">
                            <span className="ev-datestamp-day">{ev.event_date ? new Date(ev.event_date).getDate() : '—'}</span>
                            <span className="ev-datestamp-month">{ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-IN',{month:'short'}) : ''}</span>
                          </div>
                          <div className="ev-datestamp-text">
                            <strong>{formatDateRange(ev.event_date, ev.event_end_date)}</strong>
                            {ev.event_time && <><br/>{ev.event_time}</>}
                          </div>
                        </div>
                        {dl && <span style={{fontSize:'10.5px',fontWeight:700,color:'var(--orange)',background:'var(--orange-pale)',border:'1px solid #F5C4A8',padding:'3px 10px',borderRadius:'20px',whiteSpace:'nowrap'}}>{dl}</span>}
                      </div>

                      <div className="ev-card-title">{ev.title}</div>
                      <div className="ev-card-desc">{ev.description}</div>

                      {ev.tags?.length > 0 && (
                        <div className="ev-tag-row">
                          {ev.tags.map((t,i) => <span key={i} className="ev-tag">{t}</span>)}
                        </div>
                      )}

                      <div className="ev-meta-row">
                        <span className={`ev-meta-chip ${ts.cls}`}>
                          <i className={`fa-solid ${ts.icon}`}></i> {ev.event_type}
                          {ev.city && ` · ${ev.city}`}
                        </span>
                        {ev.is_private && (
                          <span className="ev-meta-chip" style={{background:'rgba(242,101,34,0.1)',color:'var(--orange)',border:'1px solid rgba(242,101,34,0.3)'}}>
                            <i className="fa-solid fa-lock"></i> Members Only
                          </span>
                        )}
                        {ev.capacity && (
                          <span className="ev-meta-note">
                            <i className="fa-solid fa-users" style={{marginRight:'4px'}}></i>
                            {(ev.registered_count||0) >= (ev.capacity||999999)
                              ? 'Fully booked'
                              : (profile?.role === 'admin' || profile?.is_admin)
                                ? `${ev.registered_count||0}/${ev.capacity} seats filled`
                                : null}
                          </span>
                        )}
                      </div>

                      {(() => {
                        const hasDual = ev.price_member != null || ev.price_non_member != null;
                        if (hasDual) {
                          const pMember    = Number(ev.price_member || 0);
                          const pNonMember = Number(ev.price_non_member || 0);
                          if (pMember === 0 && pNonMember === 0) {
                            return (
                              <div className="ev-price-block">
                                <span className="ev-price-free"><i className="fa-solid fa-circle-check"></i> Free for everyone</span>
                              </div>
                            );
                          }
                          return (
                            <div className="ev-price-block">
                              <div className="ev-price-tiers">
                                <div className="ev-price-tier">
                                  <div className="ev-price-tier-label">FIP Members</div>
                                  <div className="ev-price-tier-amt">₹{pMember.toLocaleString('en-IN')} <small>+18% GST</small></div>
                                </div>
                                <div className="ev-price-tier">
                                  <div className="ev-price-tier-label">Non-Members</div>
                                  <div className="ev-price-tier-amt">₹{pNonMember.toLocaleString('en-IN')} <small>+18% GST</small></div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="ev-price-block">
                            {ev.is_free
                              ? <span className="ev-price-free"><i className="fa-solid fa-circle-check"></i> Free to attend</span>
                              : <span className="ev-price-single">₹{ev.price}</span>}
                          </div>
                        );
                      })()}

                      {(() => {
                        const isFull = ev.capacity && (ev.registered_count||0) >= ev.capacity;
                        const isReg  = registeredEventIds.has(ev.id);
                        const evPrice = getEventPrice(ev, isFipMember);
                        return (
                          <button
                            className="ev-card-cta"
                            style={{
                              background: isReg ? 'var(--green)' : isFull ? '#6B7280' : evPrice>0 ? 'var(--orange)' : 'var(--blue)',
                              color:'#fff',
                              cursor: isReg || isFull ? 'default' : 'pointer',
                              opacity: isFull && !isReg ? 0.8 : 1,
                            }}
                            onClick={() => { if (!isReg && !isFull) openRsvp(ev); }}>
                            {isReg
                              ? <><i className="fa-solid fa-circle-check"></i> Seat Booked</>
                              : isFull
                              ? <><i className="fa-solid fa-ban"></i> Fully Booked</>
                              : evPrice > 0
                              ? <><i className="fa-solid fa-lock"></i> Register Now</>
                              : <><i className="fa-solid fa-calendar-check"></i> Register Now</>
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
                  {rsvpOpen.event_date && <> We'll see you on <strong>{formatDateRange(rsvpOpen.event_date, rsvpOpen.event_end_date)}</strong>.</>}
                </p>
                <button className="btn btn-outline-blue btn-sm" onClick={() => setRsvpOpen(null)}>Close</button>
              </div>
            ) : (
              <>
                {/* ── Event info ── */}
                <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'20px'}}>
                  <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>{rsvpOpen.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                    <span><i className="fa-regular fa-calendar" style={{marginRight:'4px'}}></i>{formatDateRange(rsvpOpen.event_date, rsvpOpen.event_end_date)}</span>
                    {rsvpOpen.event_time && <span><i className="fa-regular fa-clock" style={{marginRight:'4px'}}></i>{rsvpOpen.event_time}</span>}
                    {rsvpOpen.venue && <span><i className="fa-solid fa-location-dot" style={{marginRight:'4px'}}></i>{rsvpOpen.venue}</span>}
                  </div>
                </div>

                <div className="modal-title" style={{marginBottom:'4px'}}>Register for this Event</div>
                <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'10px'}}>
                  Fields marked * are required.
                </p>

                {/* Paid event pricing banner */}
                {effectiveEventPrice > 0 && (
                  <div style={{background:'linear-gradient(135deg,#FFF5E6,#FFE8CC)',border:'2px solid var(--orange)',borderRadius:'10px',padding:'14px 16px',marginBottom:'18px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <span style={{fontSize:'13px',fontWeight:600,color:'#92400E'}}>Event Registration Fee{isFipMember ? ' (Member price)' : ''}</span>
                      <span style={{fontSize:'20px',fontWeight:900,color:'var(--orange)'}}>₹{Number(effectiveEventPrice).toLocaleString('en-IN')}</span>
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
                        placeholder="Your full name"
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
                      <label className="form-label">Mobile No. *</label>
                      <input className="form-input" name="phone" type="tel"
                        placeholder="+91 XXXXX XXXXX" required
                        value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Organisation / Firm <span style={{fontWeight:400,color:'var(--text-light)'}}>(optional)</span></label>
                      <input className="form-input" name="organisation" type="text"
                        placeholder="Firm or Company name"
                        value={form.organisation} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Designation <span style={{fontWeight:400,color:'var(--text-light)'}}>(optional)</span></label>
                      <input className="form-input" name="designation" type="text"
                        placeholder="e.g. Partner, Senior Manager"
                        value={form.designation} onChange={handleChange} />
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