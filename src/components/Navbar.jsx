import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openModal } = useApp();
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Member';
  const initials = displayName
    .split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

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
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="nav-logo-fallback" style={{ display: 'none' }}>
            <div className="nav-logo-fallback-icon">F</div>
            <div>
              <div className="nav-logo-fallback-text">Federation of Indian Professionals</div>
              <div className="nav-logo-fallback-sub">Connect · Collaborate · Conquer</div>
            </div>
          </div>
        </Link>

        <div className="nav-links">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link${location.pathname === l.to ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          {user ? (
            /* ── LOGGED IN STATE ── */
            <>
              <Link to="/dashboard" className="nav-user-btn">
                <div className="nav-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} /> : initials}</div>
                <div className="nav-user-info">
                  <span className="nav-user-name">{displayName.split(' ')[0]}</span>
                  <span className="nav-user-plan">{profile?.membership_status === 'Active' ? `✦ ${profile.membership_plan || 'Standard'} Member` : profile ? 'Inactive' : '…'}</span>
                </div>
              </Link>
              <button className="nav-btn-login" onClick={handleSignOut}>Sign Out</button>
            </>
          ) : (
            /* ── LOGGED OUT STATE ── */
            <>
              <button className="nav-btn-login" onClick={() => openModal('login')}>Log In</button>
              <Link to="/membership" className="nav-btn-join">Join FIP</Link>
            </>
          )}
        </div>

        <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
          <span /><span /><span />
        </button>
      </div>

      {/* ── MOBILE MENU ── */}
      <div className={`nav-mobile-menu${mobileOpen ? ' open' : ''}`}>
        <button className="nav-mobile-close" onClick={() => setMobileOpen(false)}>&#x2715;</button>
        <div style={{ textAlign: 'center', padding: '12px 0 20px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          <img src="https://www.fipin.org/images/our-img/logo.png" alt="FIP Logo" style={{ height: '44px', margin: '0 auto' }} onError={e => e.target.style.display = 'none'} />
        </div>
        {links.map(l => (
          <Link key={l.to} to={l.to} className="nav-mobile-link">{l.label}</Link>
        ))}
        {user ? (
          <>
            <Link to="/dashboard" className="nav-mobile-link">
              <i className="fa-solid fa-circle-user" style={{ width: '18px', color: 'var(--orange)' }}></i> My Dashboard
            </Link>
            <div style={{ padding: '12px 16px 16px' }}>
              <button className="btn btn-outline-blue" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSignOut}>Sign Out</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', padding: '0 16px 16px' }}>
            <button className="btn btn-outline-blue" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { openModal('login'); setMobileOpen(false); }}>Log In</button>
            <Link to="/membership" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Join FIP</Link>
          </div>
        )}
      </div>
    </nav>
  );
}