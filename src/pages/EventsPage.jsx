import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

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
  const { showToast } = useApp();

  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpOpen, setRsvpOpen] = useState(null); // event object
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [form, setForm] = useState({
    full_name:'', email:'', phone:'', profession:'',
    designation:'', organisation:'', icai_membership_no:'', city:'',
    is_volunteer: false,
  });

  useEffect(() => {
    supabase.from('events').select('*')
      .in('status', ['upcoming','ongoing'])
      .order('event_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);

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

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);

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
      status:             'confirmed',
    });

    setSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        showToast('You have already registered for this event!', true);
      } else {
        showToast('Registration failed. Please try again.', true);
      }
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Events</span></div>
          <h1>Events &amp; Programmes</h1>
          <p>From Parliament visits to expert summits — FIP brings professionals together in unique ways.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">
          <div className="shflex" style={{marginBottom:'32px'}}>
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2 className="section-heading">Events &amp; <span>Programmes</span></h2>
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
              {events.map(ev => {
                const ts = TYPE_STYLE[ev.event_type] || TYPE_STYLE.Physical;
                const dl = daysLeft(ev.event_date);
                return (
                  <div className="ev-light" key={ev.id}>
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
                        {ev.capacity && (
                          <span style={{fontSize:'11px',color:'var(--text-light)'}}>
                            <i className="fa-solid fa-users" style={{marginRight:'3px'}}></i>{ev.capacity} seats
                          </span>
                        )}
                        {ev.is_free
                          ? <span style={{fontSize:'11px',fontWeight:700,color:'var(--green)'}}>Free</span>
                          : <span style={{fontSize:'11px',fontWeight:700,color:'var(--blue)'}}>₹{ev.price}</span>
                        }
                      </div>
                      <button className="ev-rsvp-btn" onClick={() => openRsvp(ev)}>
                        <i className="fa-solid fa-calendar-check"></i> RSVP
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          RSVP MODAL
      ══════════════════════════════════ */}
      {rsvpOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setRsvpOpen(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:'560px'}}>
            {!submitting && (
              <button className="modal-close" onClick={() => setRsvpOpen(null)}>&#x2715;</button>
            )}

            {submitted ? (
              /* ── Success ── */
              <div style={{textAlign:'center',padding:'24px 8px'}}>
                <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'var(--green-pale)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:'26px',color:'var(--green)'}}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="modal-title">RSVP Confirmed!</div>
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
                <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Open to all professionals. No login required.</p>

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
                      <label className="form-label">Phone</label>
                      <input className="form-input" name="phone" type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profession</label>
                      <select className="form-select" name="profession" value={form.profession} onChange={handleChange}>
                        <option value="">Select</option>
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
                      <label className="form-label">Designation</label>
                      <input className="form-input" name="designation" type="text"
                        placeholder="e.g. Partner, Senior Manager"
                        value={form.designation} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Organisation / Firm</label>
                      <input className="form-input" name="organisation" type="text"
                        placeholder="Firm or Company name"
                        value={form.organisation} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ICAI / ICSI / ICMAI Membership No.
                        <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'4px'}}>(optional)</span>
                      </label>
                      <input className="form-input" name="icai_membership_no" type="text"
                        placeholder="e.g. 123456 / A12345 / M12345"
                        value={form.icai_membership_no} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" name="city" type="text"
                        placeholder="Your city"
                        value={form.city} onChange={handleChange} />
                    </div>
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