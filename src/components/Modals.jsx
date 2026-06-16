import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { submitTestimonial } from '../lib/api.js';

export default function Modals() {
  const { modal, closeModal, openModal, showToast } = useApp();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  if (!modal) return null;

  const clearError = () => setError('');

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const form = e.target;
    try {
      await signIn({ email: form.email.value.trim(), password: form.password.value });
      closeModal();
      showToast('Welcome back!');
      setTimeout(() => navigate('/dashboard'), 600);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  /* ── REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const form = e.target;
    try {
      await signUp({
        email:      form.email.value.trim(),
        password:   form.password.value,
        fullName:   form.fullName.value.trim(),
        profession: form.profession.value,
        phone:      form.phone.value.trim(),
      });
      closeModal();
      showToast('Account created! Check your email to verify.');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── ENROLL ── */
  const handleEnroll = (e) => {
    e.preventDefault();
    closeModal();
    if (!user) { showToast('Please sign in to enroll.', true); openModal('login'); return; }
    showToast('Enrollment submitted! Check your dashboard.');
  };

  /* ── RSVP ── */
  const handleRSVP = (e) => {
    e.preventDefault();
    closeModal();
    if (!user) { showToast('Please sign in to RSVP.', true); openModal('login'); return; }
    showToast('RSVP confirmed! See you at the event.');
  };

  /* ── TESTIMONIAL ── */
  const handleTestimonial = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const form = e.target;
    try {
      await submitTestimonial({
        userId:      user?.id || null,
        name:        form.name.value.trim(),
        designation: form.designation.value.trim(),
        content:     form.content.value.trim(),
        rating:      5,
      });
      closeModal();
      showToast('Thank you! Your testimonial will be reviewed shortly.');
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => { closeModal(); clearError(); }}>&#x2715;</button>

        {modal === 'login' && (
          <>
            <div className="modal-title">Welcome Back</div>
            <div className="modal-sub">Sign in to access your FIP dashboard, courses and events.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" name="email" type="email" placeholder="you@example.com" required /></div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" name="password" type="password" placeholder="••••••••" required /></div>
              <button type="submit" className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}} disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in…</> : 'Sign In'}
              </button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                No account? <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}} onClick={() => { clearError(); openModal('register'); }}>Join FIP</span>
              </p>
            </form>
          </>
        )}

        {modal === 'register' && (
          <>
            <div className="modal-title">Join FIP</div>
            <div className="modal-sub">Create your account and join 3,000+ finance professionals.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" name="fullName" type="text" placeholder="CA / CS / Adv. Full Name" required /></div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" name="profession" required>
                  <option value="">Select profession</option>
                  <option>Chartered Accountant</option><option>Company Secretary</option>
                  <option>Cost Accountant</option><option>Advocate</option><option>Other</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" name="email" type="email" placeholder="you@example.com" required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="phone" type="tel" placeholder="+91 XXXXX XXXXX" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" name="password" type="password" placeholder="Min 8 characters" required minLength={8} /></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'12px'}} disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating account…</> : 'Create Account — ₹500/yr'}
              </button>
              <p style={{textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>
                Already a member? <span style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}} onClick={() => { clearError(); openModal('login'); }}>Sign In</span>
              </p>
            </form>
          </>
        )}

        {modal === 'enroll' && (
          <>
            <div className="modal-title">Enroll in Course</div>
            <div className="modal-sub">Complete your details to reserve your seat.</div>
            <form onSubmit={handleEnroll}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="As per ICAI / ICSI records" defaultValue={user?.user_metadata?.full_name || ''} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue={user?.email || ''} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" required><option value="">Select</option><option>Chartered Accountant</option><option>Company Secretary</option><option>Cost Accountant</option><option>Advocate</option></select>
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
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="Your full name" defaultValue={user?.user_metadata?.full_name || ''} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue={user?.email || ''} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Designation</label><input className="form-input" type="text" placeholder="e.g. CA, Partner at ABC & Co." required /></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm RSVP</button>
            </form>
          </>
        )}

        {modal === 'testimonial' && (
          <>
            <div className="modal-title">Share Your Experience</div>
            <div className="modal-sub">Tell the community how FIP has helped your journey.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleTestimonial}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" name="name" type="text" placeholder="CA / CS / Adv. Name" defaultValue={user?.user_metadata?.full_name || ''} required /></div>
                <div className="form-group"><label className="form-label">Designation</label><input className="form-input" name="designation" type="text" placeholder="Your role" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Testimonial</label><textarea className="form-textarea" name="content" placeholder="How has FIP helped your professional journey?" required></textarea></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : 'Submit Testimonial'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}