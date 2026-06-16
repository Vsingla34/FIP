
import { useApp } from '../context/AppContext.jsx';

export default function ContactPage() {
  const { showToast } = useApp();
  const handleSubmit = e => { e.preventDefault(); showToast("Message sent! We'll get back to you within 24 hours."); e.target.reset(); };

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
            <div>
              <div className="contact-info-list">
                {[
                  { cls:'ci-orange', icon:'fa-phone', label:'Phone', val:'+91 99998 30938' },
                  { cls:'ci-blue', icon:'fa-envelope', label:'Email', val:'fippresidentoffice@gmail.com' },
                  { cls:'ci-wa', icon:'fa-brands fa-whatsapp', label:'WhatsApp', val:'+91 95557 92955' },
                  { cls:'ci-red', icon:'fa-location-dot', label:'Base', val:'New Delhi, India' },
                ].map((c,i) => (
                  <div className="ci-item" key={i}>
                    <div className={`ci-icon ${c.cls}`}><i className={`fa-solid ${c.icon}`}></i></div>
                    <div><div className="ci-label">{c.label}</div><div className="ci-val">{c.val}</div></div>
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
            </div>
            <div className="contact-form-card">
              <h2 style={{fontSize:'20px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Send a Message</h2>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>We typically respond within 24 hours on working days.</p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" type="text" placeholder="CA / CS / Adv. Full Name" required /></div>
                  <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" placeholder="you@example.com" required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" /></div>
                  <div className="form-group"><label className="form-label">Subject</label>
                    <select className="form-select">
                      <option>Membership Enquiry</option><option>Course Registration</option>
                      <option>Event Sponsorship</option><option>Speaker Invitation</option>
                      <option>Media &amp; Press</option><option>General</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Message *</label><textarea className="form-textarea" placeholder="How can we help you?" required></textarea></div>
                <button type="submit" className="btn btn-secondary" style={{width:'100%',justifyContent:'center',padding:'13px'}}>Send Message <i className="fa-solid fa-paper-plane"></i></button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}