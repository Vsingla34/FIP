import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { getRSVPs, getPayments } from '../lib/api.js';
import AvatarUpload from '../components/AvatarUpload.jsx';
import { supabase } from '../lib/supabase.js';
import FlyerGenerator from '../components/FlyerGenerator.jsx';

/* ── Course Registrations Tab ── */
function CourseRegistrationsTab({ navigate }) {
  const [regs,    setRegs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_my_course_registrations').then(({ data }) => {
      setRegs(data || []);
      setLoading(false);
    });
  }, []);

  const isUpcoming = (d) => d && new Date(d) >= new Date();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : null;

  if (loading) return (
    <div className="dash-card" style={{textAlign:'center',padding:'40px'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i>
    </div>
  );

  return (
    <div className="dash-card">
      <div className="dash-card-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        My Courses
        <button className="btn btn-outline-blue btn-sm" onClick={() => navigate('/courses')}>
          <i className="fa-solid fa-plus"></i> Browse More
        </button>
      </div>

      {regs.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-book-open" style={{fontSize:'32px',marginBottom:'12px',display:'block',opacity:.3}}></i>
          <p>You haven't registered for any courses yet.</p>
          <button className="btn btn-primary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/courses')}>
            <i className="fa-solid fa-graduation-cap"></i> Browse Courses
          </button>
        </div>
      ) : regs.map((r, i) => {
        const upcoming = isUpcoming(r.event_end_date || r.event_date);
        const past     = r.event_date && !upcoming;

        return (
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:'16px',
            padding:'14px 0',
            borderBottom: i < regs.length-1 ? '1px solid var(--border)' : 'none',
            flexWrap:'wrap',
          }}>
            {/* Course thumbnail / icon */}
            {r.banner_url ? (
              <img src={r.banner_url} alt="" style={{width:'56px',height:'40px',borderRadius:'6px',objectFit:'cover',flexShrink:0,border:'1px solid var(--border)'}}/>
            ) : (
              <div style={{width:'56px',height:'40px',borderRadius:'6px',background:'var(--blue-pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>📚</div>
            )}

            {/* Details */}
            <div style={{flex:1,minWidth:'150px'}}>
              <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'3px'}}>{r.course_title}</div>
              <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                {r.category && <span>{r.category}</span>}
                {r.event_date && (
                  <span style={{color: upcoming ? 'var(--orange)' : 'var(--text-light)', fontWeight: upcoming ? 600 : 400}}>
                    <i className="fa-regular fa-calendar" style={{marginRight:'3px'}}></i>
                    {formatDate(r.event_date)}
                    {r.event_end_date && r.event_end_date !== r.event_date && (
                      <> – {formatDate(r.event_end_date)}</>
                    )}
                    {r.event_time && ` · ${r.event_time}`}
                  </span>
                )}
                <span style={{color:'var(--text-light)'}}>
                  Registered {new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                </span>
              </div>
            </div>

              {/* Status + Action button */}
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                {past && (
                  <span style={{fontSize:'11px',color:'var(--text-light)',background:'var(--off-white)',padding:'3px 10px',borderRadius:'20px',border:'1px solid var(--border)'}}>
                    Ended
                  </span>
                )}
                {upcoming && !r.zoom_link && (
                  <span style={{fontSize:'11px',color:'#F59E0B',fontWeight:600}}>
                    <i className="fa-solid fa-clock" style={{marginRight:'4px'}}></i>Link coming soon
                  </span>
                )}
                {r.zoom_link && upcoming && (
                  <a href={r.zoom_link} target="_blank" rel="noopener noreferrer"
                    style={{
                      display:'inline-flex',alignItems:'center',gap:'7px',
                      background:'#2D8CFF',color:'#fff',
                      padding:'8px 18px',borderRadius:'8px',
                      fontWeight:700,fontSize:'13px',textDecoration:'none',
                      boxShadow:'0 3px 12px rgba(45,140,255,0.35)',
                    }}>
                    <i className="fa-brands fa-zoom" style={{fontSize:'15px'}}></i>
                    Join Now
                  </a>
                )}
                {past && r.recording_url && (
                  <a href={r.recording_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display:'inline-flex',alignItems:'center',gap:'7px',
                      background:'#FF0000',color:'#fff',
                      padding:'8px 16px',borderRadius:'8px',
                      fontWeight:700,fontSize:'13px',textDecoration:'none',
                      boxShadow:'0 3px 12px rgba(255,0,0,0.25)',
                    }}>
                    <i className="fa-brands fa-youtube" style={{fontSize:'15px'}}></i>
                    Watch Recording
                  </a>
                )}
                {past && !r.recording_url && (
                  <span style={{fontSize:'11px',color:'var(--text-light)',fontStyle:'italic'}}>
                    Recording coming soon
                  </span>
                )}
              </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Certificates Tab ── */
function CertificatesTab({ userEmail, profile }) {
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Only load for users who have a proper FIP profile
  useEffect(() => {
    if (!userEmail || !profile?.id) return;
    supabase
      .from('certificates')
      .select('id, certificate_url, created_at, email_sent, template_url, courses(title, event_date)')
      .contains('recipient_email', [userEmail])
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCerts(data || []); setLoading(false); });
  }, [userEmail, profile?.id]);

  // User has no FIP account profile — shouldn't happen on dashboard but guard anyway
  if (!profile?.id) return (
    <div className="dash-card" style={{textAlign:'center', padding:'48px 0'}}>
      <i className="fa-solid fa-lock" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3,color:'var(--blue)'}}></i>
      <p style={{fontWeight:600,color:'var(--blue)',marginBottom:'6px'}}>FIP Account Required</p>
      <p style={{fontSize:'13px',color:'var(--text-muted)',maxWidth:'280px',margin:'0 auto'}}>
        Certificate downloads are only available to registered FIP members.
      </p>
    </div>
  );

  if (loading) return (
    <div className="dash-card" style={{textAlign:'center',padding:'40px'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i>
    </div>
  );

  return (
    <div className="dash-card">
      <div className="dash-card-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        My Certificates
        <span style={{fontSize:'12px',fontWeight:400,color:'var(--text-muted)'}}>
          {certs.length} certificate{certs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {certs.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-muted)'}}>
          <div style={{width:'72px',height:'72px',borderRadius:'50%',background:'var(--blue-pale)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'28px'}}>
            <i className="fa-solid fa-certificate" style={{color:'var(--blue)',opacity:.5}}></i>
          </div>
          <p style={{fontWeight:600,color:'var(--blue)',marginBottom:'6px'}}>No certificates yet</p>
          <p style={{fontSize:'13px',lineHeight:1.6,maxWidth:'280px',margin:'0 auto'}}>
            Certificates from completed courses and webinars will appear here for download.
          </p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {certs.map((c, i) => {
            const courseTitle = c.courses?.title || 'FIP Course';
            const eventDate   = c.courses?.event_date
              ? new Date(c.courses.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
              : null;
            const issuedDate  = new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
            const style       = c.template_url;
            const styleColors = {
              classic:      { bg:'#F8F6F0', accent:'#C9A84C', text:'#1A3C6E' },
              modern:       { bg:'#FFFFFF', accent:'#F26122', text:'#1A3C6E' },
              professional: { bg:'#0F2044', accent:'#DAA520', text:'#FFFFFF' },
            };
            const sc = styleColors[style] || styleColors.classic;

            return (
              <div key={c.id || i} style={{
                display:'flex', alignItems:'center', gap:'16px',
                padding:'16px', borderRadius:'var(--radius-lg)',
                border:'1px solid var(--border)',
                background:'var(--surface)',
                flexWrap:'wrap',
              }}>
                {/* Certificate mini-preview */}
                <div style={{
                  width:'72px', height:'52px', borderRadius:'8px',
                  background: sc.bg,
                  border: `2px solid ${sc.accent}`,
                  display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  gap:'4px', flexShrink:0, overflow:'hidden',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <i className="fa-solid fa-certificate" style={{fontSize:'18px', color: sc.accent}}></i>
                  <div style={{fontSize:'6px', fontWeight:700, color: sc.text, textAlign:'center', lineHeight:1.2, padding:'0 4px'}}>
                    CERTIFICATE
                  </div>
                </div>

                {/* Details */}
                <div style={{flex:1, minWidth:'150px'}}>
                  <div style={{fontSize:'14px', fontWeight:700, color:'var(--blue)', marginBottom:'3px'}}>
                    {courseTitle}
                  </div>
                  <div style={{fontSize:'12px', color:'var(--text-muted)', display:'flex', gap:'10px', flexWrap:'wrap'}}>
                    {eventDate && (
                      <span>
                        <i className="fa-regular fa-calendar" style={{marginRight:'3px'}}></i>
                        {eventDate}
                      </span>
                    )}
                    <span>
                      <i className="fa-solid fa-award" style={{marginRight:'3px',color:'var(--orange)'}}></i>
                      Issued {issuedDate}
                    </span>
                    {c.email_sent && (
                      <span style={{color:'var(--green)'}}>
                        <i className="fa-solid fa-envelope-circle-check" style={{marginRight:'3px'}}></i>
                        Emailed
                      </span>
                    )}
                  </div>
                </div>

                {/* Download button */}
                {c.certificate_url ? (
                  <a
                    href={c.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    style={{
                      display:'inline-flex', alignItems:'center', gap:'7px',
                      background:'var(--blue)', color:'#fff',
                      padding:'9px 18px', borderRadius:'8px',
                      fontWeight:700, fontSize:'13px', textDecoration:'none',
                      flexShrink:0, boxShadow:'0 2px 8px rgba(26,60,110,0.2)',
                      transition:'background .15s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background='#0F2A5E'}
                    onMouseOut={e  => e.currentTarget.style.background='var(--blue)'}
                  >
                    <i className="fa-solid fa-download"></i> Download PDF
                  </a>
                ) : (
                  <span style={{fontSize:'12px',color:'var(--text-light)',fontStyle:'italic'}}>
                    Processing…
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Referral Panel Component ── */
function ReferralPanel({ profile }) {
  const [stats,         setStats]         = useState(null);
  const [referredUsers, setReferredUsers] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [copied,        setCopied]        = useState(false);
  const { showToast } = useApp();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc('get_my_referral_stats');
      let statsResult = data?.[0] || null;
      if (!statsResult?.code) {
        // Generate code first
        await supabase.rpc('get_my_referral_code');
        const { data: d2 } = await supabase.rpc('get_my_referral_stats');
        statsResult = d2?.[0] || null;
      }
      setStats(statsResult);

      // Fetch the actual list of people referred
      const { data: usersList, error: usersErr } = await supabase.rpc('get_my_referred_users');
      if (!usersErr) setReferredUsers(usersList || []);

      setLoading(false);
    };
    load();
  }, []);

  const referralLink = stats?.code
    ? `${window.location.origin}?ref=${stats.code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Referral link copied!');
  };

  const shareWhatsApp = () => {
    const msg = `Join me on FIP — India's largest network of CAs, CSs & CMAs! Use my referral link to sign up: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return (
    <div className="dash-card" style={{textAlign:'center',padding:'40px'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i>
    </div>
  );

  const completed = (stats?.completed || 0) + (stats?.rewarded || 0);
  const progress  = completed % 10;
  const earned    = Math.floor(completed / 10);
  const needed    = stats?.next_reward_at || (10 - progress);

  return (
    <>
      {/* Hero card */}
      <div style={{background:'linear-gradient(135deg,var(--blue) 0%,#1B4A9E 100%)',borderRadius:'var(--radius-lg)',padding:'28px',marginBottom:'16px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-20px',right:'-20px',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
        <div style={{position:'absolute',bottom:'-30px',right:'40px',width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{fontSize:'13px',fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>
          Refer & Earn
        </div>
        <h2 style={{fontSize:'22px',fontWeight:800,color:'#fff',marginBottom:'6px',fontFamily:"'Playfair Display',serif"}}>
          Invite 10 Members → Get 1 Free Year
        </h2>
        <p style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',margin:'0 0 20px',lineHeight:1.6}}>
          Share your unique referral link. For every 10 members who join and activate their membership, your membership renews free for 1 year.
        </p>

        {/* Referral code + copy */}
        <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',backdropFilter:'blur(8px)'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.45)',marginBottom:'2px',textTransform:'uppercase',letterSpacing:'1px'}}>Your Referral Code</div>
            <div style={{fontSize:'16px',fontWeight:800,color:'#FFD09B',letterSpacing:'2px',fontFamily:'monospace'}}>{stats?.code || '—'}</div>
          </div>
          <button onClick={copyLink} style={{background:copied?'var(--green)':'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:700,flexShrink:0,transition:'all 0.2s'}}>
            {copied ? <><i className="fa-solid fa-check" style={{marginRight:'5px'}}></i>Copied!</> : <><i className="fa-solid fa-copy" style={{marginRight:'5px'}}></i>Copy Link</>}
          </button>
          <button onClick={shareWhatsApp} style={{background:'#25D366',border:'none',color:'#fff',width:'36px',height:'36px',borderRadius:'8px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="fa-brands fa-whatsapp"></i>
          </button>
        </div>
      </div>

      {/* Progress card */}
      <div className="dash-card" style={{marginBottom:'16px'}}>
        <div className="dash-card-title">Your Progress</div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            { val: stats?.total||0,     label:'Total Referrals',    color:'var(--blue)'   },
            { val: stats?.pending||0,   label:'Pending',            color:'#F59E0B'        },
            { val: completed,           label:'Completed',          color:'var(--green)'   },
            { val: earned,              label:'Free Years Earned',  color:'var(--orange)'  },
          ].map((s,i) => (
            <div key={i} style={{textAlign:'center',padding:'14px',background:'var(--off-white)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
              <div style={{fontSize:'28px',fontWeight:800,color:s.color,lineHeight:1,fontFamily:"'Playfair Display',serif"}}>{s.val}</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress toward next reward */}
        <div style={{marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'13px',fontWeight:600,color:'var(--blue)'}}>Progress to next free year</span>
          <span style={{fontSize:'13px',fontWeight:700,color:'var(--orange)'}}>{progress}/10</span>
        </div>
        <div style={{height:'10px',background:'var(--border)',borderRadius:'5px',overflow:'hidden',marginBottom:'8px'}}>
          <div style={{height:'100%',width:`${(progress/10)*100}%`,background:'linear-gradient(90deg,var(--orange),#FF8C42)',borderRadius:'5px',transition:'width 0.6s ease'}}/>
        </div>
        <p style={{fontSize:'12px',color:'var(--text-muted)',margin:0}}>
          {progress === 0 && earned > 0
            ? <><i className="fa-solid fa-party-horn" style={{color:'var(--orange)',marginRight:'5px'}}></i>You just earned a free year! Keep going — invite {needed} more to earn another.</>
            : <><i className="fa-solid fa-gift" style={{color:'var(--orange)',marginRight:'5px'}}></i>Invite <strong>{needed} more member{needed!==1?'s':''}</strong> to get 1 year free membership!</>
          }
        </p>
      </div>

      {/* People You've Referred */}
      <div className="dash-card" style={{marginBottom:'16px'}}>
        <div className="dash-card-title">
          People You've Referred
          <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400,marginLeft:'8px'}}>({referredUsers.length})</span>
        </div>

        {referredUsers.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-muted)'}}>
            <i className="fa-solid fa-user-group" style={{fontSize:'28px',display:'block',marginBottom:'10px',opacity:.3}}></i>
            <p style={{fontSize:'13px',margin:0}}>No one has used your referral code yet.</p>
            <p style={{fontSize:'12px',marginTop:'4px'}}>Share your link above to start earning!</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {referredUsers.map((u, i) => {
              const initials = (u.full_name || '?').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase();
              const statusMap = {
                pending:   { label:'Pending',          color:'#F59E0B', bg:'#FEF3C7', icon:'fa-clock' },
                completed: { label:'Activated',        color:'var(--green)', bg:'#DCFCE7', icon:'fa-circle-check' },
                rewarded:  { label:'Counted ✓ Reward',  color:'#B8860B', bg:'rgba(184,134,11,0.1)', icon:'fa-trophy' },
              };
              const s = statusMap[u.status] || statusMap.pending;
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:'var(--off-white)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                    : <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--blue-pale)',color:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,flexShrink:0}}>{initials}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>{u.full_name}</div>
                    <div style={{fontSize:'11px',color:'var(--text-light)'}}>
                      Joined {new Date(u.joined_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      {u.account_type && <span style={{marginLeft:'6px',textTransform:'capitalize'}}>· {u.account_type}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:700,color:s.color,background:s.bg,padding:'4px 10px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
                    <i className={`fa-solid ${s.icon}`}></i> {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="dash-card">
        <div className="dash-card-title">How It Works</div>
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {[
            { icon:'fa-share-nodes',  color:'var(--blue)',   title:'Share your link',       desc:'Send your unique referral link to CA, CS, CMA or Advocate friends.' },
            { icon:'fa-user-plus',    color:'var(--orange)', title:'They sign up',           desc:'Your friend creates an account using your referral link or code.' },
            { icon:'fa-credit-card',  color:'var(--green)',  title:'They activate',          desc:'When they pay and activate their FIP membership, you get credit.' },
            { icon:'fa-trophy',       color:'#B8860B',       title:'You earn free membership', desc:'Every 10 activations = 1 free year automatically added to your account.' },
          ].map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'14px',padding:'12px',background:'var(--off-white)',borderRadius:'var(--radius-md)',border:'1px solid var(--border)'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`fa-solid ${s.icon}`} style={{color:s.color,fontSize:'14px'}}></i>
              </div>
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'2px'}}>{s.title}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',lineHeight:1.6}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Committee Members Panel (for gold members) ── */
function CommitteeMembersPanel({ committeeName, currentUserId }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!committeeName) return;
    supabase.rpc('get_committee_members')
      .then(({ data }) => {
        setMembers((data || []).filter(m => m.committee_name === committeeName));
      });
  }, [committeeName]);

  const getInitials = (name) =>
    (name || '').split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0,2).toUpperCase();

  const roleOrder = { 'Chairman':1, 'Co-Chairman':2, 'Chairperson':1, 'Co-Chairperson':2, 'Secretary':3, 'Member':4 };
  const sorted = [...members].sort((a,b) => (roleOrder[a.committee_role]||5) - (roleOrder[b.committee_role]||5));

  if (!sorted.length) return <div style={{fontSize:'12px',color:'#8B6000'}}>Loading members…</div>;

  return (
    <div>
      {sorted.map((m, i) => (
        <div key={i} className="gold-cm-row">
          {m.avatar_url
            ? <img src={m.avatar_url} alt="" style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',border:'2px solid #FFD700',flexShrink:0}}/>
            : <div className="gold-cm-av">{getInitials(m.full_name)}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div className="gold-cm-name">
              {m.full_name}
              {m.id === currentUserId && <span style={{fontSize:'9px',fontWeight:700,color:'#B8860B',marginLeft:'6px',background:'rgba(184,134,11,0.1)',padding:'1px 6px',borderRadius:'10px'}}>You</span>}
            </div>
            <div className="gold-cm-role">{m.committee_role}</div>
          </div>
          {m.profession && <div style={{fontSize:'10px',color:'#B8860B',flexShrink:0}}>{m.profession.split(' ').map(w=>w[0]).join('')}</div>}
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab]             = useState(() => {
    // Support ?tab=messages from notification links
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    return urlTab || 'overview';
  });
  const [notifications,    setNotifications]    = useState([]);
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [contactMessages,  setContactMessages]  = useState([]);
  const [activeFlyerItem,  setActiveFlyerItem]  = useState(null); // {title, whatYouLearn, date, templateUrl}
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

  /* load notifications + contact message history */
  useEffect(() => {
    if (!user) return;
    // Fetch notifications
    supabase.from('notifications').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.is_read).length);
      });
    // Fetch user's contact messages — match by user_id OR email (catches pre-login messages)
    supabase.from('contact_messages')
      .select('id,subject,message,reply_text,replied_at,created_at,status,user_id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setContactMessages(data || []);
      });
  }, [user]);

  /* load table data */
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      supabase.rpc('get_my_course_registrations'),
      getRSVPs(user.id),
      getPayments(user.id),
    ]).then(([e, r, p]) => {
      setEnrollments(e?.data || []);
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
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  const navItems = [
    { id:'overview',      icon:'fa-gauge-high',     label:'Overview' },
    { id:'courses',       icon:'fa-book-open',      label:'My Courses' },
    { id:'certificates',  icon:'fa-certificate',    label:'Certificates' },
    { id:'events',        icon:'fa-calendar-check', label:'Events' },
    { id:'messages',      icon:'fa-envelope',       label:'Messages' },
    { id:'flyers',        icon:'fa-image',          label:'My Flyers' },
    { id:'referral',      icon:'fa-gift',           label:'Refer & Earn' },
    { id:'payments',      icon:'fa-receipt',        label:'Payments' },
    { id:'settings',      icon:'fa-gear',           label:'Settings' },
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
          {/* Gold badge for committee members */}
          {profile?.is_committee_member && (
            <div style={{marginTop:'8px',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
              <span className="gold-badge"><i className="fa-solid fa-crown"></i> Committee Member</span>
              <span style={{fontSize:'10px',color:'#8B6000',fontWeight:600}}>{profile.committee_role} · {profile.committee_name?.replace(' Committee','')}</span>
            </div>
          )}
          <span className={`dash-mbadge${memberStatus !== 'Active' ? ' inactive' : ''}`} style={{marginTop:'8px',
            ...(profile?.is_committee_member ? {background:'linear-gradient(135deg,#B8860B,#DAA520)',color:'#fff',border:'none'} : {})
          }}>
            {profile?.is_committee_member ? '👑 Committee Member' : memberStatus === 'Active' ? `✦ ${memberPlan} Member` : memberStatus}
          </span>

          {/* FIP Member Number — shown only for active paid members */}
          {profile?.fip_member_no && (
            <div style={{marginTop:'10px',background:'linear-gradient(135deg,#1A3C6E,#0D2040)',borderRadius:'8px',padding:'10px 14px',textAlign:'center',border:'1px solid rgba(255,208,155,0.3)'}}>
              <div style={{fontSize:'10px',fontWeight:700,color:'rgba(255,208,155,0.7)',letterSpacing:'2px',marginBottom:'4px',textTransform:'uppercase'}}>
                FIP Member ID
              </div>
              <div style={{fontSize:'18px',fontWeight:900,color:'#FFD09B',letterSpacing:'3px',fontFamily:'monospace'}}>
                {profile.fip_member_no}
              </div>
            </div>
          )}
        </div>

        <nav>
          {navItems.map(n => (
            <button
              key={n.id}
              className={`dash-nav-btn${tab === n.id ? ' active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
              {n.id === 'messages' && unreadCount > 0 && (
                <span style={{background:'#F26522',color:'#fff',borderRadius:'50%',fontSize:'10px',fontWeight:700,padding:'1px 6px',marginLeft:'6px'}}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="dash-content">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            {/* ── Gold Committee Panel ── */}
            {profile?.is_committee_member && (
              <div className="gold-panel" style={{marginBottom:'20px'}}>
                <div className="gold-panel-title">
                  <i className="fa-solid fa-crown" style={{color:'#B8860B',fontSize:'18px'}}></i>
                  Your Committee
                </div>
                <div className="gold-panel-sub">
                  {profile.committee_role} · {profile.committee_name}
                </div>
                <CommitteeMembersPanel committeeName={profile.committee_name} currentUserId={profile.id} />
              </div>
            )}

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
          <CourseRegistrationsTab navigate={navigate} />
        )}

        {/* CERTIFICATES */}
        {tab === 'certificates' && (
          <CertificatesTab userEmail={user?.email} profile={profile} />
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
        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <h2 style={{fontSize:'20px',fontWeight:800,color:'var(--blue)',margin:0}}>
                  <i className="fa-solid fa-envelope" style={{marginRight:'10px',color:'var(--orange)'}}></i>
                  Messages
                </h2>
                <p style={{fontSize:'13px',color:'var(--text-muted)',margin:'4px 0 0'}}>
                  Your conversations with FIP team
                </p>
              </div>
              {unreadCount > 0 && (
                <button style={{background:'var(--blue)',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}
                  onClick={async () => {
                    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                  }}>
                  <i className="fa-solid fa-check-double" style={{marginRight:'6px'}}></i>
                  Mark all as read
                </button>
              )}
            </div>

            {contactMessages.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
                <i className="fa-solid fa-envelope-open" style={{fontSize:'48px',opacity:.2,display:'block',marginBottom:'12px'}}></i>
                <div style={{fontWeight:600}}>No messages yet</div>
                <p style={{fontSize:'13px',marginTop:'6px'}}>
                  When you send a message from the Contact page, your conversation with FIP will appear here.
                </p>
                <a href="/contact" style={{display:'inline-block',marginTop:'12px',background:'var(--blue)',color:'#fff',padding:'10px 24px',borderRadius:'8px',textDecoration:'none',fontWeight:700,fontSize:'13px'}}>
                  Send a Message
                </a>
              </div>
            ) : contactMessages.map(msg => (
              <div key={msg.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'14px',padding:'20px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                {/* Subject */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                  <div style={{fontWeight:700,color:'var(--blue)',fontSize:'15px'}}>
                    <i className="fa-solid fa-tag" style={{color:'var(--orange)',marginRight:'7px',fontSize:'12px'}}></i>
                    {msg.subject}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                    {new Date(msg.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                </div>

                {/* User's original message — right aligned */}
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'12px'}}>
                  <div style={{maxWidth:'85%'}}>
                    <div style={{fontSize:'10px',color:'var(--text-muted)',textAlign:'right',marginBottom:'4px',fontWeight:600}}>You</div>
                    <div style={{background:'var(--blue)',color:'#fff',borderRadius:'14px 14px 2px 14px',padding:'12px 16px',fontSize:'14px',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                      {msg.message}
                    </div>
                  </div>
                </div>

                {/* FIP Reply — left aligned */}
                {msg.reply_text ? (
                  <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:'13px',flexShrink:0}}>F</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'4px',fontWeight:600}}>
                        FIP Team · {msg.replied_at ? new Date(msg.replied_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}
                      </div>
                      <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'2px 14px 14px 14px',padding:'12px 16px',fontSize:'14px',lineHeight:1.7,color:'var(--text-dark)',whiteSpace:'pre-wrap'}}>
                        {msg.reply_text}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--off-white)',border:'2px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:'13px',flexShrink:0}}>
                      <i className="fa-solid fa-clock"></i>
                    </div>
                    <div style={{fontSize:'13px',color:'var(--text-muted)',fontStyle:'italic'}}>
                      FIP team will reply soon…
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MY FLYERS TAB */}
        {tab === 'flyers' && (
          <div>
            {activeFlyerItem && (
              <FlyerGenerator
                name={profile?.full_name || user?.email}
                courseTitle={activeFlyerItem.title}
                whatYouLearn={activeFlyerItem.whatYouLearn || []}
                eventDate={activeFlyerItem.date}
                flyerTemplateUrl={activeFlyerItem.templateUrl}
                logoUrl={`${window.location.origin}/logo.png`}
                onClose={() => setActiveFlyerItem(null)}
              />
            )}
            <div style={{marginBottom:'20px'}}>
              <h2 style={{fontSize:'20px',fontWeight:800,color:'var(--blue)',margin:'0 0 4px'}}>
                <i className="fa-solid fa-image" style={{marginRight:'10px',color:'var(--orange)'}}></i>
                My Flyers
              </h2>
              <p style={{fontSize:'13px',color:'var(--text-muted)',margin:0}}>
                Generate shareable LinkedIn & WhatsApp flyers for your courses and events
              </p>
            </div>

            {/* Course Flyers */}
            {enrollments.filter(e => e.enable_flyer !== false).length > 0 && (
              <div style={{marginBottom:'28px'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'12px'}}>
                  📚 Courses
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'14px'}}>
                  {enrollments.map((e, i) => (
                    <div key={i} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                      {e.banner_url && <img src={e.banner_url} alt={e.course_title} style={{width:'100%',height:'100px',objectFit:'cover'}}/>}
                      <div style={{padding:'14px'}}>
                        <div style={{fontWeight:700,fontSize:'13px',color:'var(--blue)',marginBottom:'4px',lineHeight:1.4}}>
                          {e.course_title || 'Course'}
                        </div>
                        {e.event_date && (
                          <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'10px'}}>
                            📅 {new Date(e.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                          </div>
                        )}
                        <button onClick={() => setActiveFlyerItem({
                          title:       e.course_title,
                          whatYouLearn: [],
                          date:         e.event_date,
                          templateUrl:  e.flyer_template_url,
                        })} style={{width:'100%',background:'var(--orange)',color:'#fff',border:'none',borderRadius:'8px',padding:'9px',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                          <i className="fa-solid fa-image"></i> Generate Flyer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Flyers */}
            {rsvps.filter(r => r.enable_flyer !== false).length > 0 && (
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'12px'}}>
                  📅 Events
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'14px'}}>
                  {rsvps.map((r, i) => (
                    <div key={i} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                      <div style={{padding:'14px'}}>
                        <div style={{fontWeight:700,fontSize:'13px',color:'var(--blue)',marginBottom:'4px',lineHeight:1.4}}>
                          {r.event_name || r.events?.title || 'Event'}
                        </div>
                        {(r.event_date || r.events?.event_date) && (
                          <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'10px'}}>
                            📅 {new Date(r.event_date || r.events?.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                          </div>
                        )}
                        <button onClick={() => setActiveFlyerItem({
                          title:       r.event_name || r.events?.title,
                          whatYouLearn: [],
                          date:         r.event_date || r.events?.event_date,
                          templateUrl:  r.events?.flyer_template_url,
                        })} style={{width:'100%',background:'var(--blue)',color:'#fff',border:'none',borderRadius:'8px',padding:'9px',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                          <i className="fa-solid fa-image"></i> Generate Flyer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enrollments.length === 0 && rsvps.length === 0 && (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
                <i className="fa-solid fa-image" style={{fontSize:'48px',opacity:.2,display:'block',marginBottom:'12px'}}></i>
                <div style={{fontWeight:600}}>No flyers yet</div>
                <p style={{fontSize:'13px',marginTop:'6px'}}>Register for courses and events to generate shareable flyers.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'referral' && (
          <ReferralPanel profile={profile} />
        )}

        {tab === 'payments' && (
          <div className="dash-card">
            <div className="dash-card-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
              Payment History
              {payments.length > 0 && (
                <button
                  style={{background:'#217346',color:'#fff',border:'none',borderRadius:'8px',padding:'7px 14px',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
                  onClick={() => {
                    const headers = ['Item / Plan','Amount (₹)','GST (₹)','Total (₹)','Status','Transaction ID','Valid From','Valid Until','Date'];
                    const rows = payments.map(p => [
                      p.item_name||'',
                      p.amount||0,
                      p.gst_amount||0,
                      p.total_amount||0,
                      p.status||'',
                      p.razorpay_payment_id||'',
                      p.valid_from ? new Date(p.valid_from).toLocaleDateString('en-IN') : '',
                      p.valid_until ? new Date(p.valid_until).toLocaleDateString('en-IN') : '',
                      p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '',
                    ]);
                    const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
                    a.download = 'FIP_Payment_History.csv';
                    a.click();
                  }}>
                  <i className="fa-solid fa-file-excel"></i> Download Excel
                </button>
              )}
            </div>
            {dataLoading
              ? <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin"></i> Loading…</div>
              : payments.length === 0
              ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-receipt" style={{fontSize:'32px',marginBottom:'12px',display:'block',opacity:.3}}></i>
                  <p>No payment records yet.</p>
                  <button className="btn btn-primary btn-sm" style={{marginTop:'12px'}} onClick={() => navigate('/membership')}>Activate Membership</button>
                </div>
              ) : payments.map((p,i) => {
                const statusMap = {
                  paid:     { label:'Paid',     cls:'sp-active',   color:'var(--green)' },
                  created:  { label:'Pending',  cls:'sp-pending',  color:'#F59E0B' },
                  failed:   { label:'Failed',   cls:'sp-rejected', color:'#EF4444' },
                  refunded: { label:'Refunded', cls:'sp-pending',  color:'var(--text-muted)' },
                };
                const s = statusMap[p.status] || statusMap.created;
                return (
                  <div key={i} style={{background: p.status==='paid' ? 'var(--blue-pale)' : 'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'16px',marginBottom:'12px',opacity: p.status==='failed' ? 0.7 : 1}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',flexWrap:'wrap',gap:'8px'}}>
                      <span style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{p.item_name || 'Membership'}</span>
                      <span className={`status-pill ${s.cls}`}>
                        {p.status === 'paid' && <i className="fa-solid fa-circle-check" style={{marginRight:'4px'}}></i>}
                        {p.status === 'created' && <i className="fa-solid fa-clock" style={{marginRight:'4px'}}></i>}
                        {p.status === 'failed' && <i className="fa-solid fa-circle-xmark" style={{marginRight:'4px'}}></i>}
                        {s.label}
                      </span>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'16px',flexWrap:'wrap'}}>
                      <span>₹{p.total_amount} {p.status==='paid' ? 'paid' : p.status==='created' ? '(pending)' : ''}</span>
                      {p.razorpay_payment_id && <span>TXN: {p.razorpay_payment_id}</span>}
                      {p.status === 'paid' && p.valid_from && (
                        <span>Valid: {new Date(p.valid_from).toLocaleDateString('en-IN')} → {new Date(p.valid_until).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                    {p.status === 'created' && (
                      <div style={{fontSize:'11px',color:'#F59E0B',marginTop:'8px'}}>
                        <i className="fa-solid fa-triangle-exclamation" style={{marginRight:'4px'}}></i>
                        Payment was not completed. {new Date() - new Date(p.created_at) > 3600000 ? 'This order has expired.' : 'You can retry from the Membership page.'}
                      </div>
                    )}
                  </div>
                );
              })
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