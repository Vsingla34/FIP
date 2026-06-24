import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function ContactPage() {
  const { showToast } = useApp();
  const { user, profile } = useAuth();

  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name:    profile?.full_name  || user?.user_metadata?.full_name || '',
    email:   user?.email         || '',
    phone:   profile?.phone      || '',
    subject: 'Membership Enquiry',
    message: '',
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setLoading(true);

    try {
      // 1. Save to Supabase first
      const { data: saved, error: dbError } = await supabase
        .from('contact_messages')
        .insert({
          name:    form.name.trim(),
          email:   form.email.trim(),
          phone:   form.phone.trim() || null,
          subject: form.subject,
          message: form.message.trim(),
        })
        .select('id')
        .single();

      if (dbError) throw new Error(dbError.message);

      // 2. Show success immediately — don't wait for email
      setLoading(false);
      setSubmitted(true);

      // 3. Fire email API in background (no await) — log any errors
      fetch('/api/send-contact-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:      form.name.trim(),
          email:     form.email.trim(),
          phone:     form.phone.trim() || null,
          subject:   form.subject,
          message:   form.message.trim(),
          messageId: saved?.id || null,
        }),
      }).then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) console.error('Email API error:', data);
        else console.log('Email API success:', data);
      }).catch(err => console.warn('Email API failed:', err.message));

    } catch (err) {
      console.error('Contact error:', err);
      setLoading(false);
      showToast('Failed to send. Please email us directly at fippresidentoffice@gmail.com', true);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Contact</span></div>
          <h1>Get in Touch</h1>
          <p>Questions about membership, events or sponsorship? We respond within 24 hours.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">
          <div className="contact-grid">

            {/* ── Left: Info ── */}
            <div>
              <div className="contact-info-list">
                {[
                  { cls:'ci-orange', icon:'fa-phone',                    label:'Phone',    val:'+91 99998 30938',             href:'tel:+919999830938' },
                  { cls:'ci-blue',   icon:'fa-envelope',                  label:'Email',    val:'fippresidentoffice@gmail.com', href:'mailto:fippresidentoffice@gmail.com' },
                  { cls:'ci-wa',     icon:'fa-brands fa-whatsapp',        label:'WhatsApp', val:'+91 95557 92955',             href:'https://wa.me/919555792955' },
                  { cls:'ci-red',    icon:'fa-location-dot',              label:'Base',     val:'New Delhi, India',            href:null },
                ].map((c,i) => (
                  <div className="ci-item" key={i}>
                    <div className={`ci-icon ${c.cls}`}><i className={`fa-solid ${c.icon}`}></i></div>
                    <div>
                      <div className="ci-label">{c.label}</div>
                      {c.href
                        ? <a href={c.href} className="ci-val" style={{textDecoration:'none',color:'inherit'}}>{c.val}</a>
                        : <div className="ci-val">{c.val}</div>
                      }
                    </div>
                  </div>
                ))}
              </div>

              <div className="social-follow">
                <div className="social-follow-title">Follow FIP</div>
                <div className="social-buttons">
                  <a className="social-btn" href="https://www.facebook.com/fip.officials/" target="_blank" rel="noopener"><i className="fa-brands fa-facebook-f"></i></a>
                  <a className="social-btn" href="https://www.linkedin.com/in/federation-of-indian-professionals-fip-8ba0631a8/" target="_blank" rel="noopener"><i className="fa-brands fa-linkedin-in"></i></a>
                  <a className="social-btn" href="https://www.youtube.com/c/federationindianprofessionals" target="_blank" rel="noopener"><i className="fa-brands fa-youtube"></i></a>
                  <a className="social-btn" href="https://mobile.twitter.com/fip_official" target="_blank" rel="noopener"><i className="fa-brands fa-x-twitter"></i></a>
                </div>
              </div>

              {/* Response time card */}
              <div className="contact-response-card">
                <div className="contact-response-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
                <div>
                  <div className="contact-response-title">Quick Response</div>
                  <div className="contact-response-desc">We typically respond within 24 hours on working days (Mon–Sat).</div>
                </div>
              </div>
            </div>

            {/* ── Right: Form ── */}
            <div className="contact-form-card">
              {submitted ? (
                /* ── Success state ── */
                <div style={{textAlign:'center',padding:'40px 20px'}}>
                  <div style={{width:'72px',height:'72px',borderRadius:'50%',background:'var(--green-pale)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'28px',color:'var(--green)'}}>
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h2 style={{fontSize:'22px',fontWeight:700,color:'var(--blue)',marginBottom:'8px',fontFamily:"'Playfair Display',serif"}}>
                    Message Sent!
                  </h2>
                  <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'24px'}}>
                    Thank you, <strong>{form.name.split(' ')[0]}</strong>! We've received your message
                    and will get back to you at <strong>{form.email}</strong> within 24 hours.
                  </p>
                  <button
                    className="btn btn-outline-blue btn-sm"
                    onClick={() => { setSubmitted(false); setForm(f => ({ ...f, message: '', subject:'Membership Enquiry' })); }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{fontSize:'20px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Send a Message</h2>
                  <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>
                    Fill in the form below — no login required. We read every message.
                  </p>

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" name="name" type="text"
                          placeholder="CA / CS / Adv. Full Name"
                          value={form.name} onChange={handleChange} required />
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
                        <label className="form-label">Subject</label>
                        <select className="form-select" name="subject" value={form.subject} onChange={handleChange}>
                          <option>Membership Enquiry</option>
                          <option>Course Registration</option>
                          <option>Event Sponsorship</option>
                          <option>Speaker Invitation</option>
                          <option>Media &amp; Press</option>
                          <option>Job Posting</option>
                          <option>General</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Message *</label>
                      <textarea className="form-textarea" name="message"
                        placeholder="How can we help you? Please be as specific as possible…"
                        value={form.message} onChange={handleChange}
                        required style={{minHeight:'130px'}}></textarea>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{width:'100%',justifyContent:'center',padding:'13px'}}
                      disabled={loading}
                    >
                      {loading
                        ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending…</>
                        : <>Send Message <i className="fa-solid fa-paper-plane"></i></>
                      }
                    </button>

                    <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-light)',marginTop:'12px'}}>
                      <i className="fa-solid fa-lock" style={{marginRight:'4px',color:'var(--green)'}}></i>
                      Your information is secure and will never be shared with third parties.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}