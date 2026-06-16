import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { getEnrollments, getRSVPs, getPayments } from '../lib/api.js';
import AvatarUpload from '../components/AvatarUpload.jsx';

export default function DashboardPage() {
  const [tab, setTab]             = useState('overview');
  const { user, profile, loading, updateProfile } = useAuth();
  const { showToast }             = useApp();
  const navigate                  = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [rsvps,       setRsvps]       = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  /* redirect if not logged in */
  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

  /* load table data */
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      getEnrollments(user.id),
      getRSVPs(user.id),
      getPayments(user.id),
    ]).then(([e, r, p]) => {
      setEnrollments(e || []);
      setRsvps(r       || []);
      setPayments(p    || []);
    }).catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  /* save settings */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await updateProfile({
        full_name:   f.fullName.value.trim(),
        phone:       f.phone.value.trim(),
        city:        f.city.value.trim(),
        designation: f.designation.value.trim(),
      });
      showToast('Profile updated successfully!');
    } catch {
      showToast('Failed to save. Please try again.', true);
    }
  };

  /* derived values */
  const displayName  = profile?.full_name  || user?.user_metadata?.full_name || 'FIP Member';
  const displayRole  = profile?.profession || user?.user_metadata?.profession || 'Professional';
  const memberStatus = profile?.membership_status || 'Inactive';
  const memberPlan   = profile?.membership_plan   || 'Standard';
  const cpeCompleted = profile?.cpe_hours_completed || 0;
  const cpeRequired  = profile?.cpe_hours_required  || 25;
  const cpePercent   = Math.round((cpeCompleted / cpeRequired) * 100);
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  const navItems = [
    { id:'overview', icon:'fa-gauge-high',     label:'Overview' },
    { id:'courses',  icon:'fa-book-open',      label:'My Courses' },
    { id:'events',   icon:'fa-calendar-check', label:'Events' },
    { id:'payments', icon:'fa-receipt',        label:'Payments' },
    { id:'settings', icon:'fa-gear',           label:'Settings' },
  ];

  /* full-page spinner while session restores */
  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px',color:'var(--text-muted)'}}>
        <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
        <span style={{fontSize:'14px'}}>Loading your dashboard…</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="dash-layout">

      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
        <div className="dash-profile">

          {/* Avatar upload widget */}
          <AvatarUpload />

          <div className="dash-mname" style={{marginTop:'10px'}}>{displayName}</div>
          <div className="dash-mrole">{displayRole}</div>
          {profile?.designation && (
            <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'2px'}}>{profile.designation}</div>
          )}
          {profile?.city && (
            <div style={{fontSize:'11px',color:'var(--text-light)',display:'flex',alignItems:'center',gap:'4px',justifyContent:'center',marginTop:'2px'}}>
              <i className="fa-solid fa-location-dot" style={{color:'var(--orange)',fontSize:'10px'}}></i>
              {profile.city}
            </div>
          )}
          <span className={`dash-mbadge${memberStatus !== 'Active' ? ' inactive' : ''}`} style={{marginTop:'8px'}}>
            {memberStatus === 'Active' ? `✦ ${memberPlan} Member` : memberStatus}
          </span>
        </div>

        <nav>
          {navItems.map(n => (
            <button
              key={n.id}
              className={`dash-nav-btn${tab === n.id ? ' active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="dash-content">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="dash-card">
              <div className="dash-card-title">
                Welcome back, {displayName.split(' ')[0]} 👋
                <span style={{fontSize:'12px',color:'var(--text-light)'}}>
                  Member since {memberSince}
                </span>
              </div>
              {dataLoading ? (
                <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading…
                </div>
              ) : (
                <>
                  <div className="dash-metrics">
                    <div className="dash-metric">
                      <div className="dash-mval">{cpeCompleted}</div>
                      <div className="dash-mlbl">CPE Hours</div>
                    </div>
                    <div className="dash-metric">
                      <div className="dash-mval">{enrollments.length}</div>
                      <div className="dash-mlbl">Courses</div>
                    </div>
                    <div className="dash-metric">
                      <div className="dash-mval">{rsvps.length}</div>
                      <div className="dash-mlbl">Events RSVPd</div>
                    </div>
                  </div>
                  <div className="prog-wrap">
                    <div className="prog-label">
                      <span>CPE Hours Completed</span>
                      <span>{cpeCompleted} / {cpeRequired}</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{width:`${cpePercent}%`}}></div>
                    </div>
                  </div>
                  {profile?.membership_end && (
                    <p style={{fontSize:'12px',color:'var(--text-light)',marginTop:'12px'}}>
                      <i className="fa-solid fa-calendar" style={{color:'var(--orange)',marginRight:'5px'}}></i>
                      Membership valid until {new Date(profile.membership_end).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                    </p>
                  )}
                </>
              )}
            </div>

            {rsvps.length > 0 && (
              <div className="dash-card">
                <div className="dash-card-title">Recent RSVPs</div>
                {rsvps.slice(0,3).map((r,i) => (
                  <div className="upcoming-item" key={i}>
                    <div className="udate-box">
                      <div className="udb-day"><i className="fa-solid fa-calendar-check" style={{fontSize:'14px'}}></i></div>
                    </div>
                    <div>
                      <div className="up-title">{r.event_name}</div>
                      <div className="up-time">
                        {r.event_date || 'Date TBD'} &nbsp;·&nbsp;
                        <span className="status-pill sp-active" style={{fontSize:'10px',padding:'1px 6px'}}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MY COURSES */}
        {tab === 'courses' && (
          <div className="dash-card">
            <div className="dash-card-title">My Courses</div>
            {dataLoading
              ? <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin"></i> Loading…</div>
              : enrollments.length === 0
              ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-book-open" style={{fontSize:'32px',marginBottom:'12px',display:'block',opacity:.3}}></i>
                  <p>No courses enrolled yet.</p>
                  <button className="btn btn-secondary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/courses')}>Browse Courses</button>
                </div>
              ) : enrollments.map((c,i) => (
                <div className="my-course-item" key={i}>
                  <div style={{flex:1}}>
                    <div className="mci-title">{c.course_title}</div>
                    <div className="mci-sub">{c.course_category} · Enrolled {new Date(c.enrolled_at).toLocaleDateString('en-IN')}</div>
                    <div className="prog-track"><div className="prog-fill" style={{width:`${c.progress}%`}}></div></div>
                    <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>{c.progress}% · {c.status}</div>
                  </div>
                  <button className="btn btn-outline-blue btn-sm">Continue</button>
                </div>
              ))
            }
          </div>
        )}

        {/* EVENTS */}
        {tab === 'events' && (
          <div className="dash-card">
            <div className="dash-card-title">My RSVPs</div>
            {dataLoading
              ? <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin"></i> Loading…</div>
              : rsvps.length === 0
              ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-calendar" style={{fontSize:'32px',marginBottom:'12px',display:'block',opacity:.3}}></i>
                  <p>No event RSVPs yet.</p>
                  <button className="btn btn-secondary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/events')}>Browse Events</button>
                </div>
              ) : rsvps.map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)'}}>{r.event_name}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{r.event_date || 'Date TBD'}</div>
                  </div>
                  <span className="status-pill sp-active">{r.status}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* PAYMENTS */}
        {tab === 'payments' && (
          <div className="dash-card">
            <div className="dash-card-title">Payment History</div>
            {dataLoading
              ? <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin"></i> Loading…</div>
              : payments.length === 0
              ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-receipt" style={{fontSize:'32px',marginBottom:'12px',display:'block',opacity:.3}}></i>
                  <p>No payment records yet.</p>
                  <button className="btn btn-primary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/membership')}>Activate Membership</button>
                </div>
              ) : payments.map((p,i) => (
                <div key={i} style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'16px',marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                    <span style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{p.plan} Membership</span>
                    <span className="status-pill sp-active">{p.payment_status}</span>
                  </div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <span>₹{p.total_amount} paid</span>
                    <span>TXN: {p.transaction_id}</span>
                    <span>Valid: {p.valid_from} → {p.valid_until}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="dash-card">
            <div className="dash-card-title">Profile Settings</div>

            {/* Avatar section inside settings too */}
            <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px',marginBottom:'24px',display:'flex',alignItems:'center',gap:'24px',flexWrap:'wrap'}}>
              <AvatarUpload />
              <div>
                <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Profile Photo</div>
                <div style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.6}}>
                  Upload a professional photo.<br/>
                  JPG, PNG or WebP · Max 2MB
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" name="fullName" type="text" defaultValue={profile?.full_name || ''} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" name="phone" type="tel" defaultValue={profile?.phone || ''} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" name="city" type="text" defaultValue={profile?.city || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" name="designation" type="text" placeholder="e.g. Partner at ABC & Co." defaultValue={profile?.designation || ''} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email (cannot be changed)</label>
                <input className="form-input" type="email" value={user?.email || ''} disabled style={{opacity:.6,cursor:'not-allowed'}} />
              </div>
              <div className="form-group">
                <label className="form-label">Profession (cannot be changed)</label>
                <input className="form-input" type="text" value={profile?.profession || ''} disabled style={{opacity:.6,cursor:'not-allowed'}} />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm">Save Changes</button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}