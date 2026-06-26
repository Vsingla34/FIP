import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import { committees } from '../data/index.js';

function getInitials(name = '') {
  return name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Find member in hardcoded committees by slug
function findHardcodedMember(slug) {
  for (const c of committees) {
    for (const m of c.members) {
      if (nameToSlug(m.name) === slug) {
        return { name: m.name, role: m.role, committeeName: c.name };
      }
    }
  }
  return null;
}

export default function MemberProfilePage() {
  const { slug }      = useParams();
  const { user, profile: myProfile, updateProfile } = useAuth();
  const { showToast } = useApp();
  const navigate      = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [hardcoded,setHardcoded]= useState(null); // from local data
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});

  const isOwner = user && myProfile?.profile_slug === slug;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. Check hardcoded data first — this always works
      const hc = findHardcodedMember(slug);

      // 2. Try to get DB profile (registered user)
      const { data: dbData } = await supabase
        .from('profiles')
        .select('*')
        .eq('profile_slug', slug)
        .maybeSingle();

      // 3. If found in DB and is committee member
      if (dbData && dbData.is_committee_member) {
        setProfile(dbData);
        setHardcoded(hc);
        setForm({
          tagline:      dbData.tagline      || '',
          bio:          dbData.bio          || '',
          designation:  dbData.designation  || '',
          organisation: dbData.organisation || '',
          city:         dbData.city         || '',
          linkedin_url: dbData.linkedin_url || '',
          website_url:  dbData.website_url  || '',
          expertise:    (dbData.expertise   || []).join(', '),
        });
        setLoading(false);
        return;
      }

      // 4. If only in hardcoded data (not registered in Supabase yet)
      if (hc) {
        setHardcoded(hc);
        setProfile(null); // no DB profile
        setLoading(false);
        return;
      }

      // 5. Not found anywhere
      navigate('/committees');
    };
    load();
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        tagline:      form.tagline.trim()      || null,
        bio:          form.bio.trim()          || null,
        designation:  form.designation.trim()  || null,
        organisation: form.organisation.trim() || null,
        city:         form.city.trim()         || null,
        linkedin_url: form.linkedin_url.trim() || null,
        website_url:  form.website_url.trim()  || null,
        expertise:    form.expertise.split(',').map(e => e.trim()).filter(Boolean),
      };
      await updateProfile(updates);
      setProfile(prev => ({ ...prev, ...updates }));
      setEditing(false);
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast('Failed to save: ' + err.message, true);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px',color:'var(--text-muted)'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
      <span>Loading profile…</span>
    </div>
  );

  // Use DB profile if available, else hardcoded
  const name          = profile?.full_name || hardcoded?.name || 'Committee Member';
  const role          = profile?.committee_role || hardcoded?.role || 'Member';
  const committeeName = profile?.committee_name || hardcoded?.committeeName || '';
  const isGold        = true; // all committee members get gold treatment

  const AV_COLORS = ['#1A3C6E','#B8860B','#1B6B3A','#7C3AED','#B91C1C'];
  const avColor   = AV_COLORS[name.charCodeAt(0) % AV_COLORS.length];

  return (
    <>
      {/* ── Hero ── */}
      <div style={{
        background:'linear-gradient(135deg,#3D2B00 0%,#5C3D00 50%,#3D2B00 100%)',
        padding:'48px 0 80px', position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 30% 50%,rgba(255,215,0,0.12),transparent 60%)',pointerEvents:'none'}}/>
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'24px'}}>
            <Link to="/committees" style={{color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Committees</Link>
            <i className="fa-solid fa-chevron-right" style={{color:'rgba(255,255,255,0.3)'}}></i>
            <span style={{color:'rgba(255,255,255,0.8)'}}>{name}</span>
          </div>

          <div style={{display:'flex',alignItems:'flex-end',gap:'28px',flexWrap:'wrap'}}>
            {/* Avatar */}
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',inset:'-3px',borderRadius:'50%',background:'linear-gradient(135deg,#B8860B,#FFD700,#DAA520,#FFD700,#B8860B)',zIndex:0}}/>
              <div style={{
                width:'96px',height:'96px',borderRadius:'50%',
                background:profile?.avatar_url ? 'transparent' : `linear-gradient(135deg,${avColor},${avColor}dd)`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'32px',fontWeight:800,color:'#FFD09B',
                position:'relative',zIndex:1,
                border:'3px solid #3D2B00',overflow:'hidden',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : getInitials(name)
                }
              </div>
              <div style={{
                position:'absolute',bottom:'-2px',right:'-2px',
                width:'28px',height:'28px',borderRadius:'50%',
                background:'linear-gradient(135deg,#B8860B,#FFD700)',
                display:'flex',alignItems:'center',justifyContent:'center',
                border:'2px solid #3D2B00',zIndex:2,
              }}>
                <i className="fa-solid fa-crown" style={{fontSize:'11px',color:'#3D2B00'}}></i>
              </div>
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:'200px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap',marginBottom:'6px'}}>
                <h1 style={{fontSize:'clamp(24px,4vw,36px)',fontWeight:800,color:'#fff',margin:0,fontFamily:"'Playfair Display',serif",lineHeight:1.1}}>
                  {name}
                </h1>
                <span className="gold-badge"><i className="fa-solid fa-crown"></i> Committee</span>
              </div>
              {profile?.tagline && (
                <p style={{fontSize:'15px',color:'#FFD09B',margin:'0 0 8px',fontStyle:'italic'}}>"{profile.tagline}"</p>
              )}
              <div style={{display:'flex',flexWrap:'wrap',gap:'12px',fontSize:'13px',color:'rgba(255,208,155,0.7)'}}>
                {(profile?.profession) && <span><i className="fa-solid fa-briefcase" style={{marginRight:'5px'}}></i>{profile.profession}</span>}
                {(profile?.designation || profile?.city) && (
                  <>
                    {profile?.designation && <span><i className="fa-solid fa-id-badge" style={{marginRight:'5px'}}></i>{profile.designation}</span>}
                    {profile?.city && <span><i className="fa-solid fa-location-dot" style={{marginRight:'5px'}}></i>{profile.city}</span>}
                  </>
                )}
                <span style={{color:'#FFD700',fontWeight:700}}>
                  <i className="fa-solid fa-users" style={{marginRight:'5px'}}></i>
                  {role} · {committeeName?.replace(' Committee','')}
                </span>
              </div>
            </div>

            {isOwner && !editing && (
              <button className="btn btn-sm" style={{background:'rgba(255,255,255,0.12)',color:'#fff',border:'1px solid rgba(255,255,255,0.25)',flexShrink:0}}
                onClick={() => setEditing(true)}>
                <i className="fa-solid fa-pen"></i> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <section className="section section-alt" style={{marginTop:'-32px'}}>
        <div className="container">
          <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'24px',alignItems:'start'}}>

            <div>
              {editing ? (
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'28px'}}>
                  <div style={{fontSize:'18px',fontWeight:700,color:'var(--blue)',marginBottom:'20px'}}>
                    <i className="fa-solid fa-pen" style={{color:'var(--orange)',marginRight:'8px'}}></i>Edit Your Profile
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input className="form-input" placeholder="e.g. GST Specialist · 10+ years" value={form.tagline} onChange={e=>setForm(f=>({...f,tagline:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea className="form-textarea" placeholder="Your professional journey…" value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} style={{minHeight:'120px'}}></textarea>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input className="form-input" placeholder="Partner, Senior Associate…" value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Organisation</label>
                      <input className="form-input" placeholder="Firm or company name" value={form.organisation} onChange={e=>setForm(f=>({...f,organisation:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" placeholder="New Delhi" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">LinkedIn URL</label>
                      <input className="form-input" placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={e=>setForm(f=>({...f,linkedin_url:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expertise Areas <span style={{fontWeight:400,color:'var(--text-light)'}}>— comma separated</span></label>
                    <input className="form-input" placeholder="GST, IBC, Corporate Law, FEMA" value={form.expertise} onChange={e=>setForm(f=>({...f,expertise:e.target.value}))}/>
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save Profile</>}
                    </button>
                    <button className="btn btn-outline-blue" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {profile?.bio ? (
                    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px',marginBottom:'16px'}}>
                      <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'12px',display:'flex',alignItems:'center',gap:'8px'}}>
                        <i className="fa-solid fa-user" style={{color:'var(--orange)'}}></i> About
                      </div>
                      <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.8,margin:0,whiteSpace:'pre-wrap'}}>{profile.bio}</p>
                    </div>
                  ) : isOwner ? (
                    <div onClick={() => setEditing(true)} style={{background:'var(--off-white)',border:'2px dashed var(--border)',borderRadius:'var(--radius-lg)',padding:'32px',marginBottom:'16px',textAlign:'center',cursor:'pointer',color:'var(--text-muted)'}}>
                      <i className="fa-solid fa-pen" style={{fontSize:'22px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                      <div style={{fontWeight:600}}>Add your bio</div>
                      <div style={{fontSize:'12px',marginTop:'4px'}}>Tell other members about yourself</div>
                    </div>
                  ) : (
                    <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'32px',marginBottom:'16px',textAlign:'center',color:'var(--text-muted)'}}>
                      <i className="fa-solid fa-user" style={{fontSize:'28px',display:'block',marginBottom:'10px',opacity:.25}}></i>
                      <p style={{fontSize:'14px',margin:0}}>This member hasn't added a bio yet.</p>
                    </div>
                  )}

                  {profile?.expertise?.length > 0 && (
                    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px',marginBottom:'16px'}}>
                      <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                        <i className="fa-solid fa-star" style={{color:'var(--orange)'}}></i> Areas of Expertise
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                        {profile.expertise.map((e,i) => (
                          <span key={i} style={{background:'rgba(184,134,11,0.08)',color:'#8B6000',border:'1px solid rgba(184,134,11,0.2)',fontSize:'12px',fontWeight:600,padding:'5px 14px',borderRadius:'20px'}}>
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Committee role gold panel */}
                  <div className="gold-panel">
                    <div className="gold-panel-title">
                      <i className="fa-solid fa-crown" style={{color:'#B8860B'}}></i> FIP Committee Role
                    </div>
                    <div className="gold-panel-sub">{committeeName}</div>
                    <span className="gold-badge"><i className="fa-solid fa-crown"></i> {role}</span>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div style={{background:'linear-gradient(160deg,#FFFBF0,#FFF8E1)',border:'1.5px solid #FFD700',borderRadius:'var(--radius-lg)',padding:'20px',position:'relative',overflow:'hidden'}}>
                <div style={{height:'3px',background:'linear-gradient(90deg,#B8860B,#FFD700,#B8860B)',borderRadius:'2px',margin:'-20px -20px 16px'}}/>
                <div style={{fontSize:'12px',fontWeight:700,color:'#8B6000',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px'}}>Profile Details</div>
                {[
                  { icon:'fa-briefcase',    val: profile?.profession   },
                  { icon:'fa-id-badge',     val: profile?.designation  },
                  { icon:'fa-building',     val: profile?.organisation },
                  { icon:'fa-location-dot', val: profile?.city         },
                  { icon:'fa-calendar',     val: profile?.created_at ? `Member since ${new Date(profile.created_at).getFullYear()}` : null },
                ].filter(r => r.val).map((r, i) => (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'7px 0',borderBottom:'1px solid rgba(184,134,11,0.1)'}}>
                    <i className={`fa-solid ${r.icon}`} style={{color:'#B8860B',fontSize:'12px',marginTop:'2px',width:'14px',textAlign:'center',flexShrink:0}}></i>
                    <span style={{fontSize:'13px',color:'#3D2B00'}}>{r.val}</span>
                  </div>
                ))}

                {(profile?.linkedin_url || profile?.website_url) && (
                  <div style={{display:'flex',gap:'8px',marginTop:'14px'}}>
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener"
                        style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(184,134,11,0.1)',color:'#8B6000',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',fontSize:'14px',border:'1px solid rgba(184,134,11,0.2)'}}>
                        <i className="fa-brands fa-linkedin-in"></i>
                      </a>
                    )}
                    {profile.website_url && (
                      <a href={profile.website_url} target="_blank" rel="noopener"
                        style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(184,134,11,0.1)',color:'#8B6000',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',fontSize:'14px',border:'1px solid rgba(184,134,11,0.2)'}}>
                        <i className="fa-solid fa-globe"></i>
                      </a>
                    )}
                  </div>
                )}

                {!profile && (
                  <p style={{fontSize:'12px',color:'#8B6000',margin:0}}>
                    This member hasn't set up their profile yet.
                    {isOwner && <><br/><button onClick={() => setEditing(true)} style={{background:'none',border:'none',color:'var(--orange)',fontWeight:600,cursor:'pointer',fontSize:'12px',padding:0,marginTop:'6px'}}>Set up your profile →</button></>}
                  </p>
                )}
              </div>

              {isOwner && !editing && (
                <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)',padding:'14px 16px',fontSize:'12px',color:'var(--blue-mid)'}}>
                  <i className="fa-solid fa-circle-info" style={{marginRight:'6px'}}></i>
                  This is your public profile visible to all FIP members.
                  <button onClick={() => setEditing(true)} style={{display:'block',marginTop:'8px',background:'none',border:'none',color:'var(--orange)',fontWeight:600,cursor:'pointer',fontSize:'12px',padding:0}}>
                    Edit profile →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}