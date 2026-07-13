import * as React from 'react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRazorpay } from '../hooks/useRazorpay.js';
import { supabase } from '../lib/supabase.js';

export default function Modals() {
  const { modal, modalData, closeModal, openModal, showToast } = useApp();
  const { signIn, signUp, verifyOTP, resendOTP, sendResetOtp, verifyResetOtp, resetPasswordWithToken, getErrMsg, user, profile } = useAuth();
  const { pay } = useRazorpay();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [regType,  setRegType]  = useState('student');
  const [forgotStep,    setForgotStep]    = useState(false); // false|1|2|3
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotOtp,     setForgotOtp]     = useState(Array(6).fill(''));
  const [verifiedToken, setVerifiedToken] = useState('');
  const [newPwd,        setNewPwd]        = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [showNewPwd,    setShowNewPwd]    = useState(false);
  const [payStep,    setPayStep]    = useState(false);
  const [paySuccess, setPaySuccess] = useState(null); // { name, amount, plan }
  const [refCode,    setRefCode]    = useState('');
  const [memPrices,  setMemPrices]  = useState({ standard: 500, renewal: 200 });

  // Load live prices from site_settings
  React.useEffect(() => {
    supabase.from('site_settings').select('value').eq('key','membership').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          const std = Number(v.standard_price);
          const ren = Number(v.renewal_price);
          setMemPrices({
            standard: std > 0 ? std : 500,
            renewal:  ren > 0 ? ren : 200,
          });
        }
      });
  }, []);

  // Auto-fill referral code from URL ?ref= param
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref.toUpperCase());
  }, []);

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
    if (digits && i < 5) otpRefs.current[i+1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i-1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) otpRefs.current[i-1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i+1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    const next = [...otp];
    digits.forEach((d,i) => { if (i < 6) next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
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
    } catch (err) { setError(getErrMsg(err, 'Failed to resend OTP.')); }
  };

  /* ── Verify OTP ── */
  const handleVerifyOTP = async () => {
    const token = otp.join('');
    if (token.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      await verifyOTP({ email: otpEmail, token, pendingData });
      setOtpStep(false);

      if (regType === 'student') {
        closeModal();
        showToast('Email verified! Welcome to FIP.');
        if (modalData?.courseSlug) navigate(`/courses/${modalData.courseSlug}`);
        else navigate('/dashboard');
      } else {
        // Member — show payment step inside modal
        setOtpStep(false);
        setPayStep(true);
      }
    } catch (err) {
      setError(err.message?.includes('expired')
        ? 'OTP expired. Click "Resend OTP" to get a new one.'
        : err.message?.includes('invalid')
        ? 'Incorrect OTP. Please check your email and try again.'
        : getErrMsg(err, 'Verification failed. Please try again.'));
    } finally { setLoading(false); }
  };

  /* ── LOGIN ── */
  /* ── RESET PASSWORD HANDLERS ── */
  const handleSendResetOtp = async () => {
    if (!forgotEmail.trim()) { setError('Enter your email address.'); return; }
    setLoading(true); clearError();
    try {
      await sendResetOtp(forgotEmail.trim());
      setForgotStep(2);
      setForgotOtp(Array(6).fill(''));
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyResetOtp = async () => {
    const token = forgotOtp.join('');
    if (token.length !== 6) { setError('Enter the complete 6-digit OTP.'); return; }
    setLoading(true); clearError();
    try {
      const vToken = await verifyResetOtp(forgotEmail.trim(), token);
      setVerifiedToken(vToken);
      setForgotStep(3);
      setNewPwd(''); setNewPwdConfirm('');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleSetNewPassword = async () => {
    if (!newPwd || newPwd.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPwd !== newPwdConfirm)      { setError('Passwords do not match.'); return; }
    setLoading(true); clearError();
    try {
      await resetPasswordWithToken(forgotEmail.trim(), verifiedToken, newPwd);
      showToast('Password updated successfully! Please log in with your new password.');
      setForgotStep(false);
      setForgotEmail('');
      setVerifiedToken('');
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to update password. Please restart the process.');
    }
    setLoading(false);
  };

  const resetForgotFlow = () => {
    setForgotStep(false);
    setForgotEmail('');
    setForgotOtp(Array(6).fill(''));
    setVerifiedToken('');
    setNewPwd('');
    setNewPwdConfirm('');
    clearError();
  };

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
      const referralCode = f.referralCode?.value?.trim().toUpperCase() || null;

      const result = await signUp({
        email:        f.email.value.trim(),
        password:     f.password.value,
        fullName:     f.fullName.value.trim(),
        profession:   regType === 'member' ? f.profession?.value : 'Student',
        phone:        f.phone.value.trim(),
        accountType:  regType,
        referralCode,
      });

      setPendingData(result.pendingData);
      setOtpEmail(f.email.value.trim());

      if (result.needsOTP) {
        // Show OTP verification screen
        setOtp(['','','','','','']);
        setOtpStep(true);
        setError('');
      } else {
        // Email already confirmed (shouldn't happen normally)
        closeModal(); showToast('Account created!');
        navigate('/dashboard');
      }
    } catch (err) { setError(getErrMsg(err, 'Registration failed. Please try again.')); }
    finally { setLoading(false); }
  };

  /* ── COURSE ENROLL ── */
  const handleCourseEnroll = async (e) => {
    e.preventDefault();
    const course = modalData?.course;
    if (!course) return;
    // Free course — enroll directly
    if (!course.price || course.price === 0) {
      await supabase.from('course_enrollments').upsert({
        user_id: user.id, course_title: course.title,
        status: 'Enrolled', price_paid: 0, amount_paid: 0,
      }, { onConflict: 'user_id,course_title' });
      closeModal();
      showToast('Enrolled successfully!');
      if (course.slug) navigate(`/courses/${course.slug}/watch`);
      return;
    }
    // Paid course — real Razorpay payment
    closeModal();
    await pay({
      purchaseType: 'course',
      itemRefId:    course.slug || course.id,
      onSuccess:    () => {
        showToast('Enrolled successfully! 🎉');
        if (course.slug) navigate(`/courses/${course.slug}/watch`);
      },
    });
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
    <div className="modal-overlay" onClick={(!otpStep && !payStep && !paySuccess) ? closeModal : undefined}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {!otpStep && !payStep && !paySuccess && (
          <button className="modal-close" onClick={() => { closeModal(); clearError(); setOtpStep(false); }}>&#x2715;</button>
        )}

        {/* ══════════════════════════════════
            PAYMENT STEP (after member OTP)
        ══════════════════════════════════ */}
        {/* ══ PAYMENT SUCCESS SCREEN ══ */}
        {paySuccess && (
          <div style={{textAlign:'center',padding:'16px 8px'}}>
            {/* Animated checkmark */}
            <div style={{
              width:'80px',height:'80px',borderRadius:'50%',
              background:'linear-gradient(135deg,#16A34A,#22C55E)',
              display:'flex',alignItems:'center',justifyContent:'center',
              margin:'0 auto 20px',
              boxShadow:'0 8px 32px rgba(34,197,94,0.35)',
              animation:'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
            }}>
              <i className="fa-solid fa-check" style={{fontSize:'32px',color:'#fff'}}></i>
            </div>

            <div style={{fontSize:'22px',fontWeight:900,color:'var(--blue)',marginBottom:'6px',fontFamily:"'Playfair Display',serif"}}>
              Payment Successful! 🎉
            </div>
            <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'20px'}}>
              Welcome to FIP! Your membership is now <strong style={{color:'var(--green)'}}>Active</strong>.
            </p>

            {/* Receipt */}
            <div style={{background:'linear-gradient(135deg,#1A3C6E,#1B4A9E)',borderRadius:'14px',padding:'18px 20px',marginBottom:'20px',textAlign:'left'}}>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'10px'}}>Payment Receipt</div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{fontSize:'13px',color:'rgba(255,255,255,0.7)'}}>FIP {paySuccess.plan} Membership</span>
                <span style={{fontSize:'13px',fontWeight:700,color:'#FFD09B'}}>₹{paySuccess.amount}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{fontSize:'13px',color:'rgba(255,255,255,0.7)'}}>Validity</span>
                <span style={{fontSize:'13px',color:'rgba(255,255,255,0.8)'}}>1 Year</span>
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,0.15)',paddingTop:'10px',marginTop:'4px'}}>
                <div style={{fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>
                  <i className="fa-solid fa-envelope" style={{marginRight:'6px',color:'#FFD09B'}}></i>
                  A confirmation email has been sent to your inbox
                </div>
              </div>
            </div>

            {/* What's unlocked */}
            <div style={{background:'var(--green-pale)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'10px',padding:'14px 16px',marginBottom:'20px',textAlign:'left'}}>
              <div style={{fontSize:'12px',fontWeight:700,color:'#15803D',marginBottom:'8px'}}>
                <i className="fa-solid fa-unlock" style={{marginRight:'6px'}}></i>
                You now have access to:
              </div>
              {['Member Directory','Exclusive Events & RSVPs','Job Board','Committee Memberships','Webinars & Courses','Digital Certificate'].map((item,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'#166534',padding:'3px 0'}}>
                  <i className="fa-solid fa-circle-check" style={{color:'#22C55E',fontSize:'11px',flexShrink:0}}></i>
                  {item}
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => { setPaySuccess(null); closeModal(); navigate('/dashboard'); }}>
                <i className="fa-solid fa-gauge-high"></i> Go to Dashboard
              </button>
              <button className="btn btn-outline-blue btn-sm" onClick={() => { setPaySuccess(null); closeModal(); }}>
                Close
              </button>
            </div>

            <style>{`
              @keyframes popIn {
                from { transform: scale(0.5); opacity: 0; }
                to   { transform: scale(1);   opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {payStep && (
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'linear-gradient(135deg,#B8860B,#FFD700)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:'26px'}}>
              <i className="fa-solid fa-crown" style={{color:'#3D2B00'}}></i>
            </div>
            <div className="modal-title">One Last Step!</div>
            <p style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'20px',lineHeight:1.6}}>
              Your email is verified ✓<br/>
              Complete your payment to activate your <strong style={{color:'var(--blue)'}}>FIP Membership</strong>.
            </p>
            <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 20px',marginBottom:'20px',textAlign:'left'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}>
                <span style={{color:'var(--text-muted)'}}>FIP Standard Membership</span>
                <span style={{fontWeight:700}}>₹{memPrices.standard}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}>
                <span style={{color:'var(--text-muted)'}}>GST (18%)</span>
                <span style={{fontWeight:700}}>₹{Math.round(memPrices.standard * 0.18)}</span>
              </div>
              <div style={{height:'1px',background:'var(--border)',margin:'8px 0'}}></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,color:'var(--blue)'}}>
                <span>Total</span>
                <span>₹{memPrices.standard + Math.round(memPrices.standard * 0.18)}</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'6px'}}>Valid for 1 year · Secure payment via Razorpay</div>
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const success = await pay({
                    purchaseType: 'membership',
                    planName:     'Standard',
                    planPrice:    memPrices.standard,
                    onSuccess:    () => {
                      setPayStep(false);
                      setPaySuccess({
                        name:   profile?.full_name || user?.email || 'Member',
                        amount: memPrices.standard + Math.round(memPrices.standard * 0.18),
                        plan:   'Standard',
                      });
                    },
                  });
                  if (!success) {
                    setPayStep(false);
                    closeModal();
                    navigate('/membership');
                  }
                } catch(err) {
                  showToast('Payment error: ' + err.message, true);
                  console.error('Payment error:', err);
                }
              }}>
              <i className="fa-solid fa-lock"></i> Pay ₹{memPrices.standard + Math.round(memPrices.standard * 0.18)} & Activate Membership
            </button>
            <button className="btn btn-outline-blue btn-sm" style={{width:'100%',justifyContent:'center'}}
              onClick={() => { setPayStep(false); closeModal(); navigate('/membership'); }}>
              Pay Later
            </button>
            <p style={{fontSize:'11px',color:'var(--text-light)',marginTop:'10px'}}>
              <i className="fa-solid fa-shield-halved" style={{color:'var(--green)',marginRight:'4px'}}></i>
              256-bit SSL encrypted · Powered by Razorpay
            </p>
          </div>
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
              disabled={loading || otp.join('').length !== 6}
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
            {/* ──────── NORMAL LOGIN ──────── */}
            {!forgotStep && (
              <>
                <div className="modal-title">Welcome Back</div>
                <div className="modal-sub">Sign in to access your FIP dashboard, courses and events.</div>
                {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
                <form onSubmit={handleLogin}>
                  <div className="form-group"><label className="form-label">Email Address</label>
                    <input className="form-input" name="email" type="email" placeholder="you@example.com" required />
                  </div>
                  <div className="form-group">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <label className="form-label" style={{margin:0}}>Password</label>
                      <span style={{fontSize:'12px',color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                        onClick={() => { clearError(); setForgotStep(1); setForgotEmail(''); }}>
                        Forgot Password?
                      </span>
                    </div>
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

            {/* ──────── STEP 1: Enter Email ──────── */}
            {forgotStep === 1 && (
              <>
                <div className="modal-title">Reset Password</div>
                <div className="modal-sub">Enter your registered email. We'll send a 6-digit OTP to verify it's you.</div>
                {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
                <div className="form-group" style={{marginBottom:'16px'}}>
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@example.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendResetOtp()}
                    autoFocus />
                </div>
                <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}
                  disabled={loading || !forgotEmail.trim()} onClick={handleSendResetOtp}>
                  {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending…</> : <><i className="fa-solid fa-paper-plane"></i> Send OTP</>}
                </button>
                <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                  <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                    onClick={resetForgotFlow}>← Back to Login</span>
                </p>
              </>
            )}

            {/* ──────── STEP 2: Enter 6-digit OTP ──────── */}
            {forgotStep === 2 && (
              <>
                <div className="modal-title">Check Your Email</div>
                <div className="modal-sub">
                  We sent a 6-digit OTP to <strong>{forgotEmail}</strong>. Enter it below.
                </div>
                {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

                {/* OTP boxes — same style as signup OTP */}
                <div className="otp-boxes" style={{justifyContent:'center',margin:'20px 0 24px'}}>
                  {forgotOtp.map((d, i) => (
                    <input key={i} id={`frg-otp-${i}`} type="text" inputMode="numeric"
                      maxLength={1} value={d} className="otp-box"
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g,'').slice(-1);
                        const next = [...forgotOtp]; next[i] = val; setForgotOtp(next);
                        if (val && i < 5) document.getElementById(`frg-otp-${i+1}`)?.focus();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !forgotOtp[i] && i > 0)
                          document.getElementById(`frg-otp-${i-1}`)?.focus();
                      }}
                      onPaste={e => {
                        const paste = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                        if (paste.length === 6) {
                          setForgotOtp(paste.split(''));
                          document.getElementById(`frg-otp-5`)?.focus();
                        }
                        e.preventDefault();
                      }}
                    />
                  ))}
                </div>

                <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}}
                  disabled={loading || forgotOtp.join('').length !== 6} onClick={handleVerifyResetOtp}>
                  {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Verifying…</> : <><i className="fa-solid fa-check-circle"></i> Verify OTP</>}
                </button>
                <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                  Didn't receive it?{' '}
                  <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                    onClick={() => { clearError(); setForgotStep(1); }}>Resend OTP</span>
                  {' · '}
                  <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}
                    onClick={resetForgotFlow}>Cancel</span>
                </p>
              </>
            )}

            {/* ──────── STEP 3: Set New Password ──────── */}
            {forgotStep === 3 && (
              <>
                <div className="modal-title">Set New Password</div>
                <div className="modal-sub">OTP verified ✓ — choose a strong new password.</div>
                {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

                <div className="form-group" style={{marginBottom:'12px'}}>
                  <label className="form-label">New Password</label>
                  <div style={{position:'relative'}}>
                    <input className="form-input" type={showNewPwd ? 'text' : 'password'}
                      placeholder="Minimum 6 characters" value={newPwd}
                      onChange={e => setNewPwd(e.target.value)} style={{paddingRight:'42px'}} autoFocus />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'14px'}}>
                      <i className={`fa-solid fa-eye${showNewPwd ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{marginBottom:'20px'}}>
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password" placeholder="Repeat new password"
                    value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetNewPassword()} />
                </div>

                {/* Password strength indicator */}
                {newPwd.length > 0 && (
                  <div style={{marginBottom:'16px'}}>
                    <div style={{height:'4px',borderRadius:'2px',background:'var(--border)',marginBottom:'4px'}}>
                      <div style={{
                        height:'100%',borderRadius:'2px',transition:'width .3s',
                        width: newPwd.length < 6 ? '25%' : newPwd.length < 10 ? '60%' : '100%',
                        background: newPwd.length < 6 ? '#EF4444' : newPwd.length < 10 ? '#F59E0B' : 'var(--green)',
                      }}/>
                    </div>
                    <span style={{fontSize:'11px',color: newPwd.length < 6 ? '#EF4444' : newPwd.length < 10 ? '#F59E0B' : 'var(--green)'}}>
                      {newPwd.length < 6 ? 'Too short' : newPwd.length < 10 ? 'Good' : 'Strong ✓'}
                    </span>
                  </div>
                )}

                <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center'}}
                  disabled={loading || !newPwd || newPwd !== newPwdConfirm} onClick={handleSetNewPassword}>
                  {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Updating…</> : <><i className="fa-solid fa-lock"></i> Update Password</>}
                </button>
              </>
            )}
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
                <div><div className="reg-type-label">FIP Member</div><div className="reg-type-desc">₹{memPrices.standard}/yr · Full access</div></div>
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
                <input className="form-input" name="fullName" type="text"
                  placeholder={regType === 'student' ? 'Your full name' : 'CA / CS / Adv. Full Name'} required />
              </div>
              {regType === 'member' && (
                <div className="form-group"><label className="form-label">Profession *</label>
                  <select className="form-select" name="profession" required>
                    <option value="">Select profession</option>
                    <option>Chartered Accountant</option><option>Company Secretary</option>
                    <option>Cost Accountant</option><option>Advocate</option>
                    <option>Other</option>
                  </select>
                </div>
              )}
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
              <div className="form-group">
                <label className="form-label">
                  Referral Code
                  <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'6px'}}>— optional</span>
                </label>
                <input className="form-input" name="referralCode" type="text"
                  placeholder="e.g. FIP-ROHIT-A3X9"
                  defaultValue={refCode}
                  style={{textTransform:'uppercase',letterSpacing:'1px'}}/>
                <div style={{fontSize:'11px',color:'var(--green)',marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <i className="fa-solid fa-gift"></i>
                  Have a referral code? Enter it to help your friend earn a free membership year!
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}} disabled={loading}>
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating account…</>
                  : regType === 'student'
                  ? <><i className="fa-solid fa-graduation-cap"></i> Create Free Student Account</>
                  : <><i className="fa-solid fa-id-badge"></i> Create Account &amp; Pay ₹{memPrices.standard}</>
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