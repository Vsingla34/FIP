import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { committees as defaultCommittees } from '../data/index.js';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const STORAGE_KEY = 'fip_committees';

function loadCommittees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultCommittees;
  } catch { return defaultCommittees; }
}

function saveCommittees(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // also dispatch event so CommitteesPage reacts
  window.dispatchEvent(new Event('committees-updated'));
}

const ROLE_OPTIONS   = ['President','Vice President','Chairman','Co-Chairman','Co-Chairperson','Secretary','Treasurer','Member'];
const CATEGORY_ICONS = {
  Governance:'fa-solid fa-sitemap', Media:'fa-solid fa-mobile-screen-button',
  Development:'fa-solid fa-rocket', Tax:'fa-solid fa-landmark',
  Law:'fa-solid fa-scale-balanced', Finance:'fa-solid fa-coins',
  Audit:'fa-solid fa-magnifying-glass-chart', Technology:'fa-solid fa-microchip',
  Education:'fa-solid fa-graduation-cap', International:'fa-solid fa-globe',
  Other:'fa-solid fa-circle-nodes',
};
const CATEGORIES = Object.keys(CATEGORY_ICONS);

/* ─────────────────────────────────────────
   ADMIN PAGE
───────────────────────────────────────── */
export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');

  /* members state */
  const [members,        setMembers]        = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch,   setMemberSearch]   = useState('');

  /* committees state */
  const [committees,    setCommittees]    = useState(loadCommittees);
  const [editModal,     setEditModal]     = useState(null); // { mode:'committee'|'member', committeeId, memberIdx? }
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, committeeId, memberIdx? }

  /* committee form */
  const [cForm, setCForm] = useState({ name:'', abbr:'', category:'Other', desc:'' });

  /* member form */
  const [mForm, setMForm] = useState({ name:'', role:'Member' });

  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  /* ── load members ── */
  useEffect(() => {
    if (tab !== 'members') return;
    setLoadingMembers(true);
    supabase.rpc('get_all_profiles')
      .then(({ data, error }) => {
        if (!error) setMembers(data || []);
      })
      .finally(() => setLoadingMembers(false));
  }, [tab]);

  /* ── persist committees ── */
  useEffect(() => { saveCommittees(committees); }, [committees]);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  /* ── role / status changes ── */
  const handleRoleChange = async (memberId, newRole) => {
    const { error } = await supabase.rpc('admin_update_profile', { target_id: memberId, new_role: newRole });
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };
  const handleStatusChange = async (memberId, newStatus) => {
    const { error } = await supabase.rpc('admin_update_profile', { target_id: memberId, new_status: newStatus });
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, membership_status: newStatus } : m));
  };

  /* ════════════════════════════════════════
     COMMITTEE CRUD
  ════════════════════════════════════════ */

  /* open add-committee modal */
  const openAddCommittee = () => {
    setCForm({ name:'', abbr:'', category:'Other', desc:'' });
    setEditModal({ mode:'committee', committeeId: null });
  };

  /* open edit-committee modal */
  const openEditCommittee = (c) => {
    setCForm({ name: c.name, abbr: c.abbr || '', category: c.category, desc: c.desc || '' });
    setEditModal({ mode:'committee', committeeId: c.id });
  };

  /* save committee (add or edit) */
  const saveCommittee = () => {
    if (!cForm.name.trim()) return;
    if (editModal.committeeId === null) {
      // ADD
      const newId = Math.max(0, ...committees.map(c => c.id)) + 1;
      setCommittees(prev => [...prev, {
        id: newId,
        name: cForm.name.trim(),
        abbr: cForm.abbr.trim() || cForm.name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,6),
        category: cForm.category,
        icon: CATEGORY_ICONS[cForm.category] || CATEGORY_ICONS.Other,
        desc: cForm.desc.trim(),
        members: [],
      }]);
    } else {
      // EDIT
      setCommittees(prev => prev.map(c => c.id === editModal.committeeId
        ? { ...c, name: cForm.name.trim(), abbr: cForm.abbr.trim(), category: cForm.category,
            icon: CATEGORY_ICONS[cForm.category] || c.icon, desc: cForm.desc.trim() }
        : c
      ));
    }
    setEditModal(null);
  };

  /* delete committee */
  const deleteCommittee = (committeeId) => {
    setCommittees(prev => prev.filter(c => c.id !== committeeId));
    setConfirmDelete(null);
  };

  /* ════════════════════════════════════════
     MEMBER CRUD (within committee)
  ════════════════════════════════════════ */

  /* open add-member modal */
  const openAddMember = (committeeId) => {
    setMForm({ name:'', role:'Member' });
    setEditModal({ mode:'member', committeeId, memberIdx: null });
  };

  /* open edit-member modal */
  const openEditMember = (committeeId, idx, member) => {
    setMForm({ name: member.name, role: member.role });
    setEditModal({ mode:'member', committeeId, memberIdx: idx });
  };

  /* save member (add or edit) */
  const saveMember = () => {
    if (!mForm.name.trim()) return;
    setCommittees(prev => prev.map(c => {
      if (c.id !== editModal.committeeId) return c;
      const members = [...c.members];
      if (editModal.memberIdx === null) {
        members.push({ name: mForm.name.trim(), role: mForm.role });
      } else {
        members[editModal.memberIdx] = { name: mForm.name.trim(), role: mForm.role };
      }
      return { ...c, members };
    }));
    setEditModal(null);
  };

  /* delete member */
  const deleteMember = (committeeId, memberIdx) => {
    setCommittees(prev => prev.map(c => {
      if (c.id !== committeeId) return c;
      return { ...c, members: c.members.filter((_, i) => i !== memberIdx) };
    }));
    setConfirmDelete(null);
  };

  /* move member up/down */
  const moveMember = (committeeId, idx, dir) => {
    setCommittees(prev => prev.map(c => {
      if (c.id !== committeeId) return c;
      const members = [...c.members];
      const target = idx + dir;
      if (target < 0 || target >= members.length) return c;
      [members[idx], members[target]] = [members[target], members[idx]];
      return { ...c, members };
    }));
  };

  /* ── testimonials state ── */
  const [testimonials,  setTestimonials] = useState([]);
  const [testiLoading,  setTestiLoading] = useState(false);
  const [testiFilter,   setTestiFilter]  = useState('pending');

  useEffect(() => {
    if (tab !== 'testimonials') return;
    setTestiLoading(true);
    supabase.rpc('admin_get_testimonials')
      .then(({ data, error }) => { if (!error) setTestimonials(data || []); })
      .finally(() => setTestiLoading(false));
  }, [tab]);

  const handleTestiAction = async (id, action) => {
    if (action === 'delete') {
      const { error } = await supabase.rpc('admin_delete_testimonial', { testimonial_id: id });
      if (!error) setTestimonials(prev => prev.filter(t => t.id !== id));
      return;
    }
    const { data, error } = await supabase.rpc('admin_review_testimonial', {
      testimonial_id: id, new_status: action,
    });
    if (!error && data) setTestimonials(prev => prev.map(t => t.id === id ? data : t));
  };

  /* ── nav items ── */
  const navItems = [
    { id:'dashboard',    icon:'fa-chart-line',   label:'Dashboard' },
    { id:'members',      icon:'fa-users',         label:'Members' },
    { id:'committees',   icon:'fa-people-group',  label:'Committees' },
    { id:'testimonials', icon:'fa-star',           label:'Testimonials' },
    { id:'settings',     icon:'fa-gear',           label:'Settings' },
  ];

  const totalMembers  = members.length;
  const activeMembers = members.filter(m => m.membership_status === 'Active').length;
  const adminCount    = members.filter(m => m.role === 'admin').length;
  const filteredMembers = members.filter(m =>
    !memberSearch ||
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.profession?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const getRoleStyle = (role) => {
    const r = (role||'').toLowerCase();
    if (r.includes('president')||r.includes('chairman')||r.includes('chairperson'))
      return { bg:'rgba(242,101,34,0.12)', color:'var(--orange-dark)', border:'1px solid #F5C4A8' };
    if (r.includes('vice')||r.includes('co-chair')||r.includes('secretary')||r.includes('treasurer'))
      return { bg:'var(--blue-tint)', color:'var(--blue-mid)', border:'1px solid #C0CDE8' };
    return { bg:'var(--off-white)', color:'var(--text-muted)', border:'1px solid var(--border)' };
  };

  const getInitials = (name) =>
    (name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div id="page-admin">

      {/* ── Top Bar ── */}
      <div style={{background:'var(--blue)',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',position:'sticky',top:0,zIndex:200}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <Link to="/"><img src="https://www.fipin.org/images/our-img/logo.png" alt="FIP" style={{height:'36px'}} onError={e=>e.target.style.display='none'}/></Link>
          <div style={{width:'1px',height:'24px',background:'rgba(255,255,255,0.15)'}}/>
          <span style={{color:'#FFD09B',fontSize:'13px',fontWeight:700,letterSpacing:'0.5px'}}>
            <i className="fa-solid fa-shield-halved" style={{marginRight:'7px'}}></i>Admin Panel
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>
            <strong style={{color:'#FFD09B'}}>{profile?.full_name || profile?.email}</strong>
          </span>
          <Link to="/" style={{fontSize:'12px',color:'rgba(255,255,255,0.45)',textDecoration:'none'}}>← Site</Link>
          <button onClick={handleSignOut} style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',background:'none',border:'1px solid rgba(255,255,255,0.15)',padding:'4px 12px',borderRadius:'6px',cursor:'pointer'}}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="admin-layout">

        {/* ── Sidebar ── */}
        <div className="admin-sidebar-panel" style={{position:'sticky',top:'56px',alignSelf:'flex-start',height:'calc(100vh - 56px)',overflowY:'auto'}}>
          <div style={{padding:'20px 14px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)',marginBottom:'8px'}}>
            <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'17px',marginBottom:'8px'}}>
              {getInitials(profile?.full_name || 'Admin')}
            </div>
            <div style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{profile?.full_name || 'Admin'}</div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>{profile?.email}</div>
            <div style={{marginTop:'8px',display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(242,101,34,0.25)',border:'1px solid rgba(242,101,34,0.4)',color:'#FFD09B',fontSize:'10px',fontWeight:700,padding:'3px 10px',borderRadius:'4px',textTransform:'uppercase',letterSpacing:'0.5px'}}>
              <i className="fa-solid fa-shield-halved" style={{fontSize:'9px'}}></i> Admin
            </div>
          </div>
          <div className="admin-nav-section">Navigation</div>
          {navItems.map(n => (
            <button key={n.id} className={`admin-nav-item${tab===n.id?' active':''}`} onClick={() => setTab(n.id)}>
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
            </button>
          ))}
          <div className="admin-nav-section" style={{marginTop:'16px'}}>Quick Stats</div>
          <div style={{padding:'0 8px'}}>
            {[
              { label:'Total Members', val: totalMembers,  color:'var(--blue-soft)' },
              { label:'Active',        val: activeMembers, color:'var(--green)' },
              { label:'Committees',    val: committees.length, color:'var(--orange)' },
            ].map((s,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 8px',borderRadius:'6px',marginBottom:'2px'}}>
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>{s.label}</span>
                <span style={{fontSize:'14px',fontWeight:700,color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="admin-content-panel">

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <>
              <h2 style={{fontSize:'20px',fontWeight:700,color:'var(--blue)',marginBottom:'6px'}}>Dashboard Overview</h2>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}. Here's your FIP summary.</p>
              <div className="admin-stats-row">
                {[
                  { icon:'fa-users',        cls:'fi-blue',   val:totalMembers,            lbl:'Total Members' },
                  { icon:'fa-user-check',   cls:'fi-green',  val:activeMembers,           lbl:'Active Members' },
                  { icon:'fa-people-group', cls:'fi-orange', val:committees.length,       lbl:'Committees' },
                  { icon:'fa-shield-halved',cls:'fi-purple', val:adminCount,              lbl:'Admins' },
                ].map((s,i) => (
                  <div className="admin-stat-card" key={i}>
                    <div className={`asc-icon ${s.cls}`}><i className={`fa-solid ${s.icon}`}></i></div>
                    <div><div className="asc-val">{s.val}</div><div className="asc-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              {/* Permission table */}
              <div className="admin-form-card" style={{marginTop:'24px'}}>
                <div className="admin-form-title">Role Permissions Matrix</div>
                <table className="admin-table">
                  <thead><tr><th>Permission</th><th style={{textAlign:'center'}}>Member</th><th style={{textAlign:'center'}}>Admin</th></tr></thead>
                  <tbody>
                    {[
                      ['View own dashboard',        true,  true ],
                      ['Enroll in courses',          true,  true ],
                      ['RSVP to events',             true,  true ],
                      ['Upload profile picture',     true,  true ],
                      ['View member directory',      true,  true ],
                      ['Access admin panel',         false, true ],
                      ['Manage committee members',   false, true ],
                      ['Add / remove committees',    false, true ],
                      ['Change member roles',        false, true ],
                      ['Activate membership',        false, true ],
                    ].map(([p,m,a],i) => (
                      <tr key={i}>
                        <td style={{fontSize:'13px'}}>{p}</td>
                        <td style={{textAlign:'center'}}>{m ? <i className="fa-solid fa-check" style={{color:'var(--green)'}}></i> : <i className="fa-solid fa-xmark" style={{color:'#C0392B'}}></i>}</td>
                        <td style={{textAlign:'center'}}>{a ? <i className="fa-solid fa-check" style={{color:'var(--green)'}}></i> : <i className="fa-solid fa-xmark" style={{color:'#C0392B'}}></i>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ═══ MEMBERS ═══ */}
          {tab === 'members' && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>All Members <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({filteredMembers.length})</span></span>
              </div>

              {/* Search */}
              <div className="search-wrap" style={{marginBottom:'20px'}}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="search" placeholder="Search by name, email or profession…" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/>
              </div>

              {loadingMembers ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading members…
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-users" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  {memberSearch ? 'No members match your search.' : 'No members yet.'}
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Member</th><th>Profession</th><th>Role</th><th>Membership</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m,i) => (
                        <tr key={i}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontSize:'12px',fontWeight:700,flexShrink:0}}>
                                {getInitials(m.full_name)}
                              </div>
                              <div>
                                <div style={{fontWeight:700,color:'var(--blue)',fontSize:'13px'}}>{m.full_name||'—'}</div>
                                <div style={{fontSize:'11px',color:'var(--text-light)'}}>{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:'12px'}}>{m.profession||'—'}</td>
                          <td>
                            <span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                              background:m.role==='admin'?'rgba(242,101,34,0.12)':'var(--blue-tint)',
                              color:m.role==='admin'?'var(--orange-dark)':'var(--blue-mid)',
                              border:m.role==='admin'?'1px solid #F5C4A8':'1px solid #C0CDE8'}}>
                              <i className={`fa-solid ${m.role==='admin'?'fa-shield-halved':'fa-user'}`} style={{fontSize:'9px'}}></i>
                              {m.role==='admin'?'Admin':'Member'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${m.membership_status==='Active'?'sp-active':'sp-pending'}`}>
                              {m.membership_status||'Inactive'}
                            </span>
                          </td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>
                            {m.created_at?new Date(m.created_at).toLocaleDateString('en-IN'):'—'}
                          </td>
                          <td>
                            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                              {m.role!=='admin'
                                ? <button className="admin-btn admin-btn-orange" onClick={()=>handleRoleChange(m.id,'admin')}><i className="fa-solid fa-shield-halved"></i> Make Admin</button>
                                : <button className="admin-btn admin-btn-danger" onClick={()=>handleRoleChange(m.id,'member')}><i className="fa-solid fa-user"></i> Make Member</button>
                              }
                              {m.membership_status!=='Active'
                                ? <button className="admin-btn admin-btn-primary" onClick={()=>handleStatusChange(m.id,'Active')}>Activate</button>
                                : <button className="admin-btn" style={{background:'var(--off-white)',color:'var(--text-muted)',border:'1px solid var(--border)'}} onClick={()=>handleStatusChange(m.id,'Inactive')}>Deactivate</button>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ COMMITTEES ═══ */}
          {tab === 'committees' && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
                <div>
                  <h2 style={{fontSize:'20px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Committee Management</h2>
                  <p style={{fontSize:'13px',color:'var(--text-muted)'}}>Add, edit, or remove committees and manage their members.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={openAddCommittee}>
                  <i className="fa-solid fa-plus"></i> Add Committee
                </button>
              </div>

              {committees.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px',background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-people-group" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p style={{marginBottom:'16px'}}>No committees yet.</p>
                  <button className="btn btn-primary btn-sm" onClick={openAddCommittee}><i className="fa-solid fa-plus"></i> Add First Committee</button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
                  {committees.map(c => (
                    <div key={c.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>

                      {/* Committee header */}
                      <div style={{background:'linear-gradient(135deg,var(--blue),var(--blue-mid))',padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                          <div style={{width:'42px',height:'42px',background:'rgba(255,255,255,0.12)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',color:'#FFD09B'}}>
                            <i className={c.icon}></i>
                          </div>
                          <div>
                            <div style={{fontSize:'15px',fontWeight:700,color:'#fff'}}>{c.name}</div>
                            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.45)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:'2px'}}>{c.abbr} · {c.category}</div>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:'8px'}}>
                          <button
                            onClick={() => openEditCommittee(c)}
                            style={{padding:'6px 14px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ type:'committee', committeeId: c.id })}
                            style={{padding:'6px 14px',background:'rgba(220,53,69,0.25)',border:'1px solid rgba(220,53,69,0.4)',color:'#FFB3B3',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {c.desc && (
                        <div style={{padding:'12px 20px',background:'var(--blue-pale)',borderBottom:'1px solid var(--border)',fontSize:'13px',color:'var(--text-muted)'}}>
                          {c.desc}
                        </div>
                      )}

                      {/* Members list */}
                      <div style={{padding:'16px 20px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                          <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px'}}>
                            Members ({c.members.length})
                          </span>
                          <button
                            onClick={() => openAddMember(c.id)}
                            style={{padding:'5px 12px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
                            <i className="fa-solid fa-plus"></i> Add Member
                          </button>
                        </div>

                        {c.members.length === 0 ? (
                          <div style={{textAlign:'center',padding:'24px',color:'var(--text-light)',fontSize:'13px',background:'var(--off-white)',borderRadius:'var(--radius-md)'}}>
                            No members yet. Click "Add Member" to get started.
                          </div>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                            {c.members.map((m, idx) => {
                              const rs = getRoleStyle(m.role);
                              return (
                                <div key={idx} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'var(--radius-md)',background: idx%2===0?'var(--off-white)':'transparent',transition:'background 0.15s'}}>
                                  {/* Avatar */}
                                  <div style={{
                                    width:'36px',height:'36px',borderRadius:'50%',flexShrink:0,
                                    display:'flex',alignItems:'center',justifyContent:'center',
                                    fontSize:'12px',fontWeight:700,
                                    background: m.role.toLowerCase().includes('president')||m.role.toLowerCase().includes('chairman')||m.role.toLowerCase().includes('chairperson') ? 'var(--orange)' :
                                                m.role.toLowerCase().includes('vice')||m.role.toLowerCase().includes('co-')||m.role.toLowerCase().includes('secretary')||m.role.toLowerCase().includes('treasurer') ? 'var(--blue-mid)' : 'var(--blue-pale)',
                                    color: m.role.toLowerCase().includes('president')||m.role.toLowerCase().includes('chairman')||m.role.toLowerCase().includes('chairperson') ? '#fff' :
                                           m.role.toLowerCase().includes('vice')||m.role.toLowerCase().includes('co-')||m.role.toLowerCase().includes('secretary')||m.role.toLowerCase().includes('treasurer') ? '#fff' : 'var(--blue)',
                                    border: '1.5px solid var(--border)',
                                  }}>
                                    {getInitials(m.name)}
                                  </div>

                                  {/* Name & Role */}
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.name}</div>
                                    <div style={{display:'inline-flex',alignItems:'center',padding:'1px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',marginTop:'2px',...rs}}>
                                      {m.role}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                                    {/* Move up */}
                                    <button
                                      disabled={idx===0}
                                      onClick={() => moveMember(c.id, idx, -1)}
                                      title="Move up"
                                      style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color: idx===0?'var(--border-dark)':'var(--blue)',cursor:idx===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                                      <i className="fa-solid fa-chevron-up"></i>
                                    </button>
                                    {/* Move down */}
                                    <button
                                      disabled={idx===c.members.length-1}
                                      onClick={() => moveMember(c.id, idx, 1)}
                                      title="Move down"
                                      style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color:idx===c.members.length-1?'var(--border-dark)':'var(--blue)',cursor:idx===c.members.length-1?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                                      <i className="fa-solid fa-chevron-down"></i>
                                    </button>
                                    {/* Edit */}
                                    <button
                                      onClick={() => openEditMember(c.id, idx, m)}
                                      title="Edit member"
                                      style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color:'var(--blue)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                                      <i className="fa-solid fa-pen"></i>
                                    </button>
                                    {/* Delete */}
                                    <button
                                      onClick={() => setConfirmDelete({ type:'member', committeeId: c.id, memberIdx: idx, memberName: m.name })}
                                      title="Remove member"
                                      style={{width:'28px',height:'28px',borderRadius:'6px',background:'#FFF0EE',border:'1px solid #F5BDBA',color:'#C0392B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}


          {/* ═══ TESTIMONIALS ═══ */}
          {tab === 'testimonials' && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Testimonials
                  <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400,marginLeft:'8px'}}>
                    ({testimonials.filter(t => t.status === testiFilter).length} {testiFilter})
                  </span>
                </span>
                <div style={{display:'flex',gap:'6px'}}>
                  {['pending','approved','rejected'].map(f => (
                    <button key={f} onClick={() => setTestiFilter(f)}
                      style={{padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1.5px solid',
                        background: testiFilter===f ? (f==='approved'?'var(--green)':f==='rejected'?'#C0392B':'var(--blue)') : 'transparent',
                        color: testiFilter===f ? '#fff' : 'var(--text-muted)',
                        borderColor: testiFilter===f ? (f==='approved'?'var(--green)':f==='rejected'?'#C0392B':'var(--blue)') : 'var(--border)',
                      }}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                      <span style={{marginLeft:'5px',background:'rgba(255,255,255,0.2)',padding:'1px 6px',borderRadius:'10px'}}>
                        {testimonials.filter(t=>t.status===f).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {testiLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : testimonials.filter(t => t.status === testiFilter).length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-star" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No {testiFilter} testimonials.
                </div>
              ) : testimonials.filter(t => t.status === testiFilter).map((t,i) => {
                const initials = (t.name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
                const stars = '★'.repeat(t.rating||5)+'☆'.repeat(5-(t.rating||5));
                return (
                  <div key={t.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'20px',marginBottom:'16px'}}>
                    {/* Header */}
                    <div style={{display:'flex',alignItems:'flex-start',gap:'14px',marginBottom:'14px'}}>
                      <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontWeight:700,fontSize:'14px',flexShrink:0}}>
                        {initials}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{t.name}</div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'1px'}}>{t.designation}</div>
                        {t.profession && <div style={{fontSize:'11px',color:'var(--orange)',fontWeight:600,marginTop:'2px'}}>{t.profession}</div>}
                        <div style={{fontSize:'13px',color:'var(--orange)',marginTop:'4px'}}>{stars}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                        {/* Status badge */}
                        <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                          background:t.status==='approved'?'var(--green-pale)':t.status==='rejected'?'#FFF0EE':'var(--blue-tint)',
                          color:t.status==='approved'?'var(--green)':t.status==='rejected'?'#C0392B':'var(--blue-mid)',
                          border:`1px solid ${t.status==='approved'?'#9ADDC3':t.status==='rejected'?'#F5BDBA':'#C0CDE8'}`}}>
                          {t.status.charAt(0).toUpperCase()+t.status.slice(1)}
                        </span>
                        <span style={{fontSize:'11px',color:'var(--text-light)'}}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.75,fontStyle:'italic',borderLeft:'3px solid var(--orange)',paddingLeft:'12px',margin:'0 0 16px'}}>
                      "{t.content}"
                    </p>

                    {/* Action buttons */}
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {t.status !== 'approved' && (
                        <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none',display:'flex',alignItems:'center',gap:'6px'}}
                          onClick={() => handleTestiAction(t.id, 'approved')}>
                          <i className="fa-solid fa-check"></i> Approve & Publish
                        </button>
                      )}
                      {t.status !== 'rejected' && (
                        <button className="admin-btn" style={{background:'#FFF0EE',color:'#C0392B',border:'1px solid #F5BDBA',display:'flex',alignItems:'center',gap:'6px'}}
                          onClick={() => handleTestiAction(t.id, 'rejected')}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      )}
                      {t.status === 'approved' && (
                        <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8',display:'flex',alignItems:'center',gap:'6px'}}
                          onClick={() => handleTestiAction(t.id, 'pending')}>
                          <i className="fa-solid fa-rotate-left"></i> Unpublish
                        </button>
                      )}
                      <button className="admin-btn admin-btn-danger" style={{display:'flex',alignItems:'center',gap:'6px'}}
                        onClick={() => { if(window.confirm('Permanently delete this testimonial?')) handleTestiAction(t.id, 'delete'); }}>
                        <i className="fa-solid fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab === 'settings' && (
            <div className="admin-form-card">
              <div className="admin-form-title">Admin Settings</div>
              <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'16px',marginBottom:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>
                  <i className="fa-solid fa-info-circle" style={{color:'var(--orange)',marginRight:'6px'}}></i>
                  Committee changes are saved locally and reflected immediately on the public Committees page.
                </div>
              </div>
              <div className="form-group"><label className="form-label">Your Name</label><input className="form-input" type="text" value={profile?.full_name||''} disabled style={{opacity:.7}}/></div>
              <div className="form-group"><label className="form-label">Your Email</label><input className="form-input" type="email" value={profile?.email||''} disabled style={{opacity:.7}}/></div>
              <div className="form-group"><label className="form-label">Role</label><input className="form-input" type="text" value="Admin" disabled style={{opacity:.7,color:'var(--orange)',fontWeight:700}}/></div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* ── Committee Add/Edit Modal ── */}
      {editModal?.mode === 'committee' && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'520px'}}>
            <button className="modal-close" onClick={() => setEditModal(null)}>&#x2715;</button>
            <div className="modal-title">{editModal.committeeId===null ? 'Add New Committee' : 'Edit Committee'}</div>
            <div className="modal-sub">Fill in the committee details below.</div>

            <div className="form-group">
              <label className="form-label">Committee Name *</label>
              <input className="form-input" type="text" placeholder="e.g. Direct Tax Committee" value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Abbreviation</label>
                <input className="form-input" type="text" placeholder="e.g. DTC" value={cForm.abbr} onChange={e=>setCForm(f=>({...f,abbr:e.target.value.toUpperCase()}))} maxLength={8}/>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={cForm.category} onChange={e=>setCForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Brief description of this committee's mandate…" value={cForm.desc} onChange={e=>setCForm(f=>({...f,desc:e.target.value}))} style={{minHeight:'80px'}}></textarea>
            </div>

            {/* Preview icon */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px',background:'var(--blue-pale)',borderRadius:'var(--radius-md)',marginBottom:'20px'}}>
              <div style={{width:'40px',height:'40px',background:'var(--blue)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontSize:'18px'}}>
                <i className={CATEGORY_ICONS[cForm.category]||CATEGORY_ICONS.Other}></i>
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)'}}>{cForm.name||'Committee Name'}</div>
                <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{cForm.abbr||'ABBR'} · {cForm.category}</div>
              </div>
            </div>

            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveCommittee} disabled={!cForm.name.trim()}>
                {editModal.committeeId===null ? 'Add Committee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Add/Edit Modal ── */}
      {editModal?.mode === 'member' && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'460px'}}>
            <button className="modal-close" onClick={() => setEditModal(null)}>&#x2715;</button>
            <div className="modal-title">{editModal.memberIdx===null ? 'Add Member' : 'Edit Member'}</div>
            <div className="modal-sub">
              {committees.find(c=>c.id===editModal.committeeId)?.name}
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" type="text" placeholder="e.g. CA Gaurav Aggrawal" value={mForm.name} onChange={e=>setMForm(f=>({...f,name:e.target.value}))} autoFocus/>
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={mForm.role} onChange={e=>setMForm(f=>({...f,role:e.target.value}))}>
                {ROLE_OPTIONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Role preview */}
            {mForm.name && (
              <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'var(--blue-pale)',borderRadius:'var(--radius-md)',marginBottom:'20px'}}>
                <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontWeight:700,fontSize:'13px'}}>
                  {getInitials(mForm.name)}
                </div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>{mForm.name}</div>
                  <div style={{...getRoleStyle(mForm.role),display:'inline-flex',padding:'1px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',marginTop:'2px'}}>
                    {mForm.role}
                  </div>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveMember} disabled={!mForm.name.trim()}>
                {editModal.memberIdx===null ? 'Add Member' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'400px',textAlign:'center'}}>
            <div style={{width:'60px',height:'60px',borderRadius:'50%',background:'#FFF0EE',border:'2px solid #F5BDBA',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#C0392B'}}>
              <i className="fa-solid fa-trash"></i>
            </div>
            <div className="modal-title" style={{fontSize:'18px'}}>Confirm Delete</div>
            <p style={{fontSize:'14px',color:'var(--text-muted)',margin:'8px 0 24px'}}>
              {confirmDelete.type === 'committee'
                ? <>Are you sure you want to delete <strong style={{color:'var(--blue)'}}>{committees.find(c=>c.id===confirmDelete.committeeId)?.name}</strong> and all its members? This cannot be undone.</>
                : <>Remove <strong style={{color:'var(--blue)'}}>{confirmDelete.memberName}</strong> from this committee?</>
              }
            </p>
            <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'#C0392B',color:'#fff',border:'none'}}
                onClick={() => {
                  if (confirmDelete.type==='committee') deleteCommittee(confirmDelete.committeeId);
                  else deleteMember(confirmDelete.committeeId, confirmDelete.memberIdx);
                }}>
                <i className="fa-solid fa-trash"></i> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}