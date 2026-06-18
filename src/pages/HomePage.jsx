import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

const FALLBACK = [
  { id:'f1', name:'Adv. Gaurav Gupta', designation:'Advocate · High Court of Delhi', content:'FIP stands as a dynamic platform dedicated to empowering professionals. With its consistent focus on knowledge-sharing and expert-led sessions, FIP has become a vital force in enriching professional growth and fostering a strong community committed to excellence.', rating:5 },
  { id:'f2', name:'CA Sadhna Sharma', designation:'Chartered Accountant · MBA (IIMA)', content:'Being part of FIP has been an enriching experience. FIP stands out as a vibrant platform that brings together finance and legal professionals from diverse backgrounds, fostering a community of continuous learning and collaboration.', rating:5 },
];

export default function HomePage() {
  const { openModal, startCheckout } = useApp();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState(FALLBACK);

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id, name, designation, profession, content, rating')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .then(({ data }) => { if (data && data.length > 0) setTestimonials(data); });
  }, []);

  /* ── SLIDES CONFIG — replace image URLs when ready ── */
  const SLIDES = [
    {
      type: 'hero', // Slide 1 — hero section
    },
    {
      // Slide 2 — image 1.png
      type: 'image',
      image: '/image%201.png',
      badge: 'FIP Highlights',
      title: "Building India's Finest Professional Network",
      subtitle: 'Connect · Collaborate · Conquer',
      desc: "FIP brings together the brightest minds in Chartered Accountancy, Company Secretaryship, Cost Accounting and Law.",
      btnLabel: 'Join FIP — ₹500/yr',
      btnAction: 'join',
      tag: '3,000+ Members',
    },
    {
      // Slide 3 — image 2.jpeg
      type: 'image',
      image: '/image%202.jpg',
      badge: 'Community Events',
      title: 'Chartered Walk & Talk',
      subtitle: 'Every Sunday · India Gate, New Delhi',
      desc: 'Morning walks at India Gate, War Memorial and Firoz Shah Road. Networking meets wellness — free for all members.',
      btnLabel: 'RSVP Now',
      btnAction: 'rsvp',
      tag: 'Every Sunday',
    },
    {
      // Slide 4 — image 3.jpeg
      type: 'image',
      image: '/image%203.jpg',
      badge: 'Professional Growth',
      title: 'Expert-Led Certificate Programmes',
      subtitle: 'ICAI CPE Eligible · Practical & Case-Study Driven',
      desc: 'From GST Litigation to IBC Practice — our courses are built for working professionals who want to stay ahead.',
      btnLabel: 'Browse Courses',
      btnAction: 'courses',
      tag: '15+ Programmes',
    },
    {
      // Slide 5 — image 4.jpeg
      type: 'image',
      image: '/image%204.jpg',
      badge: 'Flagship Event',
      title: 'GST Conclave 2026',
      subtitle: "India's Largest GST Summit",
      desc: 'Following the success of our Le Meridien Conclave, 500+ professionals gather for a full-day indirect tax summit.',
      btnLabel: 'Know More',
      btnAction: 'events',
      tag: 'Coming Soon',
    },
    {
      // Slide 6 — image 5.jpeg
      type: 'image',
      image: '/image%205.jpg',
      badge: 'Exclusive Access',
      title: 'Rashtrapati Bhawan Visit',
      subtitle: 'Parliament & Heritage Experience',
      desc: "FIP members get exclusive guided access to India's most prestigious landmarks. Limited seats, RSVP required.",
      btnLabel: 'RSVP Now',
      btnAction: 'rsvp',
      tag: 'Jan 2026',
    },
    {
      // Slide 7 — image 6.jpeg
      type: 'image',
      image: '/image%206.jpg',
      badge: 'Knowledge Sessions',
      title: 'Expert Webinars & Masterclasses',
      subtitle: '200+ Sessions · On-Demand Access',
      desc: 'Weekly expert sessions on GST, Income Tax, NCLT, FEMA and more. Attend live or access recordings anytime.',
      btnLabel: 'View Webinars',
      btnAction: 'webinars',
      tag: '200+ Recorded',
    },
    {
      // Slide 8 — image 7.jpeg
      type: 'image',
      image: '/image%207.jpg',
      badge: 'Policy & Advocacy',
      title: 'Shaping the Profession Together',
      subtitle: 'Representations to CBDT · CBIC · MCA · SEBI',
      desc: 'FIP members collectively voice the profession. Our committees make real representations to regulatory bodies.',
      btnLabel: 'Our Committees',
      btnAction: 'committees',
      tag: '9 Committees',
    },
    {
      // Slide 9 — image 8.jpeg
      type: 'image',
      image: '/image%208.jpg',
      badge: 'National Presence',
      title: 'A Community Across India',
      subtitle: '40+ Cities · 3,000+ Verified Professionals',
      desc: 'From Delhi to Chennai, Mumbai to Bengaluru — FIP members are everywhere. Connect with professionals in your city.',
      btnLabel: 'Member Directory',
      btnAction: 'directory',
      tag: '40+ Cities',
    },
    {
      // Slide 10 — image 9.jpeg
      type: 'image',
      image: '/image%209.jpeg',
      badge: 'CSR & Social Impact',
      title: 'Professionals with a Purpose',
      subtitle: 'Social Responsibility · National Heritage',
      desc: 'FIP members participate in CSR activities at national monuments, contributing to the nation beyond their profession.',
      btnLabel: 'About FIP',
      btnAction: 'about',
      tag: 'Making a Difference',
    },
    {
      // Slide 11 — image 10.jpeg
      type: 'image',
      image: '/image%2010.jpeg',
      badge: 'Join the Movement',
      title: 'Be Part of Something Bigger',
      subtitle: 'One Membership · Unlimited Growth',
      desc: 'Join 3,000+ professionals who trust FIP to power their careers, knowledge and network. Your journey starts here.',
      btnLabel: 'Join FIP — ₹500/yr',
      btnAction: 'join',
      tag: 'Limited Time',
    },
  ];

  const [slideIdx,   setSlideIdx]   = useState(0);
  const [slideAnim,  setSlideAnim]  = useState('');
  const slideTimer  = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging  = useRef(false);
  const dragOffset  = useRef(0);
  const [dragX, setDragX] = useState(0);

  const goTo = (idx) => {
    setSlideAnim('out');
    setDragX(0);
    setTimeout(() => {
      setSlideIdx(idx);
      setSlideAnim('in');
    }, 320);
  };

  const next = () => goTo((slideIdx + 1) % SLIDES.length);
  const prev = () => goTo((slideIdx - 1 + SLIDES.length) % SLIDES.length);

  /* auto-advance every 5s — pauses on interaction */
  useEffect(() => {
    slideTimer.current = setTimeout(next, 5000);
    return () => clearTimeout(slideTimer.current);
  }, [slideIdx]);

  /* ── Touch / Mouse drag handlers ── */
  const onDragStart = (clientX, clientY) => {
    clearTimeout(slideTimer.current);
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    isDragging.current  = true;
    dragOffset.current  = 0;
  };

  const onDragMove = (clientX, clientY) => {
    if (!isDragging.current) return;
    const dx = clientX - touchStartX.current;
    const dy = clientY - touchStartY.current;
    // Ignore if scrolling vertically
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dragOffset.current) < 5) return;
    dragOffset.current = dx;
    setDragX(dx);
  };

  const onDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = 60;
    if (dragOffset.current < -threshold)      next();
    else if (dragOffset.current > threshold)  prev();
    else { setDragX(0); slideTimer.current = setTimeout(next, 5000); }
    dragOffset.current = 0;
  };

  /* Touch events */
  const handleTouchStart = (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  const handleTouchMove  = (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  const handleTouchEnd   = ()  => onDragEnd();

  /* Mouse drag events */
  const handleMouseDown  = (e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); };
  const handleMouseMove  = (e) => { if (isDragging.current) onDragMove(e.clientX, e.clientY); };
  const handleMouseUp    = ()  => onDragEnd();
  const handleMouseLeave = ()  => { if (isDragging.current) onDragEnd(); };

  const slide = SLIDES[slideIdx];

  const handleSlideBtn = (action) => {
    if (action === 'events')     navigate('/events');
    if (action === 'rsvp')       openModal('rsvp');
    if (action === 'enroll')     openModal('enroll');
    if (action === 'join')       { startCheckout('FIP Standard Membership', 500); navigate('/payment'); }
    if (action === 'courses')    navigate('/courses');
    if (action === 'webinars')   navigate('/webinars');
    if (action === 'committees') navigate('/committees');
    if (action === 'directory')  navigate('/directory');
    if (action === 'about')      navigate('/about');
  };

  return (
    <>
      {/* ══════════════════════════════════════════
          HERO SLIDER
      ══════════════════════════════════════════ */}
      <div id="hero-slider"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab', userSelect: 'none' }}
      >

        {/* ── Slide 1: existing hero content ── */}
        <div className={`slider-slide${slideIdx === 0 ? ' active' : ''} ${slideIdx === 0 ? slideAnim : ''}`}
          style={{ transform: slideIdx === 0 ? `translateX(${dragX}px)` : 'none', transition: isDragging.current ? 'none' : undefined }}>
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
        </div>

        {/* ── Slides 2-11: image slides ── */}
        {SLIDES.slice(1).map((s, i) => (
          <div key={i+1} className={`slider-slide${slideIdx === i+1 ? ' active' : ''} ${slideIdx === i+1 ? slideAnim : ''}`}
            style={{ transform: slideIdx === i+1 ? `translateX(${dragX}px)` : 'none', transition: isDragging.current ? 'none' : undefined }}>
            <div className="img-slide" style={{ backgroundImage: s.image ? `url('${s.image}')` : 'none' }}>
              {/* Dark overlay */}
              <div className="img-slide-overlay" />
              {/* Content */}
              <div className="img-slide-content">
                <div className="img-slide-inner">
                  <div className="img-slide-badge">
                    <i className="fa-solid fa-star" style={{fontSize:'9px'}}></i> {s.badge}
                  </div>
                  <h2 className="img-slide-title">{s.title}</h2>
                  <div className="img-slide-subtitle">{s.subtitle}</div>
                  <p className="img-slide-desc">{s.desc}</p>
                  <div className="img-slide-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => handleSlideBtn(s.btnAction)}>
                      {s.btnLabel} <i className="fa-solid fa-arrow-right"></i>
                    </button>
                    <span className="img-slide-tag">{s.tag}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── Controls ── */}
        {/* Prev / Next arrows */}
        <button className="slider-arrow slider-arrow-left" onClick={prev} aria-label="Previous slide">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button className="slider-arrow slider-arrow-right" onClick={next} aria-label="Next slide">
          <i className="fa-solid fa-chevron-right"></i>
        </button>

        {/* Dot indicators */}
        <div className="slider-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`slider-dot${slideIdx === i ? ' active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="slider-progress">
          <div className="slider-progress-bar" key={slideIdx} />
        </div>

      </div>

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

      {/* 3 C's */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Our Philosophy</span>
            <h2 className="section-heading">Built on <span>The 3 C's</span></h2>
            <p className="section-sub">Every programme, event and resource at FIP is shaped by three principles that define why we exist.</p>
          </div>
          <div className="three-c-grid">
            <div className="c-card c1"><div className="c-icon ci-blue"><i className="fa-solid fa-network-wired"></i></div><h3>Connect</h3><p>Build meaningful relationships with 3,000+ CAs, CSs, CMAs, and Advocates. Expand your professional circle through events, forums, and WhatsApp communities.</p></div>
            <div className="c-card c2"><div className="c-icon ci-orange"><i className="fa-solid fa-people-group"></i></div><h3>Collaborate</h3><p>Partner on industry initiatives, co-author insights, and develop solutions. FIP bridges practitioners across disciplines to drive the profession forward.</p></div>
            <div className="c-card c3"><div className="c-icon ci-green"><i className="fa-solid fa-trophy"></i></div><h3>Conquer</h3><p>Stay ahead with expert-led certificate courses, ICAI CPE-eligible webinars, and real-time regulatory updates tailored for practising professionals.</p></div>
          </div>
        </div>
      </section>

      {/* COURSES */}
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
                <div className={`course-thumb ${c.bg}`}><span>{c.emoji}</span>{c.tag&&<span className={`course-tag ${c.tag}`}>{c.tagLabel}</span>}</div>
                <div className="course-body">
                  <div className="course-cat">{c.cat}</div>
                  <div className="course-title">{c.title}</div>
                  <div className="course-instr"><i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)'}}></i> {c.instr}</div>
                  <div className="course-meta"><span><i className="fa-regular fa-clock"></i> {c.sessions}</span><span><i className="fa-solid fa-signal"></i> {c.level}</span></div>
                  <div className="course-footer">
                    {c.free?<span className="course-price-free">{c.price}</span>:<span className="course-price">{c.price}</span>}
                    <button className="c-enroll-btn" onClick={e=>{e.stopPropagation();openModal('enroll');}}>Enroll Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS DARK */}
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
            <div className="ev-dark" onClick={()=>openModal('rsvp')}><div className="ev-date"><i className="fa-regular fa-calendar"></i> Jan 11, 2026</div><div className="ev-title">Rashtrapati Bhawan Visit</div><div className="ev-desc">Exclusive guided visit to the President's residence. RSVP by Jan 2, 7 PM with your name, designation &amp; ID proof.</div><div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">120 seats</span></div></div>
            <div className="ev-dark" onClick={()=>openModal('rsvp')}><div className="ev-date"><i className="fa-regular fa-calendar"></i> Every Sunday</div><div className="ev-title">Chartered Walk &amp; Talk</div><div className="ev-desc">Morning walks at India Gate, War Memorial &amp; Firoz Shah Road. Networking meets wellness — free for all members.</div><div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">Open to all</span></div></div>
            <div className="ev-dark"><div className="ev-date"><i className="fa-regular fa-calendar"></i> Coming Soon</div><div className="ev-title">GST Conclave 2026</div><div className="ev-desc">Following Le Meridien's success, the next GST Conclave brings 500+ professionals for a full-day indirect tax summit.</div><div className="ev-footer"><span className="ev-type evt-virtual">Notify Me</span><span className="ev-seats">500+ capacity</span></div></div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Platform Features</span>
            <h2 className="section-heading">Built for <span>Practising Professionals</span></h2>
            <p className="section-sub">New features available to all FIP members on the revamped platform.</p>
          </div>
          <div className="features-grid">
            {[
              { icon:'fa-gauge-high',    cls:'fi-blue',   title:'Member Dashboard',        desc:'Track CPE hours, enrolled courses, event RSVPs, and membership status in one personalised view.', tag:null },
              { icon:'fa-calendar-check',cls:'fi-orange', title:'Event Calendar & RSVP',   desc:'Browse all FIP events, RSVP with one click, and get automatic WhatsApp & email reminders.', tag:'New' },
              { icon:'fa-comments',      cls:'fi-teal',   title:'Community Forum',          desc:'Post questions, share regulatory updates, and discuss case studies with 3,000+ community members.', tag:'New' },
              { icon:'fa-certificate',   cls:'fi-purple', title:'CPE Credit Tracking',      desc:'Auto-log ICAI CPE hours from FIP webinars and courses. Download e-certificates instantly.', tag:'New' },
              { icon:'fa-book-open',     cls:'fi-red',    title:'Resource Library',          desc:'Searchable archive of all FIP session recordings, decks, case studies, and circulars.', tag:'New' },
              { icon:'fa-briefcase',     cls:'fi-green',  title:'Job & Opportunity Board',  desc:'Exclusive listings from FIP member firms — jobs, freelance briefs, and collaboration opportunities.', tag:'New' },
            ].map((f,i) => (
              <div className="feat-card" key={i}>
                <div className={`feat-icon ${f.cls}`}><i className={`fa-solid ${f.icon}`}></i></div>
                <div>
                  <div className="feat-title">{f.title}{f.tag&&<span className="tag-new">{f.tag}</span>}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — live from Supabase ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Member Voices</span>
            <h2 className="section-heading">What Our <span>Members Say</span></h2>
            <p className="section-sub">Real experiences from FIP professionals across India.</p>
          </div>

          <div className="testi-grid">
            {testimonials.map((t, i) => {
              const initials = (t.name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
              const stars    = '★'.repeat(t.rating||5) + '☆'.repeat(5-(t.rating||5));
              return (
                <div className="testi-card" key={t.id||i}>
                  <div className="testi-stars">{stars}</div>
                  <span className="testi-qmark">"</span>
                  <p className="testi-text">{t.content}</p>
                  <div className="testi-author">
                    <div className="testi-av">{initials}</div>
                    <div>
                      <div className="testi-name">{t.name}</div>
                      <div className="testi-role">
                        {t.designation}
                        {t.profession && <span style={{color:'var(--orange)',marginLeft:'6px',fontSize:'11px',fontWeight:600}}>· {t.profession}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{textAlign:'center',marginTop:'28px'}}>
            <button className="btn btn-outline-blue" onClick={() => openModal('testimonial')}>
              <i className="fa-solid fa-pen"></i> Share Your Experience
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
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