import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useRazorpay } from '../hooks/useRazorpay.js';
import { supabase } from '../lib/supabase.js';
import FlyerGenerator from '../components/FlyerGenerator.jsx';

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function daysUntil(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (diff < 0)  return 'Past event';
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days away`;
}

export default function CourseDetailPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const location    = window.history.state?.usr || {};  // React Router state
  const { user, profile } = useAuth();
  const { showToast, openModal } = useApp();
  const { pay } = useRazorpay();

  const PROFESSIONS = ['CA Student','CA Member','CS','CMA','Advocate','MBA','Others'];

  const [course,    setCourse]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [enrolled,  setEnrolled]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [success,   setSuccess]   = useState(false);
  const [showFlyer, setShowFlyer] = useState(false); // flyer popup after registration
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', profession:'' });
  const interestTracked = useRef(false);

  /* ── Determine if this course requires payment ── */
  const isActiveMember = profile?.role === 'admin' || profile?.is_admin ||
                         profile?.membership_status === 'Active' || profile?.account_type === 'fip_member';
  const requiresPayment = (course) => {
    if (!course?.price || course.price === 0)  return false; // free course
    if (course.free_for === 'all')              return false; // free for everyone
    if (isActiveMember)                         return false; // FIP Members always enroll free
    return true; // guest users pay
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !data) { navigate('/courses'); return; }
      setCourse(data);
      setLoading(false);

      // Track interest click (once per visit)
      if (!interestTracked.current) {
        interestTracked.current = true;
        supabase.rpc('increment_course_interest', { p_course_id: data.id }).catch(() => {});
      }
    };
    load();
  }, [slug]);

  // Check if already registered
  useEffect(() => {
    if (!user || !course) return;
    supabase.from('course_registrations')
      .select('id')
      .eq('course_id', course.id)
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => { if (data) setEnrolled(true); });
  }, [user, course]);

  // Auto-show flyer if arriving from payment success
  useEffect(() => {
    if (location.showFlyer && course) {
      setEnrolled(true);
      setTimeout(() => setShowFlyer(true), 800);
    }
  }, [location.showFlyer, course]);
  const openForm = () => {
    if (requiresPayment(course)) {
      if (!user) {
        // Guest can't pay — prompt to create account
        openModal('register');
        return;
      }
      // Logged-in user on paid course → open enroll modal (has price breakdown + coupon field)
      openModal('enroll', { course });
      return;
    }
    // Free course → show the inline registration form
    setForm({
      full_name:  profile?.full_name || user?.user_metadata?.full_name || '',
      email:      user?.email || '',
      phone:      profile?.phone || '',
      profession: profile?.profession || '',
    });
    setShowForm(true);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Extra guard: paid courses should never reach this form
    // (they go through the enroll modal → Razorpay)
    if (requiresPayment(course)) {
      openForm();
      return;
    }

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.profession) {
      showToast('Please fill in all required fields.', true);
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('course_registrations').insert({
      course_id:  course.id,
      full_name:  form.full_name.trim(),
      email:      form.email.trim().toLowerCase(),
      phone:      form.phone.trim() || null,
      profession: form.profession  || null,
      user_id:    user?.id         || null,
      status:     'registered',
    });

    setSubmitting(false);

    if (error?.code === '23505') {
      showToast('You are already registered for this course!', true);
      setShowForm(false);
      setEnrolled(true);
      return;
    }
    if (error) {
      showToast('Registration failed. Please try again.', true);
      return;
    }

    // Send confirmation email
    fetch('/api/send-course-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:               form.full_name,
        email:              form.email,
        courseTitle:        course.title,
        eventDate:          course.event_date,
        eventTime:          course.event_time,
        zoomLink:           course.zoom_link,
        zoomPassword:       course.zoom_password,
        whatsappGroupLink:  course.whatsapp_group_link,
      }),
    }).catch(() => {});

    setSuccess(true);
    setEnrolled(true);
    setCourse(prev => ({ ...prev, enrolled_count: (prev.enrolled_count || 0) + 1 }));
    // Show flyer generator after a short delay
    setTimeout(() => setShowFlyer(true), 600);
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
      <span style={{color:'var(--text-muted)'}}>Loading course…</span>
    </div>
  );
  if (!course) return null;

  // Block private courses for non-members
  if (course.is_private && !isActiveMember) return (
    <div style={{minHeight:'70vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:'56px',marginBottom:'16px'}}>🔒</div>
      <h2 style={{fontSize:'24px',fontWeight:900,color:'var(--blue)',marginBottom:'8px'}}>Members Only</h2>
      <p style={{color:'var(--text-muted)',fontSize:'15px',maxWidth:'400px',lineHeight:1.7,marginBottom:'24px'}}>
        <strong>{course.title}</strong> is exclusively available to active FIP Members.
        Join FIP to access this and all members-only content.
      </p>
      <button className="btn btn-primary btn-lg" onClick={() => openModal('register', { defaultType:'member' })}>
        <i className="fa-solid fa-user-plus"></i> Become an FIP Member
      </button>
    </div>
  );

  const speakers = course.speakers || [];
  const whatYouLearn = course.what_you_learn || [];
  const dl = daysUntil(course.event_date);
  const isPast = course.event_date && new Date(course.event_end_date || course.event_date) < new Date();

  return (
    <>
      {/* Flyer popup shown after successful registration */}
      {showFlyer && course && (
        <FlyerGenerator
          name={form.full_name || profile?.full_name || user?.email || 'Participant'}
          courseTitle={course.title}
          whatYouLearn={course.what_you_learn || []}
          eventDate={course.event_date}
          flyerTemplateUrl={course.flyer_template_url}
          logoUrl={`${window.location.origin}/logo.png`}
          onClose={() => setShowFlyer(false)}
        />
      )}
      {/* ── Hero Banner ── */}
      <div style={{
        background: course.banner_url
          ? `linear-gradient(to bottom, rgba(10,20,50,0.72) 0%, rgba(10,20,50,0.88) 100%), url('${course.banner_url}') center/cover`
          : 'linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%)',
        padding:'56px 0 48px',
        position:'relative',
      }}>
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'20px'}}>
            <Link to="/courses" style={{color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Courses</Link>
            <i className="fa-solid fa-chevron-right" style={{color:'rgba(255,255,255,0.3)'}}></i>
            <span style={{color:'rgba(255,255,255,0.8)'}}>{course.title}</span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:'24px',alignItems:'start',flexWrap:'wrap'}}>
            <div>
              {course.category && (
                <span style={{fontSize:'11px',fontWeight:700,color:'#FFD09B',background:'rgba(255,208,155,0.15)',padding:'4px 12px',borderRadius:'20px',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px',display:'inline-block'}}>
                  {course.category}
                </span>
              )}
              <h1 style={{fontSize:'clamp(24px,4vw,38px)',fontWeight:900,color:'#fff',margin:'0 0 12px',fontFamily:"'Playfair Display',serif",lineHeight:1.15}}>
                {course.title}
              </h1>
              {course.subtitle && (
                <p style={{fontSize:'16px',color:'rgba(255,255,255,0.7)',margin:'0 0 20px',lineHeight:1.6}}>{course.subtitle}</p>
              )}

              {/* Stats row */}
              <div style={{display:'flex',gap:'20px',flexWrap:'wrap',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>
                <span><i className="fa-solid fa-users" style={{marginRight:'5px',color:'#FFD09B'}}></i>{(course.enrolled_count||0).toLocaleString()} Enrolled</span>
                <span><i className="fa-solid fa-eye" style={{marginRight:'5px',color:'#FFD09B'}}></i>{(course.interested_count||0).toLocaleString()} Interested</span>
                {course.level && <span><i className="fa-solid fa-signal" style={{marginRight:'5px',color:'#FFD09B'}}></i>{course.level}</span>}

              </div>
            </div>

            {/* Date/time pill */}
            {course.event_date && (
              <div style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'12px',padding:'18px 22px',textAlign:'center',flexShrink:0,minWidth:'160px'}}>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>
                  {course.event_end_date && course.event_end_date !== course.event_date ? 'Date Range' : 'Live on'}
                </div>
                <div style={{fontSize:'14px',fontWeight:700,color:'#FFD09B',lineHeight:1.4}}>
                  {new Date(course.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  {course.event_end_date && course.event_end_date !== course.event_date && (
                    <span> – {new Date(course.event_end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                  )}
                </div>
                <div style={{fontSize:'13px',color:'rgba(255,255,255,0.8)',marginTop:'2px'}}>{new Date(course.event_date).getFullYear()}</div>
                {course.event_time && <div style={{fontSize:'12px',color:'rgba(255,255,255,0.6)',marginTop:'4px'}}>{course.event_time}</div>}
                {dl && !isPast && (
                  <div style={{marginTop:'8px',background:dl==='Today!'?'#22C55E':'rgba(255,208,155,0.2)',color:dl==='Today!'?'#fff':'#FFD09B',fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'20px'}}>{dl}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <section className="section section-alt">
        <div className="container">
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 280px',gap:'24px',alignItems:'start'}}>

            {/* ── Left: Details ── */}
            <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

              {/* What you'll learn */}
              {whatYouLearn.length > 0 && (
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px 28px'}}>
                  <h2 style={{fontSize:'18px',fontWeight:800,color:'var(--blue)',margin:'0 0 18px',display:'flex',alignItems:'center',gap:'10px'}}>
                    <i className="fa-solid fa-lightbulb" style={{color:'var(--orange)',fontSize:'16px'}}></i>
                    What You'll Learn
                  </h2>
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    {whatYouLearn.map((item, i) => (
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'14px',color:'var(--text-muted)',lineHeight:1.6}}>
                        <i className="fa-solid fa-circle-check" style={{color:'var(--green)',fontSize:'13px',marginTop:'3px',flexShrink:0}}></i>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {course.description && (
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px 28px'}}>
                  <h2 style={{fontSize:'18px',fontWeight:800,color:'var(--blue)',margin:'0 0 14px',display:'flex',alignItems:'center',gap:'10px'}}>
                    <i className="fa-solid fa-circle-info" style={{color:'var(--orange)',fontSize:'16px'}}></i>
                    About This Course
                  </h2>
                  <p style={{fontSize:'15px',color:'var(--text-muted)',lineHeight:1.9,margin:0,whiteSpace:'pre-wrap'}}>{course.description}</p>
                </div>
              )}

              {/* Speakers */}
              {speakers.length > 0 && (
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px 28px'}}>
                  <h2 style={{fontSize:'18px',fontWeight:800,color:'var(--blue)',margin:'0 0 20px',display:'flex',alignItems:'center',gap:'10px'}}>
                    <i className="fa-solid fa-microphone" style={{color:'var(--orange)',fontSize:'16px'}}></i>
                    {speakers.length === 1 ? 'Speaker' : 'Speakers'}
                  </h2>
                  <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                    {speakers.map((sp, i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px',background:'var(--off-white)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                        {sp.image_url ? (
                          <img src={sp.image_url} alt={sp.name}
                            style={{width:'64px',height:'64px',borderRadius:'50%',objectFit:'cover',border:'2px solid var(--blue)',flexShrink:0}}/>
                        ) : (
                          <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,var(--blue),#1B4A9E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:800,color:'#FFD09B',flexShrink:0}}>
                            {(sp.name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'3px'}}>{sp.name}</div>
                          <div style={{fontSize:'12px',color:'var(--text-muted)',lineHeight:1.5}}>{sp.qualification}</div>
                        </div>
                        <i className="fa-solid fa-microphone-lines" style={{color:'var(--orange)',fontSize:'18px',flexShrink:0,opacity:0.6}}></i>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Enroll card ── */}
            <div style={{position:'sticky',top:'88px'}}>
              <div style={{background:'#fff',border:'2px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.08)'}}>

                {/* Price */}
                <div style={{background:'linear-gradient(135deg,#1A3C6E,#1B4A9E)',padding:'20px 24px'}}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>Course Fee</div>
                  <div style={{fontSize:'32px',fontWeight:900,color:!course.price||course.price===0?'#4ADE80':'#FFD09B'}}>
                    {!course.price || course.price === 0 ? 'Free' : `₹${course.price}`}
                  </div>
                  {course.free_for && course.free_for !== 'none' && (
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginTop:'4px'}}>
                      Free for {course.free_for === 'all' ? 'everyone' : course.free_for === 'members' ? 'FIP Members' : 'students'}
                    </div>
                  )}
                </div>

                <div style={{padding:'20px 24px'}}>
                  {/* Date/time details */}
                  {(course.event_date || course.event_time) && (
                    <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
                      {course.event_date && (
                        <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--text-muted)'}}>
                          <i className="fa-regular fa-calendar" style={{color:'var(--orange)',width:'14px',textAlign:'center'}}></i>
                          <span>{formatDate(course.event_date)}</span>
                        </div>
                      )}
                      {course.event_time && (
                        <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--text-muted)'}}>
                          <i className="fa-regular fa-clock" style={{color:'var(--orange)',width:'14px',textAlign:'center'}}></i>
                          <span>{course.event_time}</span>
                        </div>
                      )}
                      <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--text-muted)'}}>
                        <i className="fa-brands fa-zoom" style={{color:'#2D8CFF',width:'14px',textAlign:'center'}}></i>
                        <span style={{color:'#2D8CFF',fontWeight:600}}>Live on Zoom</span>
                      </div>
                      {dl && !isPast && (
                        <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:700,color:'var(--blue)',textAlign:'center'}}>
                          <i className="fa-solid fa-hourglass-half" style={{marginRight:'5px',color:'var(--orange)'}}></i>
                          {dl}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enroll / Registered state */}
                  {enrolled ? (
                    <div style={{background:'var(--green)',borderRadius:'10px',padding:'16px',textAlign:'center',color:'#fff'}}>
                      <i className="fa-solid fa-circle-check" style={{fontSize:'22px',display:'block',marginBottom:'8px'}}></i>
                      <div style={{fontWeight:800,fontSize:'15px',marginBottom:'4px'}}>Already Registered!</div>
                      <div style={{fontSize:'12px',opacity:.85}}>
                        You're on the list. Check your email for the Zoom link and details.
                      </div>
                    </div>
                  ) : isPast ? (
                    <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px',textAlign:'center',color:'var(--text-muted)'}}>
                      <i className="fa-solid fa-calendar-xmark" style={{fontSize:'20px',display:'block',marginBottom:'6px',opacity:.4}}></i>
                      <div style={{fontWeight:600,fontSize:'13px'}}>This session has ended</div>
                    </div>
                  ) : (
                    <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:'15px',padding:'14px',fontWeight:800}}
                      onClick={openForm}>
                      <i className="fa-solid fa-calendar-check"></i> Register Now — {
                        !course.price || course.price === 0
                          ? "It's Free"
                          : isActiveMember
                          ? 'Free for FIP Members'
                          : `₹${Number(course.price).toLocaleString('en-IN')}`
                      }
                    </button>
                  )}

                  {/* Enrolled count */}
                  {(course.enrolled_count||0) > 0 && (
                    <div style={{textAlign:'center',marginTop:'12px',fontSize:'12px',color:'var(--text-light)'}}>
                      <i className="fa-solid fa-users" style={{marginRight:'4px',color:'var(--orange)'}}></i>
                      <strong style={{color:'var(--blue)'}}>{course.enrolled_count}</strong> people have registered
                    </div>
                  )}

                  {/* What you get */}
                  <div style={{borderTop:'1px solid var(--border)',marginTop:'16px',paddingTop:'14px',display:'flex',flexDirection:'column',gap:'8px'}}>
                    {[
                      { icon:'fa-video',       label:'Live Zoom session' },
                      { icon:'fa-envelope',    label:'Zoom link sent to email' },
                      { icon:'fa-infinity',    label:'Recording (if available)' },
                    ].map((item,i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'12px',color:'var(--text-muted)'}}>
                        <i className={`fa-solid ${item.icon}`} style={{color:'var(--green)',fontSize:'12px',width:'14px',textAlign:'center'}}></i>
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Registration Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => !submitting && setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'480px'}}>
            {!submitting && <button className="modal-close" onClick={() => setShowForm(false)}>&#x2715;</button>}

            {success ? (
              /* Success screen */
              <div style={{textAlign:'center',padding:'16px 0'}}>
                <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'#DCFCE7',border:'2px solid #22C55E',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:'28px',color:'#16A34A'}}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="modal-title">You're Registered! 🎉</div>
                <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'8px'}}>
                  A confirmation email with the <strong>Zoom meeting link</strong> has been sent to<br/>
                  <strong style={{color:'var(--blue)'}}>{form.email}</strong>
                </p>
                <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'8px',padding:'12px',fontSize:'13px',color:'#1E40AF',marginBottom:'18px',display:'flex',gap:'8px',alignItems:'center',textAlign:'left'}}>
                  <i className="fa-brands fa-zoom" style={{fontSize:'20px',color:'#2D8CFF',flexShrink:0}}></i>
                  <span>Check your inbox for the Zoom link. Also check your <strong>spam/junk</strong> folder if not found.</span>
                </div>
                <button className="btn btn-outline-blue btn-sm" onClick={() => setShowForm(false)}>Close</button>
              </div>
            ) : (
              /* Registration form */
              <>
                <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'20px'}}>
                  <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>{course.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                    {course.event_date && <span><i className="fa-regular fa-calendar" style={{marginRight:'4px'}}></i>{formatDate(course.event_date)}</span>}
                    {course.event_time && <span><i className="fa-regular fa-clock" style={{marginRight:'4px'}}></i>{course.event_time}</span>}
                    <span style={{color:'#2D8CFF',fontWeight:600}}><i className="fa-brands fa-zoom" style={{marginRight:'4px'}}></i>Zoom</span>
                  </div>
                </div>

                <div className="modal-title" style={{marginBottom:'4px'}}>Register for this Course</div>
                <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>
                  {requiresPayment(course)
                    ? 'Payment required — you\'ll be redirected to complete payment.'
                    : 'No account needed — fill in your details and you\'re in!'}
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" type="text" placeholder="Your Full Name" required
                      value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" required
                      value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-input" type="email" placeholder="you@example.com" required
                      value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profession *</label>
                    <select className="form-select" required value={form.profession}
                      onChange={e=>setForm(f=>({...f,profession:e.target.value}))}>
                      <option value="">Select your profession</option>
                      <option>CA Student</option>
                      <option>CA Member</option>
                      <option>CS</option>
                      <option>CMA</option>
                      <option>Advocate</option>
                      <option>MBA</option>
                      <option>Others</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'4px'}} disabled={submitting}>
                    {submitting
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing…</>
                      : requiresPayment(course)
                      ? <><i className="fa-solid fa-lock"></i> Continue to Payment — ₹{course.price}</>
                      : <><i className="fa-solid fa-calendar-check"></i> Confirm Registration — Free</>
                    }
                  </button>
                  <p style={{textAlign:'center',fontSize:'11px',color:'var(--text-light)',marginTop:'10px'}}>
                    <i className="fa-solid fa-lock" style={{marginRight:'4px',color:'var(--green)'}}></i>
                    {requiresPayment(course)
                      ? 'Secure payment via Razorpay. Zoom link sent after payment.'
                      : 'Zoom link will be emailed to you immediately after registration.'}
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