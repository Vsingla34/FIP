import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

/* ── Count-up stat: animates from 0 to target when scrolled into view ── */
function CountUpStat({ value, label }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(formatStat(0, value));
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateCount(value, setDisplay);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="stat-item" ref={ref}>
      <span className="stat-n">{display}</span>
      <div className="stat-l">{label}</div>
    </div>
  );
}

/* parse a string like "₹10L+" or "3,000+" into { prefix, number, suffix } */
function parseStatValue(raw) {
  const match = raw.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!match) return { prefix: '', number: 0, suffix: raw };
  const [, prefix, numStr, suffix] = match;
  return { prefix, number: parseInt(numStr.replace(/,/g, ''), 10), suffix };
}

function formatStat(current, raw) {
  const { prefix, number, suffix } = parseStatValue(raw);
  const n = Math.round(current);
  const formatted = number >= 1000 ? n.toLocaleString('en-IN') : n.toString();
  return `${prefix}${formatted}${suffix}`;
}

function animateCount(raw, setDisplay) {
  const { number } = parseStatValue(raw);
  const duration = 1400; // ms
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * number;
    setDisplay(formatStat(current, raw));
    if (progress < 1) requestAnimationFrame(tick);
    else setDisplay(formatStat(number, raw)); // snap to exact final value
  }
  requestAnimationFrame(tick);
}

const FALLBACK = [
  { id:'f1', name:'Adv. Gaurav Gupta', designation:'Advocate · High Court of Delhi', content:'FIP stands as a dynamic platform dedicated to empowering professionals. With its consistent focus on knowledge-sharing and expert-led sessions, FIP has become a vital force in enriching professional growth and fostering a strong community committed to excellence.', rating:5 },
  { id:'f2', name:'CA Sadhna Sharma', designation:'Chartered Accountant · MBA (IIMA)', content:'Being part of FIP has been an enriching experience. FIP stands out as a vibrant platform that brings together finance and legal professionals from diverse backgrounds, fostering a community of continuous learning and collaboration.', rating:5 },
];

export default function HomePage() {
  const { openModal } = useApp();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState(FALLBACK);

  // Testimonials slide as GROUPS of 3, not one at a time. Same drag pattern
  // as the hero slider above (refs to dodge stale closures in timers, a
  // px-threshold to decide snap-forward vs snap-back) — kept fully
  // independent state, just the same proven technique.
  const testiPages = [];
  for (let i = 0; i < testimonials.length; i += 3) testiPages.push(testimonials.slice(i, i + 3));

  const [testiPageIdx, setTestiPageIdx] = useState(0);
  const [testiDragX,   setTestiDragX]   = useState(0);
  const testiPageIdxRef  = useRef(0);
  const testiPagesLenRef = useRef(1);
  const testiTouchStartX = useRef(0);
  const testiIsDragging  = useRef(false);
  const testiDragOffset  = useRef(0);
  const testiTimer       = useRef(null);

  testiPageIdxRef.current  = testiPageIdx;
  testiPagesLenRef.current = testiPages.length;

  const testiGoTo = (idx) => setTestiPageIdx(((idx % testiPagesLenRef.current) + testiPagesLenRef.current) % testiPagesLenRef.current);
  const testiNext = () => { if (testiPagesLenRef.current > 1) testiGoTo(testiPageIdxRef.current + 1); };
  const testiPrev = () => { if (testiPagesLenRef.current > 1) testiGoTo(testiPageIdxRef.current - 1); };

  useEffect(() => {
    if (testiPages.length <= 1) return;
    testiTimer.current = setTimeout(testiNext, 6000);
    return () => clearTimeout(testiTimer.current);
  }, [testiPageIdx, testimonials.length]);

  const testiDragStart = (clientX) => {
    clearTimeout(testiTimer.current);
    testiTouchStartX.current = clientX;
    testiIsDragging.current  = true;
    testiDragOffset.current  = 0;
  };
  const testiDragMove = (clientX) => {
    if (!testiIsDragging.current) return;
    const dx = clientX - testiTouchStartX.current;
    testiDragOffset.current = dx;
    setTestiDragX(dx);
  };
  const testiDragEnd = () => {
    if (!testiIsDragging.current) return;
    testiIsDragging.current = false;
    const threshold = 60;
    if (testiDragOffset.current < -threshold)      testiNext();
    else if (testiDragOffset.current > threshold)  testiPrev();
    setTestiDragX(0);
    testiDragOffset.current = 0;
    if (testiPages.length > 1) testiTimer.current = setTimeout(testiNext, 6000);
  };
  const testiHandleTouchStart = (e) => testiDragStart(e.touches[0].clientX);
  const testiHandleTouchMove  = (e) => testiDragMove(e.touches[0].clientX);
  const testiHandleTouchEnd   = ()  => testiDragEnd();
  const testiHandleMouseDown  = (e) => { e.preventDefault(); testiDragStart(e.clientX); };
  const testiHandleMouseMove  = (e) => { if (testiIsDragging.current) testiDragMove(e.clientX); };
  const testiHandleMouseUp    = ()  => testiDragEnd();
  const testiHandleMouseLeave = ()  => { if (testiIsDragging.current) testiDragEnd(); };
  const [homeCourses,  setHomeCourses]  = useState([]);

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id, name, designation, profession, content, rating')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .then(({ data }) => { if (data && data.length > 0) setTestimonials(data); });
  }, []);

  useEffect(() => {
    supabase.from('courses')
      .select('id, title, slug, category, price, level, instructor, free_for, status, banner_url, thumbnail_url, event_date, event_time')
      .eq('status', 'published')
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        if (!data?.length) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        // Only upcoming: no event_date (evergreen) OR event_date >= today
        const upcoming = data.filter(c => !c.event_date || new Date(c.event_date) >= today);
        setHomeCourses(upcoming.slice(0, 3));
      });
  }, []);

  /* ── Hero slides + dynamic content from site_settings + live data ── */
  const [dbSlides,    setDbSlides]    = useState([]);
  const [hero1,       setHero1]       = useState(null);
  const [memberPrice, setMemberPrice] = useState(500); // synced with admin membership price
  const [liveEvent,   setLiveEvent]   = useState(null);
  const [liveCourse,  setLiveCourse]  = useState(null);

  useEffect(() => {
    // Image slides
    supabase.from('slides').select('*').eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setDbSlides(data || []));

    // Hero slide 1 editable settings
    supabase.from('site_settings').select('value').eq('key','hero_slide_1').maybeSingle()
      .then(({ data }) => { if (data?.value) setHero1(data.value); });

    // Membership price — so hero button matches admin setting
    supabase.from('site_settings').select('value').eq('key','membership').maybeSingle()
      .then(({ data }) => {
        const sp = data?.value?.standard_price;
        if (sp) setMemberPrice(Number(sp) || 500);
      });

    // Next upcoming event for widget
    supabase.from('events').select('title,event_date,event_type,location')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true }).limit(1)
      .then(({ data }) => { if (data?.[0]) setLiveEvent(data[0]); });

    // Latest course for widget
    supabase.from('courses').select('title,event_date,price,free_for')
      .eq('status','published')
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setLiveCourse(data[0]); });
  }, []);

  // Slide 1 is always the fixed hero component.
  // DB slides follow as image slides (index 1, 2, 3…)
  const SLIDES = [
    { type: 'hero' },
    ...dbSlides.map(s => ({
      type:      'image',
      image:     s.image_url,
      badge:     s.badge,
      title:     s.title,
      subtitle:  s.subtitle,
      desc:      s.description,
      // Replace any hardcoded ₹NNN in btn_label with live membership price
      btnLabel:  s.btn_label ? s.btn_label.replace(/₹[\d,]+/g, `₹${Number(memberPrice).toLocaleString('en-IN')}`) : s.btn_label,
      btnAction: s.btn_action,
      tag:       s.tag,
    })),
  ];

  const [slideIdx,   setSlideIdx]   = useState(0);
  const [slideAnim,  setSlideAnim]  = useState('');
  const slideTimer  = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging  = useRef(false);
  const dragOffset  = useRef(0);
  const [dragX, setDragX] = useState(0);

  /* refs that are ALWAYS current — avoid stale closures in timer callbacks */
  const slideIdxRef  = useRef(0);
  const slidesLenRef = useRef(1);
  const goTimer      = useRef(null);   // inner 320ms animation timeout

  slideIdxRef.current  = slideIdx;
  slidesLenRef.current = SLIDES.length;

  const goTo = (idx) => {
    if (idx === slideIdxRef.current) return;   // already on this slide
    clearTimeout(goTimer.current);             // cancel any in-flight animation
    clearTimeout(slideTimer.current);          // cancel auto-advance (effect will reset it)
    setSlideAnim('out');
    setDragX(0);
    goTimer.current = setTimeout(() => {
      setSlideIdx(idx);
      setSlideAnim('in');
    }, 320);
  };

  /* next/prev read from refs — never stale even inside timer callbacks */
  const next = () => {
    const len = slidesLenRef.current;
    if (len <= 1) return;
    goTo((slideIdxRef.current + 1) % len);
  };
  const prev = () => {
    const len = slidesLenRef.current;
    if (len <= 1) return;
    goTo((slideIdxRef.current - 1 + len) % len);
  };

  /* auto-advance every 5s — starts only after DB slides have loaded */
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    slideTimer.current = setTimeout(next, 5000);
    return () => clearTimeout(slideTimer.current);
  }, [slideIdx, dbSlides.length]);

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
    else {
      setDragX(0);
      // No manual timer here — useEffect([slideIdx]) resets it automatically
      // Just restart it cleanly via a tiny state nudge if needed
      slideTimer.current = setTimeout(next, 5000);
    }
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
    if (action === 'rsvp')       navigate('/events');
    if (action === 'enroll')     navigate('/courses');
    if (action === 'join')       { openModal('register', { defaultType: 'member' }); }
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

        {/* ── Slide 1: dynamic hero — content from site_settings.hero_slide_1 ── */}
        <div className={`slider-slide${slideIdx === 0 ? ' active' : ''} ${slideIdx === 0 ? slideAnim : ''}`}
          style={{ transform: slideIdx === 0 ? `translateX(${dragX}px)` : 'none', transition: isDragging.current ? 'none' : undefined }}>
          <section id="hero">
            <div className="hero-grid">
              <div className="hero-left">
                <div className="hero-eyebrow">
                  <i className="fa-solid fa-shield-halved"></i>&nbsp;
                  {hero1?.eyebrow || "India's Premier Finance & Legal Network"}
                </div>
                <h1 className="hero-h1">
                  {hero1?.h1_line1 || 'Where Finance Professionals'}<br/>
                  <em>{hero1?.h1_italic || 'Unite & Conquer'}</em>
                </h1>
                <p className="hero-desc">
                  {hero1?.description || 'FIP connects 3,000+ Chartered Accountants, Company Secretaries, Cost Accountants and Advocates through world-class knowledge events, certificate courses, and a community built for impact.'}
                </p>
                <div className="hero-cta">
                  {/* Primary button label from admin, price from membership settings */}
                  <button className="btn btn-primary btn-lg"
                    onClick={() => openModal(
                      hero1?.btn1_action?.startsWith('/') ? null : (hero1?.btn1_action || 'register'),
                      { defaultType: 'member' }
                    )}>
                    <i className="fa-solid fa-user-plus"></i>{' '}
                    {hero1?.btn1_label
                      ? hero1.btn1_label.replace(/₹[\d,]+/g, `₹${Number(memberPrice).toLocaleString('en-IN')}`)
                      : `Join FIP — ₹${Number(memberPrice).toLocaleString('en-IN')}/yr`}
                  </button>
                  <Link to={hero1?.btn2_link || '/about'} className="btn btn-outline-white btn-lg">
                    {hero1?.btn2_label || 'Our Story'} <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
              <div className="hero-right">
                <div className="hero-dashboard">
                  <div className="db-bar">
                    <div className="db-dot r"></div><div className="db-dot y"></div><div className="db-dot g"></div>
                    <span className="db-title">FIP Member Portal</span>
                  </div>
                  {/* Live upcoming event */}
                  <div className="db-card">
                    <div className="db-card-label"><i className="fa-solid fa-calendar-check"></i>&nbsp; Upcoming Event</div>
                    <div className="db-card-title">{liveEvent?.title || 'Coming soon…'}</div>
                    {liveEvent && (
                      <div className="db-card-meta">
                        {liveEvent.event_date
                          ? new Date(liveEvent.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
                          : ''}
                        {liveEvent.event_type && <> · {liveEvent.event_type}</>}
                        {liveEvent.location   && <> · {liveEvent.location}</>}
                      </div>
                    )}
                  </div>
                  {/* Live featured course */}
                  <div className="db-card">
                    <div className="db-card-label"><i className="fa-solid fa-graduation-cap"></i>&nbsp; Featured Course</div>
                    <div className="db-card-title">{liveCourse?.title || 'View all courses →'}</div>
                    {liveCourse && (
                      <div className="db-card-meta">
                        {liveCourse.event_date ? 'Enrolling Now' : 'Self-Paced'}
                        &nbsp;·&nbsp;
                        {(!liveCourse.price || liveCourse.price === 0 || liveCourse.free_for === 'all')
                          ? 'Free for FIP Members'
                          : `₹${liveCourse.price}`}
                        &nbsp;·&nbsp; Live Session
                      </div>
                    )}
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

      {/* STATS RIBBON — animated count-up when scrolled into view */}
      <div className="stats-ribbon">
        <div className="stats-ribbon-inner">
          <CountUpStat value="200+"    label="Webinars Held" />
          <CountUpStat value="50+"     label="Physical Meets" />
          <CountUpStat value="₹10L+"   label="Sponsorship" />
          <CountUpStat value="3,000+"  label="Professionals" />
          <CountUpStat value="100+"    label="Expert Speakers" />
          <CountUpStat value="15+"     label="Certificate Courses" />
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
            <div className="c-card c1"><div className="c-icon ci-blue"><i className="fa-solid fa-network-wired"></i></div><h3>Connect</h3><p>At FIP, every meaningful opportunity begins with a connection. We bring together professionals from diverse fields through conferences, seminars, networking meets, learning programs, and digital platforms, enabling members to build trusted relationships, exchange ideas, and expand their professional network across industries.</p></div>
            <div className="c-card c2"><div className="c-icon ci-orange"><i className="fa-solid fa-people-group"></i></div><h3>Collaborate</h3><p>True success comes from working together. FIP encourages professionals to collaborate through committees, knowledge forums, business referrals, joint initiatives, publications, research, mentorship, and community-driven projects. By leveraging collective expertise, members create innovative solutions and unlock new professional and business opportunities.</p></div>
            <div className="c-card c3"><div className="c-icon ci-green"><i className="fa-solid fa-trophy"></i></div><h3>Conquer</h3><p>When professionals connect and collaborate, they are empowered to conquer new milestones. FIP helps members stay ahead through continuous learning, leadership opportunities, industry insights, skill development, and professional recognition—enabling them to achieve excellence in their careers, businesses, and the profession as a whole.</p></div>
          </div>
        </div>
      </section>

      {/* COURSES — only shown when upcoming courses exist */}
      {homeCourses.length > 0 && (
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
          
            {homeCourses.map((c,i) => {
              const bgCls = ['ct-blue','ct-teal','ct-orange','ct-purple','ct-green','ct-red'][i % 6];
              const emoji = c.category?.toLowerCase().includes('gst') ? '📑'
                : c.category?.toLowerCase().includes('tax') ? '📊'
                : c.category?.toLowerCase().includes('audit') ? '🔍'
                : c.category?.toLowerCase().includes('finance') ? '📈'
                : c.category?.toLowerCase().includes('law') ? '⚖️' : '📚';
              return (
              <div className="course-card" key={i} onClick={() => c.slug ? navigate(`/courses/${c.slug}`) : navigate('/courses')} style={{cursor:'pointer'}}>
                <div className={`course-thumb ${bgCls}`} style={
                  c.banner_url
                    ? { backgroundImage:`url('${c.banner_url}')`, backgroundSize:'cover', backgroundPosition:'center', padding:0 }
                    : {}
                }>
                  {/* Dark overlay for image cards */}
                  {c.banner_url && (
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.45) 100%)',borderRadius:'inherit'}}/>
                  )}
                  {/* Emoji fallback when no image */}
                  {!c.banner_url && <span>{emoji}</span>}
                  {/* Free / Paid tag */}
                  {!c.price || c.price === 0
                    ? <span className="course-tag tag-free">Free</span>
                    : (c.free_for === 'members' || c.free_for === 'students')
                    ? <span className="course-tag tag-free">Free for FIP Members</span>
                    : <span className="course-tag tag-hot">Paid</span>
                  }
                  {/* Event date badge */}
                  {c.event_date && (
                    <div style={{position:'absolute',bottom:'10px',left:'12px',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',color:'#fff',fontSize:'11px',fontWeight:700,padding:'4px 10px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'5px'}}>
                      <i className="fa-regular fa-calendar" style={{color:'#FFD09B'}}></i>
                      {new Date(c.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  )}
                </div>
                <div className="course-body">
                  <div className="course-cat">{c.category}</div>
                  <div className="course-title">{c.title}</div>
                  {c.instructor && <div className="course-instr"><i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)',marginRight:'4px'}}></i>{c.instructor}</div>}
                  <div className="course-meta">
                    <span><i className="fa-solid fa-signal" style={{fontSize:'10px',marginRight:'3px'}}></i>{c.level || 'All Levels'}</span>
                  </div>
                  <div className="course-footer">
                    {!c.price || c.price === 0
                      ? <span className="course-price-free">Free</span>
                      : <span className="course-price">₹{c.price}</span>
                    }
                    <button className="c-enroll-btn" onClick={e=>{e.stopPropagation(); c.slug ? navigate(`/courses/${c.slug}`) : navigate('/courses');}}>View Course</button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>
      )}

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
            <div className="ev-dark" onClick={()=>navigate('/events')} style={{cursor:'pointer'}}>
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> Aug 9, 2026</div>
              <div className="ev-title">Rashtrapati Bhawan Visit</div>
              <div className="ev-desc">An exclusive experience awaits! FIP is set to organize a special visit to Rashtrapati Bhavan on 9th August 2026 (8:30 AM – 11:00 AM). A unique opportunity to witness the grandeur of India's highest constitutional institution.</div>
              <div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">120 seats</span></div>
            </div>

            <div className="ev-dark" onClick={()=>navigate('/events')} style={{cursor:'pointer'}}>
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> Every Sunday</div>
              <div className="ev-title">Chartered Walk &amp; Talk</div>
              <div className="ev-desc">Morning walks at India Gate, War Memorial &amp; Firoz Shah Road. Networking meets wellness — free for all members.</div>
              <div className="ev-footer"><span className="ev-type evt-physical">Physical · Delhi</span><span className="ev-seats">Open to all</span></div>
            </div>

            {/* Featured — real dates/pricing, not a placeholder */}
            <div className="ev-dark ev-featured" onClick={()=>navigate('/events')} style={{cursor:'pointer'}}>
              <span className="ev-featured-badge"><i className="fa-solid fa-star"></i> Featured</span>
              <div className="ev-date"><i className="fa-regular fa-calendar"></i> 5 – 6 Sept 2026</div>
              <div className="ev-title">GCC Workshop 2026</div>
              <div className="ev-desc">Global Practice, Global Clients, Global Opportunities — a two-day exclusive conclave for Chartered Accountants to discover the potential of Global Capability Centres (GCCs) and the future of the global profession.</div>
              <div className="ev-footer">
                <span className="ev-type evt-physical">Physical · Delhi</span>
                <span className="ev-register-cta">Register Now <i className="fa-solid fa-arrow-right"></i></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      {/* ── TESTIMONIALS — live from Supabase ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Member Voices</span>
            <h2 className="section-heading">Hear How FIP is <span>Making a Difference</span></h2>
            <p className="section-sub">Real experiences from FIP professionals across India.</p>
          </div>

          <div className="testi-slider">
            <button className="testi-arrow testi-arrow-left" onClick={testiPrev} aria-label="Previous testimonials">
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            <div className="testi-track-wrap"
              onTouchStart={testiHandleTouchStart} onTouchMove={testiHandleTouchMove} onTouchEnd={testiHandleTouchEnd}
              onMouseDown={testiHandleMouseDown} onMouseMove={testiHandleMouseMove} onMouseUp={testiHandleMouseUp} onMouseLeave={testiHandleMouseLeave}
              style={{ cursor: testiIsDragging.current ? 'grabbing' : 'grab' }}>
              <div className="testi-track"
                style={{
                  transform: `translateX(calc(-${testiPageIdx * 100}% + ${testiDragX}px))`,
                  transition: testiIsDragging.current ? 'none' : 'transform .4s ease',
                }}>
                {testiPages.map((page, pi) => (
                  <div className="testi-page" key={pi}>
                    {page.map((t, i) => {
                      const initials = (t.name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
                      const stars    = '★'.repeat(t.rating||5) + '☆'.repeat(5-(t.rating||5));
                      return (
                        <div className="testi-card" key={t.id||i}>
                          <span className="testi-qmark">"</span>
                          <div className="testi-stars">{stars}</div>
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
                ))}
              </div>
            </div>

            <button className="testi-arrow testi-arrow-right" onClick={testiNext} aria-label="Next testimonials">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {testiPages.length > 1 && (
            <div className="testi-dots">
              {testiPages.map((_, i) => (
                <button key={i} className={`testi-dot${i===testiPageIdx?' active':''}`}
                  onClick={() => testiGoTo(i)} aria-label={`Go to testimonials group ${i+1}`}/>
              ))}
            </div>
          )}

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
              <button className="btn btn-primary btn-lg" onClick={() => openModal('register', { defaultType: 'member' })}>
                <i className="fa-solid fa-user-plus"></i> Become a Member — ₹{Number(memberPrice).toLocaleString('en-IN')}
              </button>
              <Link to="/contact" className="btn btn-outline-white btn-lg">Talk to Us</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}