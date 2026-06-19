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

  /* ── jobs state ── */
  const [jobs,           setJobs]          = useState([]);
  const [jobsLoading,    setJobsLoading]   = useState(false);
  const [jobModal,       setJobModal]      = useState(null); // 'new' | job object being edited | null
  const [jobForm, setJobForm] = useState({
    title:'', company:'', location:'', job_type:'Full-time', category:'',
    description:'', requirements:'', salary_min:'', salary_max:'', salary_period:'yearly', contact_email:'',
  });
  const [viewingJobId,   setViewingJobId]  = useState(null); // job whose applications are shown
  const [applications,   setApplications]  = useState([]);
  const [appsLoading,    setAppsLoading]   = useState(false);
  const [appCounts,      setAppCounts]     = useState({});  // job_id -> count

  useEffect(() => {
    if (tab !== 'jobs') return;
    setJobsLoading(true);
    Promise.all([
      supabase.rpc('admin_get_all_jobs'),
      supabase.rpc('admin_get_applications_summary'),
    ]).then(([jobsRes, summaryRes]) => {
      if (!jobsRes.error) setJobs(jobsRes.data || []);
      if (!summaryRes.error) {
        const counts = {};
        (summaryRes.data || []).forEach(r => { counts[r.job_id] = r.application_count; });
        setAppCounts(counts);
      }
    }).finally(() => setJobsLoading(false));
  }, [tab]);

  const openNewJob = () => {
    setJobForm({ title:'', company:'', location:'', job_type:'Full-time', category:'', description:'', requirements:'', salary_min:'', salary_max:'', salary_period:'yearly', contact_email:'' });
    setJobModal('new');
  };

  const openEditJob = (job) => {
    setJobForm({
      title: job.title, company: job.company, location: job.location, job_type: job.job_type,
      category: job.category || '', description: job.description, requirements: job.requirements || '',
      salary_min: job.salary_min || '', salary_max: job.salary_max || '',
      salary_period: job.salary_period || 'yearly', contact_email: job.contact_email || '',
    });
    setJobModal(job);
  };

  const saveJob = async () => {
    if (!jobForm.title.trim() || !jobForm.company.trim() || !jobForm.location.trim() || !jobForm.description.trim()) return;

    const payload = {
      p_title: jobForm.title.trim(),
      p_company: jobForm.company.trim(),
      p_location: jobForm.location.trim(),
      p_job_type: jobForm.job_type,
      p_category: jobForm.category.trim() || null,
      p_description: jobForm.description.trim(),
      p_requirements: jobForm.requirements.trim() || null,
      p_salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : null,
      p_salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : null,
      p_salary_period: jobForm.salary_period,
      p_contact_email: jobForm.contact_email.trim() || null,
    };

    if (jobModal === 'new') {
      const { data, error } = await supabase.rpc('admin_create_job', payload);
      if (!error && data) setJobs(prev => [data, ...prev]);
    } else {
      const { data, error } = await supabase.rpc('admin_update_job', { ...payload, p_job_id: jobModal.id, p_status: jobModal.status });
      if (!error && data) setJobs(prev => prev.map(j => j.id === data.id ? data : j));
    }
    setJobModal(null);
  };

  const toggleJobStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    const { data, error } = await supabase.rpc('admin_update_job', {
      p_job_id: job.id, p_title: job.title, p_company: job.company, p_location: job.location,
      p_job_type: job.job_type, p_category: job.category, p_description: job.description,
      p_requirements: job.requirements, p_salary_min: job.salary_min, p_salary_max: job.salary_max,
      p_salary_period: job.salary_period, p_contact_email: job.contact_email, p_status: newStatus,
    });
    if (!error && data) setJobs(prev => prev.map(j => j.id === data.id ? data : j));
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Delete this job posting and all its applications? This cannot be undone.')) return;
    const { error } = await supabase.rpc('admin_delete_job', { p_job_id: jobId });
    if (!error) {
      setJobs(prev => prev.filter(j => j.id !== jobId));
      if (viewingJobId === jobId) setViewingJobId(null);
    }
  };

  const viewApplications = async (jobId) => {
    setViewingJobId(jobId);
    setAppsLoading(true);
    const { data, error } = await supabase.rpc('admin_get_job_applications', { p_job_id: jobId });
    if (!error) setApplications(data || []);
    setAppsLoading(false);
  };

  const reviewApplication = async (applicationId, newStatus) => {
    const { data, error } = await supabase.rpc('admin_review_application', { p_application_id: applicationId, p_status: newStatus });
    if (!error && data) {
      setApplications(prev => prev.map(a => a.application_id === applicationId ? { ...a, status: newStatus } : a));
    }
  };

  /* ── Dashboard summary stats ── */
  const totalRevenue = members.length * 1200; // placeholder formula until live payments table is wired
  const upcomingEventsCount = 7;
  const courseEnrollmentsCount = 214;

  const recentPayments = [
    { memberName: 'CA Priya S.',  plan: 'Standard', amount: 500, status: 'Paid' },
    { memberName: 'CS Ravi K.',   plan: 'Renewal',  amount: 200, status: 'Pending' },
    { memberName: 'CA Anjali M.', plan: 'Standard', amount: 500, status: 'Paid' },
  ];

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

  /* ── derived stats for new dashboard ── */
  const recentRegistrations = [...members]
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000*60*60*24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div id="page-admin">

      {/* ── Top Bar (light, matches reference) ── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-topbar-logo">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" />
              : <i className="fa-solid fa-circle-user"></i>
            }
          </div>
          <span className="admin-topbar-sep">/</span>
          <span className="admin-topbar-title">Admin Panel</span>
        </div>
        <div className="admin-topbar-right">
          <span className="admin-topbar-badge">ADMIN</span>
          <Link to="/" className="admin-topbar-exit">
            <i className="fa-solid fa-arrow-left"></i> Exit Admin
          </Link>
        </div>
      </div>

      <div className="admin-layout-v2">

        {/* ── Sidebar (grouped sections) ── */}
        <div className="admin-sidebar-v2">

          <div className="admin-nav-group-label">Overview</div>
          <button className={`admin-nav-v2${tab==='dashboard'?' active':''}`} onClick={() => setTab('dashboard')}>
            <i className="fa-solid fa-gauge-high"></i> Dashboard
          </button>

          <div className="admin-nav-group-label">Manage</div>
          <button className={`admin-nav-v2${tab==='members'?' active':''}`} onClick={() => setTab('members')}>
            <i className="fa-solid fa-users"></i> Members
          </button>
          <button className={`admin-nav-v2${tab==='events'?' active':''}`} onClick={() => setTab('events')}>
            <i className="fa-solid fa-calendar-days"></i> Events
          </button>
          <button className={`admin-nav-v2${tab==='courses'?' active':''}`} onClick={() => setTab('courses')}>
            <i className="fa-solid fa-book-open"></i> Courses
          </button>
          <button className={`admin-nav-v2${tab==='committees'?' active':''}`} onClick={() => setTab('committees')}>
            <i className="fa-solid fa-people-group"></i> Committees
          </button>
          <button className={`admin-nav-v2${tab==='testimonials'?' active':''}`} onClick={() => setTab('testimonials')}>
            <i className="fa-solid fa-star"></i> Testimonials
          </button>
          <button className={`admin-nav-v2${tab==='jobs'?' active':''}`} onClick={() => setTab('jobs')}>
            <i className="fa-solid fa-briefcase"></i> Jobs
          </button>

          <div className="admin-nav-group-label">Finance</div>
          <button className={`admin-nav-v2${tab==='payments'?' active':''}`} onClick={() => setTab('payments')}>
            <i className="fa-solid fa-indian-rupee-sign"></i> Payments
          </button>

          <div className="admin-nav-group-label">Settings</div>
          <button className={`admin-nav-v2${tab==='settings'?' active':''}`} onClick={() => setTab('settings')}>
            <i className="fa-solid fa-gear"></i> Settings
          </button>

          <div className="admin-sidebar-v2-footer">
            <button className="admin-nav-v2" onClick={handleSignOut} style={{color:'#FFB3B3'}}>
              <i className="fa-solid fa-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="admin-content-v2">

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <>
              <h2 className="admin-page-title">Dashboard Overview</h2>

              {/* Stat cards row — matches reference exactly */}
              <div className="dboard-stats-row">
                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-blue"><i className="fa-solid fa-users"></i></div>
                  <div className="dboard-stat-val">{totalMembers.toLocaleString('en-IN')}</div>
                  <div className="dboard-stat-lbl">Total Members</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> +48 this month
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-orange"><i className="fa-solid fa-indian-rupee-sign"></i></div>
                  <div className="dboard-stat-val">₹{(totalRevenue/100000).toFixed(1)}L</div>
                  <div className="dboard-stat-lbl">Revenue This Year</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> +12% vs last year
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-green"><i className="fa-solid fa-calendar-check"></i></div>
                  <div className="dboard-stat-val">{upcomingEventsCount}</div>
                  <div className="dboard-stat-lbl">Active Events</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> 3 this month
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-purple"><i className="fa-solid fa-graduation-cap"></i></div>
                  <div className="dboard-stat-val">{courseEnrollmentsCount}</div>
                  <div className="dboard-stat-lbl">Course Enrollments</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> +31 this week
                  </div>
                </div>
              </div>

              {/* Recent activity — two column layout matching reference */}
              <div className="dboard-activity-grid">

                {/* Recent Member Registrations */}
                <div className="dboard-activity-card">
                  <div className="dboard-activity-title">Recent Member Registrations</div>
                  <div className="dboard-table-wrap">
                    <table className="dboard-table">
                      <thead>
                        <tr><th>Name</th><th>Profession</th><th>Date</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {recentRegistrations.length === 0 ? (
                          <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}>No registrations yet</td></tr>
                        ) : recentRegistrations.map((m,i) => (
                          <tr key={i}>
                            <td>
                              <div className="dboard-table-name">{m.full_name || '—'}</div>
                              <div className="dboard-table-sub">{m.city || ''}</div>
                            </td>
                            <td className="dboard-table-muted">{m.profession?.split(' ').map(w=>w[0]).join('') || '—'}</td>
                            <td className="dboard-table-muted">{formatRelativeDate(m.created_at)}</td>
                            <td>
                              <span className={`dboard-pill ${m.membership_status==='Active'?'pill-green':'pill-orange'}`}>
                                {m.membership_status === 'Active' ? 'Active' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="dboard-activity-card">
                  <div className="dboard-activity-title">Recent Payments</div>
                  <div className="dboard-table-wrap">
                    <table className="dboard-table">
                      <thead>
                        <tr><th>Member</th><th>Plan</th><th>Amount</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {recentPayments.length === 0 ? (
                          <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}>No payments yet</td></tr>
                        ) : recentPayments.map((p,i) => (
                          <tr key={i}>
                            <td>
                              <div className="dboard-table-name">{p.memberName}</div>
                            </td>
                            <td className="dboard-table-muted">{p.plan}</td>
                            <td>
                              <span style={{color:'var(--orange)',fontWeight:700}}>₹{p.amount}</span>
                            </td>
                            <td>
                              <span className={`dboard-pill ${p.status==='Paid'?'pill-green':'pill-orange'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ DASHBOARD-OLD-PERMISSIONS (kept, renamed) ═══ */}
          {false && (
            <>
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

          {/* ═══ EVENTS (placeholder) ═══ */}
          {tab === 'events' && (
            <div className="admin-form-card" style={{textAlign:'center',padding:'60px 24px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-calendar-days" style={{fontSize:'32px',marginBottom:'12px',display:'block',color:'var(--border-dark)'}}></i>
              <p style={{fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Events Management</p>
              <p style={{fontSize:'13px'}}>Coming soon — manage event listings, RSVPs and capacity here.</p>
            </div>
          )}

          {/* ═══ COURSES (placeholder) ═══ */}
          {tab === 'courses' && (
            <div className="admin-form-card" style={{textAlign:'center',padding:'60px 24px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-book-open" style={{fontSize:'32px',marginBottom:'12px',display:'block',color:'var(--border-dark)'}}></i>
              <p style={{fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Course Management</p>
              <p style={{fontSize:'13px'}}>Coming soon — manage course listings, pricing and enrollments here.</p>
            </div>
          )}

          {/* ═══ PAYMENTS (placeholder) ═══ */}
          {tab === 'payments' && (
            <div className="admin-form-card">
              <div className="admin-form-title">All Payments</div>
              <div className="dboard-table-wrap">
                <table className="dboard-table">
                  <thead><tr><th>Member</th><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentPayments.map((p,i) => (
                      <tr key={i}>
                        <td><div className="dboard-table-name">{p.memberName}</div></td>
                        <td className="dboard-table-muted">{p.plan}</td>
                        <td style={{color:'var(--orange)',fontWeight:700}}>₹{p.amount}</td>
                        <td className="dboard-table-muted">—</td>
                        <td><span className={`dboard-pill ${p.status==='Paid'?'pill-green':'pill-orange'}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:'12px',color:'var(--text-light)',marginTop:'16px'}}>
                <i className="fa-solid fa-info-circle" style={{marginRight:'5px'}}></i>
                Connect Razorpay to see live transaction data here.
              </p>
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

          {/* ═══ JOBS ═══ */}
          {tab === 'jobs' && !viewingJobId && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Job Postings <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({jobs.length})</span></span>
                <button className="btn btn-primary btn-sm" onClick={openNewJob}>
                  <i className="fa-solid fa-plus"></i> Post New Job
                </button>
              </div>

              {jobsLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : jobs.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-briefcase" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No jobs posted yet.
                  <div style={{marginTop:'16px'}}>
                    <button className="btn btn-primary btn-sm" onClick={openNewJob}><i className="fa-solid fa-plus"></i> Post Your First Job</button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {jobs.map(job => (
                    <div key={job.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px 20px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:'220px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{job.title}</span>
                            <span className={`status-pill ${job.status==='active'?'sp-active':'sp-pending'}`}>
                              {job.status.charAt(0).toUpperCase()+job.status.slice(1)}
                            </span>
                          </div>
                          <div style={{fontSize:'13px',color:'var(--text-muted)'}}>
                            <i className="fa-solid fa-building" style={{marginRight:'5px',color:'var(--orange)'}}></i>{job.company}
                            <span style={{margin:'0 8px',color:'var(--border-dark)'}}>·</span>
                            <i className="fa-solid fa-location-dot" style={{marginRight:'5px',color:'var(--orange)'}}></i>{job.location}
                            <span style={{margin:'0 8px',color:'var(--border-dark)'}}>·</span>
                            {job.job_type}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          <button className="admin-btn admin-btn-orange" onClick={() => viewApplications(job.id)}>
                            <i className="fa-solid fa-users"></i> {appCounts[job.id] || 0} Applications
                          </button>
                          <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openEditJob(job)}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button className="admin-btn" style={{background: job.status==='active'?'var(--off-white)':'var(--green-pale)', color: job.status==='active'?'var(--text-muted)':'var(--green)', border:'1px solid var(--border)'}} onClick={() => toggleJobStatus(job)}>
                            {job.status==='active' ? <><i className="fa-solid fa-pause"></i> Close</> : <><i className="fa-solid fa-play"></i> Reopen</>}
                          </button>
                          <button className="admin-btn admin-btn-danger" onClick={() => deleteJob(job.id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ JOB APPLICATIONS VIEW ═══ */}
          {tab === 'jobs' && viewingJobId && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <button onClick={() => setViewingJobId(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <span>Applications for <strong>{jobs.find(j=>j.id===viewingJobId)?.title}</strong></span>
              </div>

              {appsLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : applications.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-inbox" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No applications yet for this job.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                  {applications.map(app => {
                    const initials = (app.applicant_name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
                    return (
                      <div key={app.application_id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px 20px'}}>
                        <div style={{display:'flex',gap:'14px',alignItems:'flex-start',marginBottom:'12px'}}>
                          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontWeight:700,fontSize:'13px',flexShrink:0}}>
                            {initials}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{app.applicant_name}</div>
                            <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>
                              {app.applicant_profession} {app.applicant_city ? `· ${app.applicant_city}` : ''}
                            </div>
                            <div style={{fontSize:'12px',color:'var(--text-light)',marginTop:'2px'}}>
                              <i className="fa-solid fa-envelope" style={{marginRight:'4px'}}></i>{app.applicant_email}
                              {app.applicant_phone && <span style={{marginLeft:'12px'}}><i className="fa-solid fa-phone" style={{marginRight:'4px'}}></i>{app.applicant_phone}</span>}
                            </div>
                          </div>
                          <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                            background:app.status==='shortlisted'?'var(--green-pale)':app.status==='rejected'?'#FFF0EE':app.status==='reviewed'?'var(--blue-tint)':'var(--orange-pale)',
                            color:app.status==='shortlisted'?'var(--green)':app.status==='rejected'?'#C0392B':app.status==='reviewed'?'var(--blue-mid)':'var(--orange-dark)'}}>
                            {app.status.charAt(0).toUpperCase()+app.status.slice(1)}
                          </span>
                        </div>
                        <p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.65,borderLeft:'3px solid var(--orange)',paddingLeft:'12px',margin:'0 0 12px'}}>
                          {app.cover_note}
                        </p>
                        {app.resume_url && (
                          <a href={app.resume_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--orange)',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'5px',marginBottom:'12px'}}>
                            <i className="fa-solid fa-file-lines"></i> View Resume/Portfolio
                          </a>
                        )}
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          {app.status !== 'shortlisted' && (
                            <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={() => reviewApplication(app.application_id, 'shortlisted')}>
                              <i className="fa-solid fa-star"></i> Shortlist
                            </button>
                          )}
                          {app.status === 'submitted' && (
                            <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => reviewApplication(app.application_id, 'reviewed')}>
                              <i className="fa-solid fa-eye"></i> Mark Reviewed
                            </button>
                          )}
                          {app.status !== 'rejected' && (
                            <button className="admin-btn admin-btn-danger" onClick={() => reviewApplication(app.application_id, 'rejected')}>
                              <i className="fa-solid fa-xmark"></i> Reject
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* ── Job Post / Edit Modal ── */}
      {jobModal && (
        <div className="modal-overlay" onClick={() => setJobModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'560px'}}>
            <button className="modal-close" onClick={() => setJobModal(null)}>&#x2715;</button>
            <div className="modal-title">{jobModal === 'new' ? 'Post New Job' : 'Edit Job'}</div>
            <div className="modal-sub">Fill in the job details below. Only Active Members will be able to apply.</div>

            <div className="form-group">
              <label className="form-label">Job Title *</label>
              <input className="form-input" type="text" placeholder="e.g. Senior Tax Associate" value={jobForm.title} onChange={e=>setJobForm(f=>({...f,title:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company / Firm *</label>
                <input className="form-input" type="text" placeholder="e.g. ABC & Associates" value={jobForm.company} onChange={e=>setJobForm(f=>({...f,company:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" type="text" placeholder="e.g. Delhi / Remote" value={jobForm.location} onChange={e=>setJobForm(f=>({...f,location:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Job Type</label>
                <select className="form-select" value={jobForm.job_type} onChange={e=>setJobForm(f=>({...f,job_type:e.target.value}))}>
                  <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Freelance</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" type="text" placeholder="e.g. Tax, Audit, Corporate Law" value={jobForm.category} onChange={e=>setJobForm(f=>({...f,category:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" placeholder="Role responsibilities and overview…" value={jobForm.description} onChange={e=>setJobForm(f=>({...f,description:e.target.value}))} style={{minHeight:'90px'}}></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Requirements</label>
              <textarea className="form-textarea" placeholder="Qualifications, experience, skills required…" value={jobForm.requirements} onChange={e=>setJobForm(f=>({...f,requirements:e.target.value}))} style={{minHeight:'70px'}}></textarea>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Salary Min (₹)</label>
                <input className="form-input" type="number" placeholder="e.g. 600000" value={jobForm.salary_min} onChange={e=>setJobForm(f=>({...f,salary_min:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Salary Max (₹)</label>
                <input className="form-input" type="number" placeholder="e.g. 900000" value={jobForm.salary_max} onChange={e=>setJobForm(f=>({...f,salary_max:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Salary Period</label>
                <select className="form-select" value={jobForm.salary_period} onChange={e=>setJobForm(f=>({...f,salary_period:e.target.value}))}>
                  <option value="yearly">Per Year</option><option value="monthly">Per Month</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" placeholder="hr@company.com" value={jobForm.contact_email} onChange={e=>setJobForm(f=>({...f,contact_email:e.target.value}))}/>
              </div>
            </div>

            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setJobModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveJob} disabled={!jobForm.title.trim()||!jobForm.company.trim()||!jobForm.location.trim()||!jobForm.description.trim()}>
                {jobModal === 'new' ? 'Post Job' : 'Save Changes'}
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