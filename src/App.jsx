import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { articles, committees, members } from './data/index.js';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { useState, useEffect } from 'react';

/* ─── ANNOUNCE BAR ─── */
function AnnounceBar() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();
  if (!visible) return null;
  return (
    <div id="announce-bar">
      <i className="fa-solid fa-bell" style={{color:'#FFD09B',fontSize:'12px',flexShrink:0}}></i>
      <span><strong>GST Conclave 2026</strong> — Registrations opening soon. Be the first to know!</span>
      <span className="ann-link" onClick={() => navigate('/events')}>View Events</span>
      <button id="ann-close" onClick={() => setVisible(false)} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}

/* ─── NAVBAR ─── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openModal } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location]);

  const links = [
    { to:'/', label:'Home' },
    { to:'/about', label:'About' },
    { to:'/courses', label:'Courses' },
    { to:'/membership', label:'Membership' },
    { to:'/events', label:'Events' },
    { to:'/blog', label:'Blog' },
    { to:'/team', label:'Team' },
    { to:'/committees', label:'Committees' },
    { to:'/contact', label:'Contact' },
  ];

  return (
    <nav id="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <img
            src="https://www.fipin.org/images/our-img/logo.png"
            alt="Federation of Indian Professionals"
            className="nav-logo-img"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
          <div className="nav-logo-fallback" style={{display:'none'}}>
            <div className="nav-logo-fallback-icon">F</div>
            <div>
              <div className="nav-logo-fallback-text">Federation of Indian Professionals</div>
              <div className="nav-logo-fallback-sub">Connect · Collaborate · Conquer</div>
            </div>
          </div>
        </Link>
        <div className="nav-links">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link${location.pathname===l.to?' active':''}`}>{l.label}</Link>
          ))}
        </div>
        <div className="nav-actions">
          <button className="nav-btn-login" onClick={() => openModal('login')}>Log In</button>
          <Link to="/membership" className="nav-btn-join">Join FIP</Link>
          <Link to="/dashboard" className="nav-link" style={{fontSize:'12px',display:'flex',gap:'5px',alignItems:'center'}}>
            <i className="fa-solid fa-circle-user"></i> My FIP
          </Link>
        </div>
        <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
          <span/><span/><span/>
        </button>
      </div>
      <div className={`nav-mobile-menu${mobileOpen?' open':''}`} id="mobile-menu">
        <button className="nav-mobile-close" onClick={() => setMobileOpen(false)}>&#x2715;</button>
        <div style={{textAlign:'center',padding:'12px 0 20px',borderBottom:'1px solid var(--border)',marginBottom:'8px'}}>
          <img src="https://www.fipin.org/images/our-img/logo.png" alt="FIP Logo" style={{height:'44px',margin:'0 auto'}} onError={e=>e.target.style.display='none'}/>
        </div>
        {links.map(l => (
          <Link key={l.to} to={l.to} className="nav-mobile-link">{l.label}</Link>
        ))}
        <Link to="/dashboard" className="nav-mobile-link"><i className="fa-solid fa-circle-user" style={{width:'18px',color:'var(--orange)'}}></i> My FIP Dashboard</Link>
        <div style={{display:'flex',gap:'10px',marginTop:'16px',padding:'0 16px 16px'}}>
          <button className="btn btn-outline-blue" style={{flex:1,justifyContent:'center'}} onClick={() => { openModal('login'); setMobileOpen(false); }}>Log In</button>
          <Link to="/membership" className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={() => setMobileOpen(false)}>Join FIP</Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  const navigate = useNavigate();
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-wrap">
              <img src="https://www.fipin.org/images/our-img/logo.png" alt="FIP" className="footer-logo-img" onError={e=>e.target.style.display='none'}/>
              <div className="footer-logo-fallback" style={{display:'none'}}>FIP<span>.</span></div>
            </div>
            <p className="footer-desc">Federation of Indian Professionals — India's premier network for Chartered Accountants, Company Secretaries, Cost Accountants, and Legal professionals. Connect · Collaborate · Conquer.</p>
            <div className="footer-soc-row">
              <a className="f-soc" href="https://www.facebook.com/fip.officials/" target="_blank" rel="noopener"><i className="fa-brands fa-facebook-f"></i></a>
              <a className="f-soc" href="https://www.linkedin.com/in/federation-of-indian-professionals-fip-8ba0631a8/" target="_blank" rel="noopener"><i className="fa-brands fa-linkedin-in"></i></a>
              <a className="f-soc" href="https://www.youtube.com/c/federationindianprofessionals" target="_blank" rel="noopener"><i className="fa-brands fa-youtube"></i></a>
              <a className="f-soc" href="https://mobile.twitter.com/fip_official" target="_blank" rel="noopener"><i className="fa-brands fa-x-twitter"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/about">About FIP</Link>
            <Link to="/team">Our Team</Link>
            <Link to="/membership">Membership</Link>
            <Link to="/courses">Courses</Link>
            <Link to="/events">Events</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="/blog">Blog &amp; Insights</Link>
            <Link to="/webinars">Webinars</Link>
            <Link to="/committees">Committees</Link>
            <Link to="/directory">Member Directory</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
            <a href="#">Code of Conduct</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Federation of Indian Professionals. All rights reserved.</span>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── TOAST ─── */
function Toast() {
  const { toast } = useApp();
  if (!toast.show) return null;
  return (
    <div className={`toast-bar${toast.err?' error':''}`}>
      <i className="fa-solid fa-circle-check"></i>
      {toast.msg}
    </div>
  );
}

/* ─── MODALS ─── */
function Modals() {
  const { modal, closeModal, showToast, openModal } = useApp();
  const navigate = useNavigate();
  if (!modal) return null;

  const handleLogin = e => { e.preventDefault(); closeModal(); showToast('Welcome back! Redirecting…'); setTimeout(() => navigate('/dashboard'), 700); };
  const handleRegister = e => { e.preventDefault(); closeModal(); showToast('Registration successful! Welcome to FIP.'); setTimeout(() => navigate('/payment'), 700); };
  const handleEnroll = e => { e.preventDefault(); closeModal(); showToast('Enrollment submitted! Check your dashboard.'); };
  const handleRSVP = e => { e.preventDefault(); closeModal(); showToast('RSVP confirmed! See you at the event.'); };
  const handleTestimonial = e => { e.preventDefault(); closeModal(); showToast('Thank you for your testimonial!'); };
  const handleContact = e => { e.preventDefault(); closeModal(); showToast("Message sent! We'll get back to you within 24 hours."); };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>&#x2715;</button>

        {modal === 'login' && (
          <>
            <div className="modal-title">Welcome Back</div>
            <div className="modal-sub">Sign in to access your FIP dashboard, courses and events.</div>
            <form onSubmit={handleLogin}>
              <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" type="email" placeholder="you@example.com" required/></div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" required/></div>
              <button type="submit" className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}>Sign In</button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>No account? <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}} onClick={() => openModal('register')}>Join FIP</span></p>
            </form>
          </>
        )}

        {modal === 'register' && (
          <>
            <div className="modal-title">Join FIP</div>
            <div className="modal-sub">Create your account and join 3,000+ finance professionals.</div>
            <form onSubmit={handleRegister}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="CA / CS / Adv. Full Name" required/></div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" required>
                  <option value="">Select profession</option>
                  <option>Chartered Accountant</option>
                  <option>Company Secretary</option>
                  <option>Cost Accountant</option>
                  <option>Advocate</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" required/></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" required/></div>
              </div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Min 8 characters" required minLength={8}/></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}>Create Account — ₹500/yr</button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>Already a member? <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}} onClick={() => openModal('login')}>Sign In</span></p>
            </form>
          </>
        )}

        {modal === 'enroll' && (
          <>
            <div className="modal-title">Enroll in Course</div>
            <div className="modal-sub">Complete your details to reserve your seat.</div>
            <form onSubmit={handleEnroll}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="As per ICAI / ICSI records" required/></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" required/></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required/></div>
              </div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" required>
                  <option value="">Select</option>
                  <option>Chartered Accountant</option>
                  <option>Company Secretary</option>
                  <option>Cost Accountant</option>
                  <option>Advocate</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm Enrollment</button>
            </form>
          </>
        )}

        {modal === 'rsvp' && (
          <>
            <div className="modal-title">RSVP for Event</div>
            <div className="modal-sub">Confirm your attendance. RSVP closes 48 hours before the event.</div>
            <form onSubmit={handleRSVP}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="Your full name" required/></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@example.com" required/></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required/></div>
              </div>
              <div className="form-group"><label className="form-label">Designation</label><input className="form-input" type="text" placeholder="e.g. CA, CS, Partner at ABC & Co." required/></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm RSVP</button>
            </form>
          </>
        )}

        {modal === 'testimonial' && (
          <>
            <div className="modal-title">Share Your Experience</div>
            <div className="modal-sub">Tell the community how FIP has helped your professional journey.</div>
            <form onSubmit={handleTestimonial}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" type="text" placeholder="CA / CS / Adv. Name" required/></div>
                <div className="form-group"><label className="form-label">Designation</label><input className="form-input" type="text" placeholder="Your role" required/></div>
              </div>
              <div className="form-group"><label className="form-label">Testimonial</label><textarea className="form-textarea" placeholder="How has FIP helped your professional journey?" required></textarea></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Submit Testimonial</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── HOME PAGE ─── */
function HomePage() {
  const { openModal, startCheckout } = useApp();
  const navigate = useNavigate();

  return (
    <>
      {/* HERO */}
      <section id="hero">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-eyebrow"><i className="fa-solid fa-shield-halved"></i>&nbsp; India's Premier Finance &amp; Legal Network</div>
            <h1 className="hero-h1">Where Finance Professionals<br/><em>Unite &amp; Conquer</em></h1>
            <p className="hero-desc">FIP connects 3,000+ Chartered Accountants, Company Secretaries, Cost Accountants and Advocates through world-class knowledge events, certificate courses, and a community built for impact.</p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={() => { startCheckout('FIP Standard Membership', 500); navigate('/payment'); }}>
                <i className="fa-solid fa-user-plus"></i> Join FIP — ₹500/yr
              </button>
              <Link to="/about" className="btn btn-outline-white btn-lg">Our Story <i className="fa-solid fa-arrow-right"></i></Link>
            </div>
            <div className="hero-stats">
              <div><span className="hero-stat-num">3,000+</span><div className="hero-stat-lbl">Members</div></div>
              <div><span className="hero-stat-num">200+</span><div className="hero-stat-lbl">Webinars</div></div>
              <div><span className="hero-stat-num">50+</span><div className="hero-stat-lbl">Events</div></div>
              <div><span className="hero-stat-num">₹10L+</span><div className="hero-stat-lbl">Sponsorship</div></div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-dashboard">
              <div className="db-bar">
                <div className="db-dot r"></div><div className="db-dot y"></div><div className="db-dot g"></div>
                <span className="db-title">FIP Member Portal</span>
              </div>
              <div className="db-card">
                <div className="db-card-label"><i className="fa-solid fa-calendar-check"></i>&nbsp; Upcoming Event</div>
                <div className="db-card-title">Rashtrapati Bhawan Visit</div>
                <div className="db-card-meta">Jan 11, 2026 &nbsp;·&nbsp; Physical &nbsp;·&nbsp; Delhi</div>
              </div>
              <div className="db-card">
                <div className="db-card-label"><i className="fa-solid fa-graduation-cap"></i>&nbsp; Featured Course</div>
                <div className="db-card-title">Mastering GST Litigation — Sankalp 2026</div>
                <div className="db-card-meta">Enrolling Now &nbsp;·&nbsp; ₹999 &nbsp;·&nbsp; 6 Sessions</div>
              </div>
              <div className="db-card">
                <div className="db-card-label"><i className="fa-solid fa-chart-bar"></i>&nbsp; Community Stats</div>
                <div className="db-stat-row">
                  <div className="db-stat"><div className="db-stat-n">3K+</div><div className="db-stat-l">Members</div></div>
                  <div className="db-stat"><div className="db-stat-n">200+</div><div className="db-stat-l">Webinars</div></div>
                  <div className="db-stat"><div className="db-stat-n">50+</div><div className="db-stat-l">Events</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS RIBBON */}
      <div className="stats-ribbon">
        <div className="stats-ribbon-inner">
          <div className="stat-item"><span className="stat-n">200+</span><div className="stat-l">Webinars Held</div></div>
          <div className="stat-item"><span className="stat-n">50+</span><div className="stat-l">Physical Meets</div></div>
          <div className="stat-item"><span className="stat-n">₹10L+</span><div className="stat-l">Sponsorship</div></div>
          <div className="stat-item"><span className="stat-n">3,000+</span><div className="stat-l">Professionals</div></div>
          <div className="stat-item"><span className="stat-n">100+</span><div className="stat-l">Expert Speakers</div></div>
          <div className="stat-item"><span className="stat-n">15+</span><div className="stat-l">Certificate Courses</div></div>
        </div>
      </div>

      {/* 3C */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Our Philosophy</span>
            <h2 className="section-heading">Built on <span>The 3 C's</span></h2>
            <p className="section-sub">Every programme, event and resource at FIP is shaped by three principles that define why we exist.</p>
          </div>
          <div className="three-c-grid">
            <div className="c-card c1">
              <div className="c-icon ci-blue"><i className="fa-solid fa-network-wired"></i></div>
              <h3>Connect</h3>
              <p>Build meaningful relationships with 3,000+ CAs, CSs, CMAs, and Advocates. Expand your professional circle through events, forums, and WhatsApp communities.</p>
            </div>
            <div className="c-card c2">
              <div className="c-icon ci-orange"><i className="fa-solid fa-people-group"></i></div>
              <h3>Collaborate</h3>
              <p>Partner on industry initiatives, co-author insights, and develop solutions. FIP bridges practitioners across disciplines to drive the profession forward.</p>
            </div>
            <div className="c-card c3">
              <div className="c-icon ci-green"><i className="fa-solid fa-trophy"></i></div>
              <h3>Conquer</h3>
              <p>Stay ahead with expert-led certificate courses, ICAI CPE-eligible webinars, and real-time regulatory updates tailored for practising professionals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="section">
        <div className="container">
          <div className="shflex">
            <div>
              <span className="eyebrow">Programmes</span>
              <h2 className="section-heading">Featured <span>Courses</span></h2>
              <p className="section-sub">Practical, expert-led courses designed for practising professionals.</p>
            </div>
            <Link to="/courses" className="btn btn-outline-blue">View All <i className="fa-solid fa-arrow-right"></i></Link>
          </div>
          <div className="course-grid">
            {[
              { bg:'ct-blue', emoji:'📑', tag:'tag-hot', tagLabel:'Hot', cat:'GST & Indirect Tax', title:'Mastering GST Litigation — Sankalp 2026', instr:'CA Gaurav Aggarwal', sessions:'6 Sessions', level:'Intermediate', price:'₹999', free:false },
              { bg:'ct-teal', emoji:'🏛', tag:'tag-free', tagLabel:'Free for Members', cat:'Corporate Law', title:'NCLT & Corporate Insolvency Practice', instr:'Expert Panel', sessions:'4 Sessions', level:'Advanced', price:'Members Free', free:true },
              { bg:'ct-orange', emoji:'📊', tag:null, tagLabel:null, cat:'Direct Tax', title:'Income Tax Search & Seizure — Practical Guide', instr:'Senior Practitioners', sessions:'5 Sessions', level:'Advanced', price:'₹1,499', free:false },
            ].map((c,i) => (
              <div className="course-card" key={i} onClick={() => openModal('enroll')}>
                <div className={`course-thumb ${c.bg}`}>
                  <span>{c.emoji}</span>
                  {c.tag && <span className={`course-tag ${c.tag}`}>{c.tagLabel}</span>}
                </div>
                <div className="course-body">
                  <div className="course-cat">{c.cat}</div>
                  <div className="course-title">{c.title}</div>
                  <div className="course-instr"><i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)'}}></i> {c.instr}</div>
                  <div className="course-meta"><span><i className="fa-regular fa-clock"></i> {c.sessions}</span><span><i className="fa-solid fa-signal"></i> {c.level}</span></div>
                  <div className="course-footer">
                    {c.free ? <span className="course-price-free">{c.price}</span> : <span className="course-price">{c.price}</span>}
                    <button className="c-enroll-btn" onClick={e => { e.stopPropagation(); openModal('enroll'); }}>Enroll Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS DARK */}
      <div className="events-dark">
        <div className="container">
          <div className="shflex">
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2 className="section-heading">Events &amp; <span>Programmes</span></h2>
              <p className="section-sub">From Parliament visits to morning walks — FIP brings professionals together uniquely.</p>
            </div>
            <Link to="/events" className="btn btn-outline-white">All Events <i className="fa-solid fa-arrow-right"></i></Link>
          </div>
          <div className="event-grid">
            <div className="ev-dark" onClick={() => openModal('rsvp')}>
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> Jan 11, 2026</div>
              <div className="ev-title">Rashtrapati Bhawan Visit</div>
              <div className="ev-desc">Exclusive guided visit to the President's residence. RSVP by Jan 2, 7 PM with your name, designation &amp; ID proof.</div>
              <div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">120 seats</span></div>
            </div>
            <div className="ev-dark" onClick={() => openModal('rsvp')}>
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> Every Sunday</div>
              <div className="ev-title">Chartered Walk &amp; Talk</div>
              <div className="ev-desc">Morning walks at India Gate, War Memorial &amp; Firoz Shah Road. Networking meets wellness — free for all members.</div>
              <div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">Open to all</span></div>
            </div>
            <div className="ev-dark">
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> Coming Soon</div>
              <div className="ev-title">GST Conclave 2026</div>
              <div className="ev-desc">Following Le Meridien's success, the next GST Conclave brings 500+ professionals for a full-day indirect tax summit.</div>
              <div className="ev-footer"><span className="ev-type evt-virtual">Notify Me</span><span className="ev-seats">500+ capacity</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORM FEATURES */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Platform Features</span>
            <h2 className="section-heading">Built for <span>Practising Professionals</span></h2>
            <p className="section-sub">New features available to all FIP members on the revamped platform.</p>
          </div>
          <div className="features-grid">
            {[
              { icon:'fa-gauge-high', cls:'fi-blue', title:'Member Dashboard', desc:'Track CPE hours, enrolled courses, event RSVPs, and membership status in one personalised view.', tag:null },
              { icon:'fa-calendar-check', cls:'fi-orange', title:'Event Calendar & RSVP', desc:'Browse all FIP events, RSVP with one click, and get automatic WhatsApp & email reminders.', tag:'New' },
              { icon:'fa-comments', cls:'fi-teal', title:'Community Forum', desc:'Post questions, share regulatory updates, and discuss case studies with 3,000+ community members.', tag:'New' },
              { icon:'fa-certificate', cls:'fi-purple', title:'CPE Credit Tracking', desc:'Auto-log ICAI CPE hours from FIP webinars and courses. Download e-certificates instantly.', tag:'New' },
              { icon:'fa-book-open', cls:'fi-red', title:'Resource Library', desc:'Searchable archive of all FIP session recordings, decks, case studies, and circulars.', tag:'New' },
              { icon:'fa-briefcase', cls:'fi-green', title:'Job & Opportunity Board', desc:'Exclusive listings from FIP member firms — jobs, freelance briefs, and collaboration opportunities.', tag:'New' },
            ].map((f,i) => (
              <div className="feat-card" key={i}>
                <div className={`feat-icon ${f.cls}`}><i className={`fa-solid ${f.icon}`}></i></div>
                <div>
                  <div className="feat-title">{f.title}{f.tag && <span className="tag-new">{f.tag}</span>}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Member Voices</span>
            <h2 className="section-heading">What Our <span>Members Say</span></h2>
          </div>
          <div className="testi-grid">
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <span className="testi-qmark">"</span>
              <p className="testi-text">FIP stands as a dynamic platform dedicated to empowering professionals across disciplines. With its consistent focus on knowledge-sharing, expert-led sessions, and unwavering support, FIP has become a vital force in enriching professional growth and fostering a strong, informed community committed to excellence.</p>
              <div className="testi-author"><div className="testi-av">GG</div><div><div className="testi-name">Adv. Gaurav Gupta</div><div className="testi-role">Advocate · High Court of Delhi</div></div></div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <span className="testi-qmark">"</span>
              <p className="testi-text">Being part of FIP has been an enriching experience. FIP stands out as a vibrant platform that brings together finance and legal professionals from diverse backgrounds, fostering a community of continuous learning and collaboration. Their commitment through workshops and networking events has significantly contributed to my growth.</p>
              <div className="testi-author"><div className="testi-av">SS</div><div><div className="testi-name">CA Sadhna Sharma</div><div className="testi-role">Chartered Accountant · MBA (IIMA)</div></div></div>
            </div>
          </div>
          <div style={{textAlign:'center',marginTop:'28px'}}>
            <button className="btn btn-outline-blue" onClick={() => openModal('testimonial')}><i className="fa-solid fa-pen"></i> Submit Your Testimonial</button>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <div className="cta-band">
        <div className="container">
          <div className="cta-inner">
            <h2 className="cta-h2">Ready to <em>Connect, Collaborate</em> &amp; Conquer?</h2>
            <p className="cta-desc">Join 3,000+ finance and legal professionals building careers, sharing knowledge, and making an impact.</p>
            <div className="cta-actions">
              <button className="btn btn-primary btn-lg" onClick={() => { startCheckout('FIP Standard Membership', 500); navigate('/payment'); }}>
                <i className="fa-solid fa-user-plus"></i> Become a Member — ₹500
              </button>
              <Link to="/contact" className="btn btn-outline-white btn-lg">Talk to Us</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── ABOUT PAGE ─── */
function AboutPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>About Us</span></div>
          <h1>About FIP</h1>
          <p>Founded in 2020. Built by the professional fraternity, for the professional fraternity.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <span className="eyebrow">Our Story</span>
              <h2 className="section-heading">A Platform Born <span>From The Profession</span></h2>
              <p>Federation of Indian Professionals (FIP) is a non-profit organisation established in 2020 under the visionary leadership of <strong>CA Gaurav Aggarwal</strong>, created by members of the professional fraternity, for the professional fraternity.</p>
              <p>With a thriving membership of over <strong>3,000 seasoned experts and emerging practitioners</strong> across Chartered Accountancy, Company Secretaryship, Cost Accounting, and Law, FIP creates a collaborative environment where professionals connect, learn, and grow.</p>
              <p>At FIP, we go beyond webinars. From parliamentary visits and heritage walks to CSR initiatives at national monuments and five-star GST Conclaves — FIP shapes professionals who are socially conscious, continuously learning, and nationally engaged.</p>
              <div style={{marginTop:'28px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                <button className="btn btn-secondary" onClick={() => navigate('/membership')}><i className="fa-solid fa-user-plus"></i> Join FIP Today</button>
                <Link to="/team" className="btn btn-outline-blue">Meet the Team</Link>
              </div>
            </div>
            <div>
              <div className="about-card">
                <div className="about-card-lbl"><i className="fa-solid fa-bullseye"></i>&nbsp; Mission</div>
                <p>To create a collaborative platform empowering CAs, CSs, CMAs, Advocates and MBAs through knowledge sharing, professional growth, and continuous learning in the financial and legal sectors.</p>
              </div>
              <div className="about-card dark-card">
                <div className="about-card-lbl"><i className="fa-solid fa-eye"></i>&nbsp; Vision</div>
                <p>To be the leading network of finance professionals, driving excellence, innovation, and ethical practices while nurturing a national community committed to advancing the profession.</p>
              </div>
              <div className="about-card" style={{marginTop:'16px'}}>
                <div className="about-card-lbl"><i className="fa-solid fa-heart"></i>&nbsp; Core Philosophy — The 3 C's</div>
                {[
                  { icon:'fa-network-wired', cls:'ci-blue', title:'Connect', desc:'Build meaningful relationships with peers and industry leaders across finance disciplines.' },
                  { icon:'fa-people-group', cls:'ci-orange', title:'Collaborate', desc:'Work together, share knowledge, and develop solutions that drive the profession forward.' },
                  { icon:'fa-trophy', cls:'ci-green', title:'Conquer', desc:"Leverage FIP's resources, courses, and events to excel in your practice and career." },
                ].map((p,i) => (
                  <div className="phi-item" key={i}>
                    <div className={`phi-icon ${p.cls}`}><i className={`fa-solid ${p.icon}`}></i></div>
                    <div><div className="phi-title">{p.title}</div><div className="phi-desc">{p.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── COURSES PAGE ─── */
function CoursesPage() {
  const { openModal } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const allCourses = [
    { bg:'ct-blue', emoji:'📑', tag:'tag-hot', tagLabel:'Hot', cat:'GST & Indirect Tax', title:'Mastering GST Litigation — Sankalp 2026', instr:'CA Gaurav Aggarwal', sessions:'6 Sessions', level:'Intermediate', price:'₹999', free:false, category:'gst' },
    { bg:'ct-teal', emoji:'🏛', tag:'tag-free', tagLabel:'Free for Members', cat:'Corporate Law', title:'NCLT & Corporate Insolvency Practice', instr:'Expert Panel', sessions:'4 Sessions', level:'Advanced', price:'Members Free', free:true, category:'corp free' },
    { bg:'ct-orange', emoji:'📊', tag:null, tagLabel:null, cat:'Direct Tax', title:'Income Tax Search & Seizure — Practical Guide', instr:'Senior Practitioners', sessions:'5 Sessions', level:'Advanced', price:'₹1,499', free:false, category:'tax' },
    { bg:'ct-purple', emoji:'⚖️', tag:'tag-free', tagLabel:'Free for Members', cat:'Company Law', title:'FEMA & RBI Compliance for CS Professionals', instr:'CS Expert Panel', sessions:'3 Sessions', level:'Intermediate', price:'Members Free', free:true, category:'corp free' },
    { bg:'ct-green', emoji:'📈', tag:null, tagLabel:null, cat:'Finance & Valuation', title:'Business Valuation Under SEBI & IBC', instr:'IBBI Registered Valuers', sessions:'4 Sessions', level:'Advanced', price:'₹1,999', free:false, category:'corp' },
    { bg:'ct-red', emoji:'🔍', tag:null, tagLabel:null, cat:'Audit & Assurance', title:'Forensic Audit & Fraud Detection in Practice', instr:'CFE Practitioners', sessions:'5 Sessions', level:'Advanced', price:'₹1,299', free:false, category:'audit' },
  ];

  const filtered = allCourses.filter(c => {
    const matchCat = filter === 'all' || c.category.includes(filter);
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.cat.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Courses</span></div>
          <h1>Courses &amp; Programmes</h1>
          <p>Expert-led, CPE-eligible courses for CAs, CSs, CMAs and legal professionals.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="Search — GST, NCLT, Income Tax, Company Law…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="filter-pills">
            {[['all','All Courses'],['gst','GST & Indirect Tax'],['tax','Direct Tax'],['corp','Corporate Law'],['audit','Audit & Assurance'],['free','Free for Members']].map(([val,label]) => (
              <div key={val} className={`fpill${filter===val?' active':''}`} onClick={() => setFilter(val)}>{label}</div>
            ))}
          </div>
          <div className="course-grid">
            {filtered.map((c,i) => (
              <div className="course-card" key={i} onClick={() => openModal('enroll')}>
                <div className={`course-thumb ${c.bg}`}>
                  <span>{c.emoji}</span>
                  {c.tag && <span className={`course-tag ${c.tag}`}>{c.tagLabel}</span>}
                </div>
                <div className="course-body">
                  <div className="course-cat">{c.cat}</div>
                  <div className="course-title">{c.title}</div>
                  <div className="course-instr"><i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)'}}></i> {c.instr}</div>
                  <div className="course-meta"><span><i className="fa-regular fa-clock"></i> {c.sessions}</span><span><i className="fa-solid fa-signal"></i> {c.level}</span></div>
                  <div className="course-footer">
                    {c.free ? <span className="course-price-free">{c.price}</span> : <span className="course-price">{c.price}</span>}
                    <button className="c-enroll-btn" onClick={e => { e.stopPropagation(); openModal('enroll'); }}>Enroll Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p style={{textAlign:'center',color:'var(--text-muted)',padding:'40px'}}>No courses match your search.</p>}
        </div>
      </section>
    </>
  );
}

/* ─── MEMBERSHIP PAGE ─── */
function MembershipPage() {
  const { startCheckout } = useApp();
  const navigate = useNavigate();

  const plans = [
    {
      tier:'Standard', name:'Standard', price:'₹500', period:'/year', desc:'For new members', featured:false,
      features:['Access to member directory','Event RSVP & reminders','1 Committee membership','Monthly newsletter','CPE webinar access','Digital membership certificate'],
      btn:'Get Started', btnCls:'mem-btn-out',
      onClick: () => { startCheckout('FIP Standard Membership', 500); navigate('/payment'); }
    },
    {
      tier:'Renewal', name:'Renewal', price:'₹200', period:'/year', desc:'For renewing members', featured:true,
      features:['All Standard benefits','Priority event registration','2 Committee memberships','Mentorship programme access','Resource library full access','Annual conference pass'],
      btn:'Renew Now', btnCls:'mem-btn-solid',
      onClick: () => { startCheckout('FIP Renewal Membership', 200); navigate('/payment'); }
    },
    {
      tier:'Firm', name:'Firm Partner', price:'Custom', period:'', desc:'For firms & organisations', featured:false,
      features:['Up to 10 member seats','Firm branding on FIP','Unlimited committee access','Dedicated account manager','Custom CPE programmes','Partnership opportunities'],
      btn:'Contact Sales', btnCls:'mem-btn-out',
      onClick: () => navigate('/contact')
    },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span></div>
          <h1>Join the FIP Family</h1>
          <p>One membership. Unlimited professional growth. 3,000+ professionals trust FIP.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Membership Plans</span>
            <h2 className="section-heading">Choose Your <span>Plan</span></h2>
            <p className="section-sub">Transparent pricing. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="mem-grid">
            {plans.map((p,i) => (
              <div key={i} className={`mem-card${p.featured?' featured':''}`}>
                {p.featured && <div className="mem-badge-wrap"><span className="mem-badge">Most Popular</span></div>}
                <div className="mem-tier">{p.tier}</div>
                <div className="mem-name">{p.name}</div>
                <div className="mem-price">{p.price}<span>{p.period}</span></div>
                <div className="mem-period">{p.desc}</div>
                <div className="mem-divider"></div>
                <div className="mem-features">
                  {p.features.map((f,j) => (
                    <div className="mem-feat" key={j}><i className="fa-solid fa-check"></i>{f}</div>
                  ))}
                </div>
                <button className={p.btnCls} onClick={p.onClick}>{p.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── EVENTS PAGE ─── */
function EventsPage() {
  const { openModal } = useApp();

  const events = [
    { date:'Jan 11, 2026', title:'Rashtrapati Bhawan Visit', desc:'Exclusive guided visit to the President\'s residence. RSVP by Jan 2, 7 PM with your name, designation & ID proof.', type:'Physical · Delhi', typeClass:'evt-physical', seats:'120 seats' },
    { date:'Every Sunday', title:'Chartered Walk & Talk', desc:'Morning walks at India Gate, War Memorial & Firoz Shah Road. Networking meets wellness — free for all members.', type:'Physical · Delhi', typeClass:'evt-physical', seats:'Open to all' },
    { date:'Coming Soon', title:'GST Conclave 2026', desc:"Following Le Meridien's success, the next GST Conclave brings 500+ professionals for a full-day indirect tax summit.", type:'Notify Me', typeClass:'evt-virtual', seats:'500+ capacity' },
  ];

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
          <div className="shflex">
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2 className="section-heading">Events &amp; <span>Programmes</span></h2>
              <p className="section-sub">FIP hosts physical meet-ups, heritage visits, webinars, and multi-city summits.</p>
            </div>
          </div>
          <div className="event-grid">
            {events.map((e,i) => (
              <div className="ev-light" key={i} onClick={() => openModal('rsvp')}>
                <div className="ev-date"><i className="fa-regular fa-calendar"></i> {e.date}</div>
                <div className="ev-title">{e.title}</div>
                <div className="ev-desc">{e.desc}</div>
                <div className="ev-footer">
                  <span className={`ev-type ${e.typeClass}`}>{e.type}</span>
                  <button className="ev-rsvp-btn" onClick={ev => { ev.stopPropagation(); openModal('rsvp'); }}>RSVP</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── BLOG PAGE ─── */
function BlogPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');

  const posts = [
    { slug:'blog1', thumb:'📋', thumbCls:'bt-blue', cat:'GST', title:'New GST Amnesty Scheme 2025 — What Practitioners Must Know', date:'Jun 2025', read:'5 min', badge:'badge-orange', badgeLabel:'GST' },
    { slug:'blog2', thumb:'⚖️', thumbCls:'bt-orange', cat:'Corporate Law', title:'NCLT Landmark Judgements in 2025 — Summary for CS Professionals', date:'May 2025', read:'8 min', badge:'badge-blue', badgeLabel:'Corp Law' },
    { slug:'blog3', thumb:'📊', thumbCls:'bt-green', cat:'Direct Tax', title:'Budget 2025 — Key Changes Affecting Your CA Practice', date:'Feb 2025', read:'10 min', badge:'badge-orange', badgeLabel:'Tax' },
    { slug:'blog4', thumb:'🌐', thumbCls:'bt-purple', cat:'FEMA & RBI', title:'New FEMA Reporting Requirements — A Compliance Checklist', date:'Jan 2025', read:'6 min', badge:'badge-blue', badgeLabel:'FEMA' },
    { slug:'blog5', thumb:'🔍', thumbCls:'bt-red', cat:'Audit', title:'Red Flags in Financial Statements — A Forensic Audit Perspective', date:'Dec 2024', read:'7 min', badge:'badge-blue', badgeLabel:'Audit' },
    { slug:'blog6', thumb:'🤝', thumbCls:'bt-teal', cat:'FIP Updates', title:'FIP Parliament Visit — 300 CAs Step Into Policy Making', date:'May 2025', read:'4 min', badge:'badge-green', badgeLabel:'FIP' },
  ];

  const filters = ['All','GST','Direct Tax','Corporate Law','FEMA & RBI','Audit','FIP Updates'];
  const visible = filter === 'All' ? posts : posts.filter(p => p.cat === filter);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Blog</span></div>
          <h1>Insights &amp; Analysis</h1>
          <p>Expert perspectives on tax, law, compliance, and professional practice from FIP's community.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="filter-pills">
            {filters.map(f => (
              <div key={f} className={`fpill${filter===f?' active':''}`} onClick={() => setFilter(f)}>{f}</div>
            ))}
          </div>
          <div className="blog-grid">
            {visible.map((p,i) => (
              <div className="blog-card" key={i} onClick={() => navigate(`/blog/${p.slug}`)}>
                <div className={`blog-thumb ${p.thumbCls}`}>{p.thumb}</div>
                <div className="blog-body">
                  <div className="blog-cat">{p.cat}</div>
                  <div className="blog-title">{p.title}</div>
                  <div className="blog-meta">
                    <span>{p.date} · {p.read}</span>
                    <span className={`badge ${p.badge}`}>{p.badgeLabel}</span>
                  </div>
                  <div className="blog-readmore">Read Article <i className="fa-solid fa-arrow-right"></i></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── BLOG ARTICLE PAGE ─── */
function BlogArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = articles.find(a => a.slug === slug);

  if (!article) return (
    <div style={{padding:'60px 24px',textAlign:'center'}}>
      <h2 style={{color:'var(--blue)',marginBottom:'16px'}}>Article not found</h2>
      <button className="btn btn-secondary" onClick={() => navigate('/blog')}>Back to Blog</button>
    </div>
  );

  return (
    <>
      <div className="article-hero">
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'10px'}}>
            Home <i className="fa-solid fa-chevron-right"></i>
            <span style={{cursor:'pointer',color:'rgba(255,255,255,0.5)'}} onClick={() => navigate('/blog')}>Blog</span>
            <i className="fa-solid fa-chevron-right"></i>
            <span>{article.category}</span>
          </div>
          <div className="article-badge">{article.category}</div>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta-bar">
            <span><i className="fa-regular fa-calendar"></i> {article.date}</span>
            <span><i className="fa-regular fa-clock"></i> {article.readTime}</span>
            <span><i className="fa-solid fa-user-tie"></i> {article.author}</span>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="article-layout">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: article.body }}/>
          <div className="article-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-title">Related Articles</div>
              {articles.filter(a => a.slug !== slug).slice(0,3).map((a,i) => (
                <div className="related-art" key={i} onClick={() => navigate(`/blog/${a.slug}`)}>
                  <div className={`related-thumb bt-${['blue','orange','green'][i]}`}>
                    {['📋','⚖️','📊'][i]}
                  </div>
                  <div>
                    <div className="related-title">{a.title}</div>
                    <div className="related-cat">{a.category}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sidebar-card" style={{background:'var(--blue)',borderColor:'transparent'}}>
              <div className="sidebar-card-title" style={{color:'#FFD09B',borderColor:'rgba(255,255,255,0.15)'}}>Join FIP Today</div>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',marginBottom:'14px'}}>Get access to all articles, recordings, and courses for just ₹500/year.</p>
              <button className="btn btn-primary btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/membership')}>Join for ₹500</button>
            </div>
            <div className="sidebar-card">
              <div className="sidebar-card-title">Upcoming Events</div>
              <div style={{fontSize:'13px',color:'var(--text-muted)',display:'flex',flexDirection:'column',gap:'8px'}}>
                <div style={{padding:'8px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={() => navigate('/events')}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--orange)'}}>Jan 11, 2026</div>
                  <div style={{fontWeight:600,color:'var(--blue)'}}>Rashtrapati Bhawan Visit</div>
                </div>
                <div style={{padding:'8px 0',cursor:'pointer'}} onClick={() => navigate('/events')}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--orange)'}}>Coming Soon</div>
                  <div style={{fontWeight:600,color:'var(--blue)'}}>GST Conclave 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── TEAM PAGE ─── */
function TeamPage() {
  const { showToast } = useApp();
  const team = [
    { initials:'GA', cls:'av-blue', name:'CA Gaurav Aggarwal', role:'Founder & President', qual:'Chartered Accountant · Delhi' },
    { initials:'SS', cls:'av-blue2', name:'CA Sadhna Sharma', role:'Core Team Member', qual:'CA · MBA (IIMA)' },
    { initials:'GG', cls:'av-blue2', name:'Adv. Gaurav Gupta', role:'Legal Advisor', qual:'Advocate · High Court of Delhi' },
    { initials:'RP', cls:'av-purple', name:'CA Rajesh Patel', role:'Programme Head', qual:'Chartered Accountant' },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Team</span></div>
          <h1>Our Team</h1>
          <p>Professionals leading a community of professionals.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Leadership</span>
            <h2 className="section-heading">Founders &amp; <span>Core Team</span></h2>
            <p className="section-sub">The professionals who built FIP from the ground up and continue to drive its mission every day.</p>
          </div>
          <div className="team-grid">
            {team.map((t,i) => (
              <div className="team-card" key={i}>
                <div className={`team-av ${t.cls}`}>{t.initials}</div>
                <div className="team-name">{t.name}</div>
                <div className="team-role">{t.role}</div>
                <div className="team-qual">{t.qual}</div>
                <div className="team-socials">
                  <div className="team-sb" onClick={() => showToast('Opening LinkedIn…')}><i className="fa-brands fa-linkedin-in"></i></div>
                  <div className="team-sb" onClick={() => showToast('Opening WhatsApp…')}><i className="fa-brands fa-whatsapp"></i></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── CONTACT PAGE ─── */
function ContactPage() {
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
                  <div className="form-group"><label className="form-label" htmlFor="c-name">Full Name *</label><input className="form-input" type="text" id="c-name" placeholder="CA / CS / Adv. Full Name" required/></div>
                  <div className="form-group"><label className="form-label" htmlFor="c-email">Email *</label><input className="form-input" type="email" id="c-email" placeholder="you@example.com" required/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label" htmlFor="c-phone">Phone</label><input className="form-input" type="tel" id="c-phone" placeholder="+91 XXXXX XXXXX"/></div>
                  <div className="form-group"><label className="form-label" htmlFor="c-subject">Subject</label>
                    <select className="form-select" id="c-subject">
                      <option>Membership Enquiry</option>
                      <option>Course Registration</option>
                      <option>Event Sponsorship</option>
                      <option>Speaker Invitation</option>
                      <option>Media &amp; Press</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label" htmlFor="c-msg">Message *</label><textarea className="form-textarea" id="c-msg" placeholder="How can we help you?" required></textarea></div>
                <button type="submit" className="btn btn-secondary" style={{width:'100%',justifyContent:'center',padding:'13px'}}>Send Message <i className="fa-solid fa-paper-plane"></i></button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── COMMITTEES PAGE ─── */
function CommitteesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(committees.map(c => c.category))];
  const filtered = committees.filter(c =>
    (filter === 'All' || c.category === filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase()))
  );

  // Determine avatar class and role class based on role string
  const getRoleStyle = (role) => {
    const r = role.toLowerCase();
    if (r.includes('president') || r.includes('chairman') || r.includes('chairperson')) {
      return { avCls: 'cm-av-chair', roleCls: 'cm-role-chair' };
    }
    if (r.includes('vice') || r.includes('co-chair') || r.includes('secretary') || r.includes('treasurer')) {
      return { avCls: 'cm-av-vice', roleCls: 'cm-role-vice' };
    }
    return { avCls: 'cm-av-member', roleCls: 'cm-role-member' };
  };

  const getInitials = (name) =>
    name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Committees</span></div>
          <h1>Our Committees</h1>
          <p>Specialist groups driving policy, practice excellence, and professional advocacy across FIP.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="committee-filter-bar">
            <div className="search-wrap" style={{marginBottom:0}}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" placeholder="Search committees…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="filter-pills" style={{marginBottom:0}}>
              {categories.map(c => (
                <div key={c} className={`fpill${filter===c?' active':''}`} onClick={() => setFilter(c)}>{c}</div>
              ))}
            </div>
          </div>
          <div className="committee-grid">
            {filtered.map(c => (
              <div className="committee-card" key={c.id}>
                {/* Blue gradient header — icon + name + abbr */}
                <div className="committee-header">
                  <div className="committee-icon"><i className={c.icon}></i></div>
                  <div className="committee-name">{c.name}</div>
                  <div className="committee-abbr">{c.abbr || c.category}</div>
                </div>
                {/* Members list */}
                <div className="committee-members">
                  {c.members.map((m, i) => {
                    const { avCls, roleCls } = getRoleStyle(m.role);
                    const initials = getInitials(m.name);
                    return (
                      <div className="cm-row" key={i}>
                        <div className={`cm-av ${avCls}`}>{initials}</div>
                        <div>
                          <div className="cm-name">{m.name}</div>
                          <div className={`cm-role ${roleCls}`}>{m.role.toUpperCase()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p style={{textAlign:'center',color:'var(--text-muted)',padding:'48px 0'}}>No committees match your search.</p>
          )}
        </div>
      </section>
    </>
  );
}

/* ─── DIRECTORY PAGE ─── */
function DirectoryPage() {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [profFilter, setProfFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const filtered = members.filter(m => {
    const matchProf = profFilter === 'all' || m.profession === profFilter;
    const matchCity = cityFilter === 'all' || m.city === cityFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.speciality.toLowerCase().includes(search.toLowerCase());
    return matchProf && matchCity && matchSearch;
  });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Member Directory</span></div>
          <h1>Member Directory</h1>
          <p>Connect with 3,000+ professionals across CA, CS, CMA and Law practices.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}}>
            <div className="search-wrap" style={{flex:1,minWidth:'260px',marginBottom:0}}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="dir-search" placeholder="Search by name, firm or specialisation…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <select className="form-select" style={{width:'180px'}} value={profFilter} onChange={e => setProfFilter(e.target.value)}>
              <option value="all">All Professions</option>
              <option value="CA">Chartered Accountants</option>
              <option value="CS">Company Secretaries</option>
              <option value="CMA">Cost Accountants</option>
              <option value="Advocate">Advocates</option>
            </select>
            <select className="form-select" style={{width:'160px'}} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="all">All Cities</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Showing {filtered.length} members</p>
          <div className="dir-grid">
            {filtered.map(m => {
              const initials = m.name.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2);
              return (
                <div className="dir-card" key={m.id}>
                  <div className="dir-av">{initials}</div>
                  <div>
                    <div className="dir-name">{m.name}</div>
                    <div className="dir-desg">{m.designation}</div>
                    <div className="dir-city"><i className="fa-solid fa-location-dot" style={{color:'var(--orange)',fontSize:'10px',marginRight:'4px'}}></i>{m.city}</div>
                    <div className="dir-tags">
                      <span className="dir-tag">{m.profession}</span>
                      <span className="dir-tag">{m.speciality}</span>
                    </div>
                    <button className="dir-connect-btn" onClick={() => showToast(`Connection request sent to ${m.name}!`)}>Connect</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── WEBINARS PAGE ─── */
function WebinarsPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  const videos = [
    { title:'GST Masterclass — Sankalp 2026', speaker:'CA Gaurav Aggarwal', duration:'1:28:00', date:'Dec 2025', desc:'A comprehensive walkthrough of recent GST amendments, litigation strategies, and appeal procedures for practising tax professionals.' },
    { title:'NCLT Procedure & Insolvency Practice', speaker:'Adv. Gaurav Gupta', duration:'1:12:00', date:'Nov 2025', desc:'End-to-end guidance on CIRP filings, timeline management, and navigating NCLT benches.' },
    { title:'Income Tax Search & Seizure', speaker:'Senior Practitioners Panel', duration:'58:00', date:'Oct 2025', desc:'Real-world case studies and practical tips on handling IT raids and post-search compliance.' },
    { title:'FEMA Compliance for CS Professionals', speaker:'CS Expert Panel', duration:'45:00', date:'Sep 2025', desc:'Key FEMA reporting obligations, ODI/FDI norms, and RBI compliance checklists for Company Secretaries.' },
    { title:'Business Valuation Under IBC', speaker:'IBBI Registered Valuers', duration:'1:05:00', date:'Aug 2025', desc:'Valuation methodologies applicable in insolvency resolution and their practical application.' },
  ];

  const active = videos[activeIdx];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Webinars</span></div>
          <h1>Webinars &amp; Recordings</h1>
          <p>On-demand access to 200+ expert sessions. New webinars added every week.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="video-grid">
            <div>
              <div className="video-player-wrap">
                <div className="video-placeholder">
                  <div className="vp-play"><i className="fa-solid fa-play"></i></div>
                  <div className="vp-title">{active.title}</div>
                  <div className="vp-meta">{active.speaker} · {active.duration}</div>
                </div>
              </div>
              <div className="video-info-panel" style={{marginTop:'20px'}}>
                <div className="video-info-title">{active.title}</div>
                <div className="video-tags">
                  <span className="badge badge-blue">{active.speaker}</span>
                  <span className="badge badge-gray">{active.duration}</span>
                  <span className="badge badge-orange">{active.date}</span>
                </div>
                <div className="video-desc">{active.desc}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>All Recordings</div>
              {videos.map((v,i) => (
                <div className="video-list-item" key={i} onClick={() => setActiveIdx(i)} style={{opacity: i===activeIdx ? 1 : 0.75}}>
                  <div className="vli-thumb">
                    <i className="fa-solid fa-play" style={{fontSize:'12px'}}></i>
                    <span className="vli-dur">{v.duration}</span>
                  </div>
                  <div>
                    <div className="vli-title">{v.title}</div>
                    <div className="vli-meta">{v.speaker} · {v.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── PAYMENT PAGE ─── */
function PaymentPage() {
  const { checkoutPlan, showToast } = useApp();
  const navigate = useNavigate();
  const [payMethod, setPayMethod] = useState('upi');
  const gst = Math.round(checkoutPlan.amount * 0.18);
  const total = checkoutPlan.amount + gst;

  const handlePay = e => {
    e.preventDefault();
    showToast('Payment successful! Welcome to FIP.');
    setTimeout(() => navigate('/payment-success'), 600);
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span> <i className="fa-solid fa-chevron-right"></i> <span>Checkout</span></div>
          <h1>Secure Checkout</h1>
          <p>Complete your payment to activate your FIP membership.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container" style={{maxWidth:'720px'}}>
          <div className="checkout-steps">
            <div className="cs-step done"><div className="cs-num"><i className="fa-solid fa-check" style={{fontSize:'10px'}}></i></div><span>Plan Selected</span></div>
            <div className="cs-line done"></div>
            <div className="cs-step active"><div className="cs-num">2</div><span>Payment</span></div>
            <div className="cs-line"></div>
            <div className="cs-step"><div className="cs-num">3</div><span>Confirmation</span></div>
          </div>
          <div className="order-summary">
            <div style={{fontSize:'12px',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>Order Summary</div>
            <div className="os-row"><span>Plan</span><span>{checkoutPlan.name}</span></div>
            <div className="os-row"><span>Validity</span><span>Apr 2025 – Mar 2026</span></div>
            <div className="os-row"><span>GST (18%)</span><span>₹{gst}</span></div>
            <div className="os-row os-total"><span>Total</span><span>₹{total}</span></div>
          </div>
          <form onSubmit={handlePay}>
            <div className="admin-form-card">
              <div className="admin-form-title"><i className="fa-solid fa-user" style={{color:'var(--orange)'}}></i>&nbsp; Member Details</div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" type="text" placeholder="As per ICAI / ICSI records" required/></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" placeholder="you@example.com" required/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Mobile *</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" required/></div>
                <div className="form-group"><label className="form-label">Profession</label>
                  <select className="form-select">
                    <option>Chartered Accountant</option><option>Company Secretary</option>
                    <option>Cost Accountant</option><option>Advocate</option><option>Other</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="payment-card">
              <div className="payment-card-title"><i className="fa-solid fa-lock" style={{color:'var(--green)'}}></i>&nbsp; Choose Payment Method</div>
              {[
                { id:'upi', icon:'📱', label:'UPI', desc:'GPay, PhonePe, Paytm, BHIM & all UPI apps' },
                { id:'card', icon:'💳', label:'Credit / Debit Card', desc:'Visa, Mastercard, RuPay' },
                { id:'netbanking', icon:'🏦', label:'Net Banking', desc:'All major Indian banks supported' },
              ].map(pm => (
                <div key={pm.id}>
                  <div className={`pay-option${payMethod===pm.id?' selected':''}`} onClick={() => setPayMethod(pm.id)}>
                    <div className="pay-radio"></div>
                    <div className="pay-icon">{pm.icon}</div>
                    <div><div className="pay-label">{pm.label}</div><div className="pay-desc">{pm.desc}</div></div>
                  </div>
                  {payMethod === 'upi' && pm.id === 'upi' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <div className="upi-input-wrap"><i className="fa-solid fa-at" style={{color:'var(--text-light)',fontSize:'13px'}}></i><input type="text" placeholder="yourname@upi" style={{fontSize:'14px'}}/></div>
                    </div>
                  )}
                  {payMethod === 'card' && pm.id === 'card' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <div className="form-group"><label className="form-label">Card Number</label><input className="form-input" type="text" placeholder="1234 5678 9012 3456" maxLength={19}/></div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Expiry</label><input className="form-input" type="text" placeholder="MM / YY" maxLength={7}/></div>
                        <div className="form-group"><label className="form-label">CVV</label><input className="form-input" type="password" placeholder="•••" maxLength={3}/></div>
                      </div>
                      <div className="form-group"><label className="form-label">Name on Card</label><input className="form-input" type="text" placeholder="Full Name"/></div>
                    </div>
                  )}
                  {payMethod === 'netbanking' && pm.id === 'netbanking' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <select className="form-select"><option value="">Select your bank</option><option>SBI</option><option>HDFC</option><option>ICICI</option><option>Axis</option><option>Kotak</option></select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'var(--text-light)',marginBottom:'16px'}}>
              <i className="fa-solid fa-shield-halved" style={{color:'var(--green)'}}></i>
              100% secure payment. Your data is encrypted and never stored on our servers.
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center'}}>
              <i className="fa-solid fa-lock"></i> Pay ₹{total} Securely
            </button>
            <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-light)',marginTop:'12px'}}>
              By completing payment you agree to FIP's <span style={{color:'var(--orange)',cursor:'pointer'}}>Terms &amp; Conditions</span>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}

/* ─── PAYMENT SUCCESS PAGE ─── */
function PaymentSuccessPage() {
  const navigate = useNavigate();
  const txnId = 'FIP-2026-' + String(Math.floor(Math.random()*90000)+10000);
  return (
    <section className="section section-alt">
      <div className="container" style={{maxWidth:'560px',textAlign:'center',paddingTop:'80px',paddingBottom:'80px'}}>
        <div style={{width:'80px',height:'80px',background:'var(--green-pale)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',border:'3px solid var(--green)'}}>
          <i className="fa-solid fa-check" style={{fontSize:'32px',color:'var(--green)'}}></i>
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'32px',fontWeight:800,color:'var(--blue)',marginBottom:'10px'}}>Payment Successful!</h1>
        <p style={{fontSize:'16px',color:'var(--text-muted)',marginBottom:'8px'}}>Welcome to the FIP family!</p>
        <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px',margin:'28px 0',textAlign:'left'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px'}}>Transaction Details</div>
          {[
            {label:'Transaction ID', val:txnId, valStyle:{fontWeight:700,color:'var(--blue)'}},
            {label:'Plan', val:'FIP Standard Membership', valStyle:{fontWeight:700,color:'var(--blue)'}},
            {label:'Amount Paid', val:'₹500', valStyle:{fontWeight:700,color:'var(--green)'}},
            {label:'Valid Until', val:'31 March 2026', valStyle:{fontWeight:700,color:'var(--blue)'}},
          ].map((r,i,a) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'13px',padding:'8px 0',borderBottom:i<a.length-1?'1px solid var(--border)':'none'}}>
              <span style={{color:'var(--text-muted)'}}>{r.label}</span>
              <span style={r.valStyle}>{r.val}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'28px'}}>A confirmation email has been sent. Your membership certificate will be issued within 24 hours.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-circle-user"></i> Go to My Dashboard</button>
          <button className="btn btn-outline-blue" onClick={() => navigate('/')}><i className="fa-solid fa-house"></i> Back to Home</button>
        </div>
      </div>
    </section>
  );
}

/* ─── DASHBOARD PAGE ─── */
function DashboardPage() {
  const [tab, setTab] = useState('overview');
  const { showToast } = useApp();
  const navigate = useNavigate();

  const navItems = [
    { id:'overview', icon:'fa-gauge-high', label:'Overview' },
    { id:'courses', icon:'fa-book-open', label:'My Courses' },
    { id:'events', icon:'fa-calendar-check', label:'Events' },
    { id:'cpe', icon:'fa-graduation-cap', label:'CPE Credits' },
    { id:'settings', icon:'fa-gear', label:'Settings' },
  ];

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-profile">
          <div className="dash-av">GA</div>
          <div className="dash-mname">CA Gaurav Aggarwal</div>
          <div className="dash-mrole">Founder & President</div>
          <span className="dash-mbadge">Standard Member</span>
        </div>
        <nav>
          {navItems.map(n => (
            <button key={n.id} className={`dash-nav-btn${tab===n.id?' active':''}`} onClick={() => setTab(n.id)}>
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="dash-content">
        {tab === 'overview' && (
          <>
            <div className="dash-card">
              <div className="dash-card-title">My Overview <span style={{fontSize:'12px',color:'var(--orange)',cursor:'pointer'}}>View All</span></div>
              <div className="dash-metrics">
                <div className="dash-metric"><div className="dash-mval">18</div><div className="dash-mlbl">CPE Hours</div></div>
                <div className="dash-metric"><div className="dash-mval">3</div><div className="dash-mlbl">Courses</div></div>
                <div className="dash-metric"><div className="dash-mval">12</div><div className="dash-mlbl">Events</div></div>
              </div>
              <div className="prog-wrap">
                <div className="prog-label"><span>CPE Hours Completed</span><span>18 / 25</span></div>
                <div className="prog-track"><div className="prog-fill" style={{width:'72%'}}></div></div>
              </div>
              <div className="prog-wrap" style={{marginTop:'12px'}}>
                <div className="prog-label"><span>Course Completion</span><span>60%</span></div>
                <div className="prog-track"><div className="prog-fill orange" style={{width:'60%'}}></div></div>
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-card-title">Upcoming Events</div>
              {[
                { day:'11', mon:'JAN', title:'Rashtrapati Bhawan Visit', time:'10:00 AM · Delhi' },
                { day:'15', mon:'FEB', title:'GST Conclave 2026', time:'Coming Soon · TBD' },
              ].map((e,i) => (
                <div className="upcoming-item" key={i}>
                  <div className="udate-box"><div className="udb-day">{e.day}</div><div className="udb-mon">{e.mon}</div></div>
                  <div><div className="up-title">{e.title}</div><div className="up-time">{e.time}</div></div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'courses' && (
          <div className="dash-card">
            <div className="dash-card-title">My Courses</div>
            {[
              { title:'Mastering GST Litigation — Sankalp 2026', sub:'CA Gaurav Aggarwal · 6 Sessions', progress:60 },
              { title:'NCLT & Corporate Insolvency Practice', sub:'Expert Panel · 4 Sessions', progress:30 },
              { title:'Income Tax Search & Seizure', sub:'Senior Practitioners · 5 Sessions', progress:0 },
            ].map((c,i) => (
              <div className="my-course-item" key={i}>
                <div style={{flex:1}}>
                  <div className="mci-title">{c.title}</div>
                  <div className="mci-sub">{c.sub}</div>
                  <div className="prog-track"><div className="prog-fill" style={{width:`${c.progress}%`}}></div></div>
                  <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>{c.progress}% complete</div>
                </div>
                <button className="btn btn-outline-blue btn-sm">Continue</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'events' && (
          <div className="dash-card">
            <div className="dash-card-title">My RSVPs</div>
            {[
              { title:'Rashtrapati Bhawan Visit', date:'Jan 11, 2026', status:'Confirmed' },
              { title:'Chartered Walk & Talk', date:'Every Sunday', status:'Active' },
            ].map((e,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                <div>
                  <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)'}}>{e.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{e.date}</div>
                </div>
                <span className="status-pill sp-active">{e.status}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'cpe' && (
          <div className="dash-card">
            <div className="dash-card-title">CPE Credit Tracker</div>
            <div className="dash-metrics" style={{marginBottom:'20px'}}>
              <div className="dash-metric"><div className="dash-mval">18</div><div className="dash-mlbl">Hours Earned</div></div>
              <div className="dash-metric"><div className="dash-mval">7</div><div className="dash-mlbl">Hours Needed</div></div>
              <div className="dash-metric"><div className="dash-mval">72%</div><div className="dash-mlbl">Progress</div></div>
            </div>
            <div className="prog-track"><div className="prog-fill" style={{width:'72%'}}></div></div>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'16px'}}>You need 7 more CPE hours by March 2026. Browse available courses to complete your requirement.</p>
            <button className="btn btn-secondary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/courses')}>Browse Courses</button>
          </div>
        )}
        {tab === 'settings' && (
          <div className="dash-card">
            <div className="dash-card-title">Profile Settings</div>
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" defaultValue="CA Gaurav Aggarwal"/></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue="fippresidentoffice@gmail.com"/></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" defaultValue="+91 99998 30938"/></div>
            <button className="btn btn-secondary btn-sm" onClick={() => showToast('Settings saved!')}>Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ADMIN PAGE ─── */
function AdminPage() {
  const [tab, setTab] = useState('dashboard');

  const navItems = [
    { id:'dashboard', icon:'fa-chart-line', label:'Dashboard' },
    { id:'members', icon:'fa-users', label:'Members' },
    { id:'courses', icon:'fa-book', label:'Courses' },
    { id:'events', icon:'fa-calendar', label:'Events' },
    { id:'settings', icon:'fa-gear', label:'Settings' },
  ];

  const mockMembers = [
    { name:'CA Gaurav Aggarwal', profession:'CA', plan:'Standard', joined:'2020', status:'Active' },
    { name:'CA Sadhna Sharma', profession:'CA', plan:'Standard', joined:'2021', status:'Active' },
    { name:'Adv. Gaurav Gupta', profession:'Advocate', plan:'Standard', joined:'2021', status:'Active' },
    { name:'CA Rajesh Patel', profession:'CA', plan:'Renewal', joined:'2022', status:'Active' },
    { name:'CS Meera Krishnan', profession:'CS', plan:'Standard', joined:'2023', status:'Pending' },
  ];

  return (
    <div id="page-admin">
      <div style={{background:'var(--blue)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',color:'#fff',fontSize:'14px',fontWeight:700}}>
          <i className="fa-solid fa-shield-halved" style={{color:'#FFD09B'}}></i>
          FIP Admin Panel
        </div>
        <Link to="/" style={{color:'rgba(255,255,255,0.6)',fontSize:'13px'}}>← Back to Site</Link>
      </div>
      <div className="admin-layout">
        <div className="admin-sidebar-panel">
          <div className="admin-nav-section">Main</div>
          {navItems.map(n => (
            <button key={n.id} className={`admin-nav-item${tab===n.id?' active':''}`} onClick={() => setTab(n.id)}>
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
            </button>
          ))}
        </div>
        <div className="admin-content-panel">
          {tab === 'dashboard' && (
            <div className="admin-stats-row">
              {[
                { icon:'fa-users', cls:'fi-blue', val:'3,000+', lbl:'Total Members', delta:'+120 this month' },
                { icon:'fa-book', cls:'fi-orange', val:'6', lbl:'Active Courses', delta:'+2 this quarter' },
                { icon:'fa-calendar', cls:'fi-green', val:'3', lbl:'Upcoming Events', delta:'Next: Jan 11' },
                { icon:'fa-indian-rupee-sign', cls:'fi-purple', val:'₹10L+', lbl:'Sponsorship MTD', delta:'↑ 22% vs last' },
              ].map((s,i) => (
                <div className="admin-stat-card" key={i}>
                  <div className={`asc-icon ${s.cls}`}><i className={`fa-solid ${s.icon}`}></i></div>
                  <div>
                    <div className="asc-val">{s.val}</div>
                    <div className="asc-lbl">{s.lbl}</div>
                    <div className="asc-delta delta-up"><i className="fa-solid fa-arrow-up"></i>{s.delta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'members' && (
            <div className="admin-form-card">
              <div className="admin-form-title">Member Management</div>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Profession</th><th>Plan</th><th>Joined</th><th>Status</th></tr></thead>
                <tbody>
                  {mockMembers.map((m,i) => (
                    <tr key={i}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.profession}</td>
                      <td>{m.plan}</td>
                      <td>{m.joined}</td>
                      <td><span className={`status-pill ${m.status==='Active'?'sp-active':'sp-pending'}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(tab === 'courses' || tab === 'events') && (
            <div className="admin-form-card" style={{textAlign:'center',padding:'60px 24px',color:'var(--text-muted)'}}>
              <i className={`fa-solid ${tab==='courses'?'fa-book':'fa-calendar'}`} style={{fontSize:'32px',marginBottom:'12px',display:'block',color:'var(--border-dark)'}}></i>
              <p>Content management for {tab} coming soon.</p>
            </div>
          )}
          {tab === 'settings' && (
            <div className="admin-form-card">
              <div className="admin-form-title">General Settings</div>
              <div className="form-group"><label className="form-label">Organisation Name</label><input className="form-input" type="text" defaultValue="Federation of Indian Professionals"/></div>
              <div className="form-group"><label className="form-label">Admin Email</label><input className="form-input" type="email" defaultValue="fippresidentoffice@gmail.com"/></div>
              <button className="admin-btn admin-btn-primary">Save Settings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── APP CONTENT ─── */
function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <>
      {!isAdmin && <AnnounceBar />}
      {!isAdmin && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/committees" element={<CommitteesPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/webinars" element={<WebinarsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
      </Routes>
      {!isAdmin && <Footer />}
      <a href="https://wa.me/919999830938" className="wa-fab" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
        <i className="fa-brands fa-whatsapp"></i>
      </a>
      <Toast />
      <Modals />
    </>
  );
}

/* ─── APP ROOT ─── */
export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
}