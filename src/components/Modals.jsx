import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Modals() {
  const { modal, modalData, closeModal, openModal, showToast } = useApp();
  const { signIn, signUp, verifyOTP, resendOTP, user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [regType,  setRegType]  = useState('student');

  /* OTP step state */
  const [otpStep,       setOtpStep]       = useState(false); // true = show OTP screen
  const [otpEmail,      setOtpEmail]      = useState('');
  const [pendingData,   setPendingData]   = useState(null);
  const [otp,           setOtp]           = useState(['','','','','','']);
  const [resendCooldown,setResendCooldown]= useState(0);
  const otpRefs = useRef([]);

  if (!modal) return null;
  const clearError = () => setError('');

  /* ── OTP input handler ── */
  const handleOtpChange = (i, val) => {
    const digits = val.replace(/\D/g,'').slice(0,1);
    const next = [...otp];
    next[i] = digits;
    setOtp(next);
    if (digits && i < 7) otpRefs.current[i+1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i-1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) otpRefs.current[i-1]?.focus();
    if (e.key === 'ArrowRight' && i < 7) otpRefs.current[i+1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    const next = [...otp];
    digits.forEach((d,i) => { if (i < 6) next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 7)]?.focus();
  };

  /* ── Resend OTP with countdown ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendOTP(otpEmail);
      showToast('OTP resent to your email!');
      setResendCooldown(60);
      const t = setInterval(() => {
        setResendCooldown(c => { if (c<=1){ clearInterval(t); return 0; } return c-1; });
      }, 1000);
    } catch (err) { setError(err.message); }
  };

  /* ── Verify OTP ── */
  const handleVerifyOTP = async () => {
    const token = otp.join('');
    if (token.length !== 8) { setError('Please enter all 8 digits.'); return; }
    setLoading(true); setError('');
    try {
      await verifyOTP({ email: otpEmail, token, pendingData });
      setOtpStep(false);
      closeModal();

      if (regType === 'student') {
        showToast('Email verified! Welcome to FIP.');
        if (modalData?.courseSlug) navigate(`/courses/${modalData.courseSlug}`);
        else navigate('/dashboard');
      } else {
        showToast('Email verified! Complete your membership payment.');
        navigate('/membership');
      }
    } catch (err) {
      setError(err.message?.includes('expired')
        ? 'OTP expired. Click "Resend OTP" to get a new one.'
        : err.message?.includes('invalid')
        ? 'Incorrect OTP. Please check your email and try again.'
        : err.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      await signIn({ email: f.email.value.trim(), password: f.password.value });
      closeModal(); showToast('Welcome back!');
      if (modalData?.redirectAfterLogin) navigate(modalData.redirectAfterLogin);
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message?.includes('Email not confirmed')
        ? 'Please verify your email first. Check your inbox for the OTP.'
        : err.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  /* ── REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      const result = await signUp({
        email:       f.email.value.trim(),
        password:    f.password.value,
        fullName:    f.fullName.value.trim(),
        profession:  f.profession.value,
        phone:       f.phone.value.trim(),
        accountType: regType,
      });

      setPendingData(result.pendingData);
      setOtpEmail(f.email.value.trim());

      if (result.needsOTP) {
        // Show OTP verification screen
        setOtp(['','','','','','','','']);
        setOtpStep(true);
        setError('');
      } else {
        // Email already confirmed (shouldn't happen normally)
        closeModal(); showToast('Account created!');
        navigate('/dashboard');
      }
    } catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  /* ── COURSE ENROLL ── */
  const handleCourseEnroll = (e) => {
    e.preventDefault(); closeModal();
    const course = modalData?.course;
    showToast(`Enrollment request sent for ${course?.title || 'this course'}! We'll confirm shortly.`);
  };

  /* ── RSVP ── */
  const handleRSVP = (e) => {
    e.preventDefault(); closeModal();
    showToast('RSVP confirmed! See you at the event.');
  };

  /* ── TESTIMONIAL ── */
  const handleTestimonial = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      const { error: dbError } = await supabase.from('testimonials').insert({
        user_id: user?.id || null, name: f.name.value.trim(),
        designation: f.designation.value.trim(), profession: f.profession?.value?.trim() || null,
        content: f.content.value.trim(), rating: parseInt(f.rating.value) || 5,
        status: 'pending', approved: false,
      });
      if (dbError) throw dbError;
      closeModal(); showToast('Thank you! Your testimonial has been submitted for review.');
    } catch (err) { setError('Failed to submit. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={!otpStep ? closeModal : undefined}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {!otpStep && (
          <button className="modal-close" onClick={() => { closeModal(); clearError(); setOtpStep(false); }}>&#x2715;</button>
        )}

        {/* ══════════════════════════════════
            OTP VERIFICATION SCREEN
        ══════════════════════════════════ */}
        {otpStep && (
          <div style={{textAlign:'center'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'var(--blue-pale)',border:'2px solid var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'26px'}}>
              <i className="fa-solid fa-envelope-open-text" style={{color:'var(--orange)'}}></i>
            </div>
            <div className="modal-title">Verify Your Email</div>
            <div className="modal-sub">
              We've sent a 6-digit OTP to<br/>
              <strong style={{color:'var(--blue)'}}>{otpEmail}</strong>
            </div>

            {error && (
              <div className="auth-error" style={{textAlign:'left',marginBottom:'16px'}}>
                <i className="fa-solid fa-circle-exclamation"></i> {error}
              </div>
            )}

            {/* OTP boxes */}
            <div className="otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',marginBottom:'14px',marginTop:'8px'}}
              onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length !== 8}
            >
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Verifying…</>
                : <><i className="fa-solid fa-shield-check"></i> Verify & Activate Account</>
              }
            </button>

            <div style={{fontSize:'13px',color:'var(--text-muted)'}}>
              Didn't receive it?{' '}
              {resendCooldown > 0 ? (
                <span style={{color:'var(--text-light)'}}>Resend in {resendCooldown}s</span>
              ) : (
                <span
                  style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                  onClick={handleResend}
                >
                  Resend OTP
                </span>
              )}
            </div>

            <div style={{marginTop:'12px',fontSize:'12px',color:'var(--text-light)'}}>
              <i className="fa-solid fa-clock" style={{marginRight:'4px'}}></i>
              OTP expires in 10 minutes. Check your spam folder if not received.
            </div>

            <button
              style={{marginTop:'16px',background:'none',border:'none',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer'}}
              onClick={() => { setOtpStep(false); closeModal(); }}
            >
              ← Back to Registration
            </button>
          </div>
        )}

        {/* ══════════════════════════════════
            LOGIN
        ══════════════════════════════════ */}
        {!otpStep && modal === 'login' && (
          <>
            <div className="modal-title">Welcome Back</div>
            <div className="modal-sub">Sign in to access your FIP dashboard, courses and events.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group"><label className="form-label">Email Address</label>
                <input className="form-input" name="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="form-group"><label className="form-label">Password</label>
                <input className="form-input" name="password" type="password" placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}} disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in…</> : 'Sign In'}
              </button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                No account?{' '}
                <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                  onClick={() => { clearError(); openModal('register', modalData); }}>Create Account</span>
              </p>
            </form>
          </>
        )}

        {/* ══════════════════════════════════
            REGISTER
        ══════════════════════════════════ */}
        {!otpStep && modal === 'register' && (
          <>
            <div className="modal-title">Create Your Account</div>
            <div className="modal-sub">Join FIP — free student account or full membership.</div>

            <div className="reg-type-row">
              <button type="button" className={`reg-type-btn${regType==='student'?' active':''}`} onClick={() => setRegType('student')}>
                <i className="fa-solid fa-graduation-cap"></i>
                <div><div className="reg-type-label">Student / Learner</div><div className="reg-type-desc">Free · Pay per course only</div></div>
              </button>
              <button type="button" className={`reg-type-btn${regType==='member'?' active':''}`} onClick={() => setRegType('member')}>
                <i className="fa-solid fa-id-badge"></i>
                <div><div className="reg-type-label">FIP Member</div><div className="reg-type-desc">₹500/yr · Full access</div></div>
              </button>
            </div>

            <div className="reg-perks">
              <div className="reg-perks-inner">
                {regType === 'student' ? <>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Enroll in any course (pay per course)</div>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Get course completion certificates</div>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Track progress in your dashboard</div>
                  <div className="reg-perk reg-perk-no"><i className="fa-solid fa-xmark"></i> Member events &amp; networking</div>
                  <div className="reg-perk reg-perk-no"><i className="fa-solid fa-xmark"></i> Job board &amp; directory access</div>
                </> : <>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> All Student benefits included</div>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Free access to member-only courses</div>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Events, networking &amp; job board</div>
                  <div className="reg-perk"><i className="fa-solid fa-check"></i> Member directory &amp; committee access</div>
                </>}
              </div>
            </div>

            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group"><label className="form-label">Full Name *</label>
                <input className="form-input" name="fullName" type="text" placeholder="CA / CS / Adv. Full Name" required />
              </div>
              <div className="form-group"><label className="form-label">Profession *</label>
                <select className="form-select" name="profession" required>
                  <option value="">Select profession</option>
                  <option>Chartered Accountant</option><option>Company Secretary</option>
                  <option>Cost Accountant</option><option>Advocate</option>
                  <option>Student</option><option>Other</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email *</label>
                  <input className="form-input" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="form-group"><label className="form-label">Phone *</label>
                  <input className="form-input" name="phone" type="tel" placeholder="+91 XXXXX XXXXX" required />
                </div>
              </div>
              <div className="form-group"><label className="form-label">Password *</label>
                <input className="form-input" name="password" type="password" placeholder="Min 8 characters" required minLength={8} />
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}} disabled={loading}>
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating account…</>
                  : regType === 'student'
                  ? <><i className="fa-solid fa-graduation-cap"></i> Create Free Student Account</>
                  : <><i className="fa-solid fa-id-badge"></i> Create Account &amp; Pay ₹500</>
                }
              </button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                Already have an account?{' '}
                <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                  onClick={() => { clearError(); openModal('login', modalData); }}>Sign In</span>
              </p>
            </form>
          </>
        )}

        {/* ══════════════════════════════════
            COURSE ENROLL
        ══════════════════════════════════ */}
        {!otpStep && modal === 'enroll' && (
          <>
            {modalData?.course && (
              <div className="course-enroll-banner">
                <div className="course-enroll-emoji">📚</div>
                <div>
                  <div className="course-enroll-title">{modalData.course.title}</div>
                  <div className="course-enroll-meta">
                    {modalData.course.instructor && <span><i className="fa-solid fa-user-tie"></i> {modalData.course.instructor}</span>}
                    
                    {modalData.course.level && <span><i className="fa-solid fa-signal"></i> {modalData.course.level}</span>}
                  </div>
                </div>
              </div>
            )}
            <div className="modal-title" style={{marginTop:'16px'}}>Confirm Enrollment</div>
            <div className="enroll-price-box">
              <div className="enroll-price-row"><span>Course Fee</span><span>₹{modalData?.course?.price?.toLocaleString('en-IN') || '0'}</span></div>
              <div className="enroll-price-row"><span>GST (18%)</span><span>₹{Math.round((modalData?.course?.price || 0) * 0.18).toLocaleString('en-IN')}</span></div>
              <div className="enroll-price-row enroll-price-total"><span>Total Payable</span><span>₹{Math.round((modalData?.course?.price || 0) * 1.18).toLocaleString('en-IN')}</span></div>
            </div>
            <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'8px'}}>
              <i className="fa-solid fa-lock" style={{color:'var(--green)',marginTop:'2px',flexShrink:0}}></i>
              Secure payment powered by Razorpay. Your details are encrypted.
            </div>
            <form onSubmit={handleCourseEnroll}>
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-input" type="text" defaultValue={profile?.full_name || user?.user_metadata?.full_name || ''} required />
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label>
                  <input className="form-input" type="email" defaultValue={user?.email || ''} required />
                </div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-input" type="tel" defaultValue={profile?.phone || ''} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>
                <i className="fa-solid fa-lock"></i> Pay &amp; Enroll Now
              </button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════ RSVP ══════════════════════════════════ */}
        {!otpStep && modal === 'rsvp' && (
          <>
            <div className="modal-title">RSVP for Event</div>
            <div className="modal-sub">Confirm your attendance. RSVP closes 48 hours before the event.</div>
            <form onSubmit={handleRSVP}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" defaultValue={user?.user_metadata?.full_name||''} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue={user?.email||''} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Designation</label><input className="form-input" type="text" placeholder="e.g. CA, Partner at ABC & Co." required /></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm RSVP</button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════ TESTIMONIAL ══════════════════════════════════ */}
        {!otpStep && modal === 'testimonial' && (
          <>
            <div className="modal-title">Share Your Experience</div>
            <div className="modal-sub">Your testimonial will be reviewed before publishing.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleTestimonial}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Your Name *</label>
                  <input className="form-input" name="name" type="text" placeholder="CA / CS / Adv. Full Name" defaultValue={profile?.full_name||user?.user_metadata?.full_name||''} required />
                </div>
                <div className="form-group"><label className="form-label">Designation *</label>
                  <input className="form-input" name="designation" type="text" placeholder="e.g. Partner at ABC & Co." defaultValue={profile?.designation||''} required />
                </div>
              </div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" name="profession" defaultValue={profile?.profession||''}>
                  <option value="">Select</option>
                  <option>Chartered Accountant</option><option>Company Secretary</option>
                  <option>Cost Accountant</option><option>Advocate</option><option>Other</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Your Testimonial *</label>
                <textarea className="form-textarea" name="content" placeholder="How has FIP helped your professional journey?" required style={{minHeight:'110px'}}></textarea>
              </div>
              <div className="form-group"><label className="form-label">Rating</label>
                <select className="form-select" name="rating" defaultValue="5">
                  <option value="5">★★★★★ — Excellent</option>
                  <option value="4">★★★★☆ — Very Good</option>
                  <option value="3">★★★☆☆ — Good</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit for Review</>}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}