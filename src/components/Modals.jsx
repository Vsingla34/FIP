import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Modals() {
  const { modal, closeModal, openModal, showToast } = useApp();
  const { signIn, signUp, user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!modal) return null;
  const clearError = () => setError('');

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      await signIn({ email: f.email.value.trim(), password: f.password.value });
      closeModal(); showToast('Welcome back!');
      setTimeout(() => navigate('/dashboard'), 600);
    } catch (err) { setError(err.message || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  /* ── REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      await signUp({
        email: f.email.value.trim(), password: f.password.value,
        fullName: f.fullName.value.trim(), profession: f.profession.value,
        phone: f.phone.value.trim(),
      });
      closeModal(); showToast('Account created! Check your email to verify.');
    } catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  /* ── ENROLL ── */
  const handleEnroll = (e) => {
    e.preventDefault(); closeModal();
    if (!user) { showToast('Please sign in to enroll.', true); openModal('login'); return; }
    showToast('Enrollment submitted! Check your dashboard.');
  };

  /* ── RSVP ── */
  const handleRSVP = (e) => {
    e.preventDefault(); closeModal();
    if (!user) { showToast('Please sign in to RSVP.', true); openModal('login'); return; }
    showToast('RSVP confirmed! See you at the event.');
  };

  /* ── TESTIMONIAL ── */
  const handleTestimonial = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    const f = e.target;
    try {
      const { error: dbError } = await supabase
        .from('testimonials')
        .insert({
          user_id:     user?.id || null,
          name:        f.name.value.trim(),
          designation: f.designation.value.trim(),
          profession:  f.profession?.value?.trim() || null,
          content:     f.content.value.trim(),
          rating:      parseInt(f.rating.value) || 5,
          status:      'pending',
          approved:    false,
        });
      if (dbError) throw dbError;
      closeModal();
      showToast('Thank you! Your testimonial has been submitted for review.');
    } catch (err) {
      console.error('Testimonial error:', err);
      setError('Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => { closeModal(); clearError(); }}>&#x2715;</button>

        {/* LOGIN */}
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

        {/* REGISTER */}
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

        {/* ENROLL */}
        {modal === 'enroll' && (
          <>
            <div className="modal-title">Enroll in Course</div>
            <div className="modal-sub">Complete your details to reserve your seat.</div>
            <form onSubmit={handleEnroll}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="As per ICAI / ICSI records" defaultValue={user?.user_metadata?.full_name||''} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue={user?.email||''} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Profession</label>
                <select className="form-select" required><option value="">Select</option>
                  <option>Chartered Accountant</option><option>Company Secretary</option>
                  <option>Cost Accountant</option><option>Advocate</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm Enrollment</button>
            </form>
          </>
        )}

        {/* RSVP */}
        {modal === 'rsvp' && (
          <>
            <div className="modal-title">RSVP for Event</div>
            <div className="modal-sub">Confirm your attendance. RSVP closes 48 hours before the event.</div>
            <form onSubmit={handleRSVP}>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="Your full name" defaultValue={user?.user_metadata?.full_name||''} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue={user?.email||''} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Designation</label><input className="form-input" type="text" placeholder="e.g. CA, Partner at ABC & Co." required /></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Confirm RSVP</button>
            </form>
          </>
        )}

        {/* TESTIMONIAL */}
        {modal === 'testimonial' && (
          <>
            <div className="modal-title">Share Your Experience</div>
            <div className="modal-sub">Tell the FIP community how membership has helped your journey. Your testimonial will be reviewed before publishing.</div>
            {error && <div className="auth-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
            <form onSubmit={handleTestimonial}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input className="form-input" name="name" type="text"
                    placeholder="CA / CS / Adv. Full Name"
                    defaultValue={profile?.full_name || user?.user_metadata?.full_name || ''}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <input className="form-input" name="designation" type="text"
                    placeholder="e.g. Partner at ABC & Co."
                    defaultValue={profile?.designation || ''}
                    required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Profession</label>
                <select className="form-select" name="profession" defaultValue={profile?.profession || ''}>
                  <option value="">Select profession</option>
                  <option>Chartered Accountant</option>
                  <option>Company Secretary</option>
                  <option>Cost Accountant</option>
                  <option>Advocate</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Your Testimonial *</label>
                <textarea className="form-textarea" name="content"
                  placeholder="How has FIP helped your professional journey? What events, courses or connections made a difference?"
                  required style={{minHeight:'110px'}}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <select className="form-select" name="rating" defaultValue="5">
                  <option value="5">★★★★★ — Excellent</option>
                  <option value="4">★★★★☆ — Very Good</option>
                  <option value="3">★★★☆☆ — Good</option>
                </select>
              </div>
              <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <i className="fa-solid fa-clock" style={{color:'var(--orange)',marginTop:'2px',flexShrink:0}}></i>
                Your testimonial will be reviewed by the FIP admin team before appearing on the website.
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