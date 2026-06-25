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
  const [committeeModal, setCommitteeModal] = useState(null);
  const [cmForm, setCmForm] = useState({ committee_name:'', committee_role:'Member' });

  const COMMITTEES = [
    'Executive Committee','Editorial & Social Media Committee','Members Development Committee',
    'Indirect Tax Committee','Direct Tax Committee','Accounting Standard & Audit Assurance Committee',
    'Global Capability Center (GCC) Committee','Financial Market Committee',
    'Artificial Intelligence Committee','MSME, Startup & Valuation Committee',
    'Students Development Committee',
  ];

  const handleAssignCommittee = async () => {
    if (!cmForm.committee_name || !committeeModal) return;
    const { error } = await supabase.rpc('admin_assign_committee', {
      p_user_id:   committeeModal.id,
      p_committee: cmForm.committee_name,
      p_role:      cmForm.committee_role,
    });
    if (!error) {
      setMembers(prev => prev.map(m => m.id === committeeModal.id
        ? { ...m, is_committee_member: true, committee_name: cmForm.committee_name, committee_role: cmForm.committee_role }
        : m
      ));
      setCommitteeModal(null);
      showToast(`${committeeModal.full_name} assigned as ${cForm.committee_role}!`);
    }
  };

  const handleRemoveCommittee = async (memberId) => {
    if (!window.confirm('Remove committee membership?')) return;
    const { error } = await supabase.rpc('admin_remove_committee', { p_user_id: memberId });
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId
        ? { ...m, is_committee_member: false, committee_name: null, committee_role: null }
        : m
      ));
    }
  };

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

  /* ── courses (LMS) state ── */
  const [adminCourses,           setAdminCourses]           = useState([]);
  const [adminCoursesLoading,    setAdminCoursesLoading]    = useState(false);
  const [adminCourseView,        setAdminCourseView]        = useState(null);
  const [courseEnrollments,      setCourseEnrollments]      = useState([]);
  const [courseEnrollmentsLoading, setCourseEnrollmentsLoading] = useState(false);
  const [showCourseModal,        setShowCourseModal]        = useState(null); // 'new' | course obj
  const [courseForm, setCourseForm] = useState({
    title:'', slug:'', subtitle:'', description:'', category:'', level:'Intermediate',
    price:0, free_for:'none', instructor:'', duration_hours:'',
  });

  useEffect(() => {
    if (tab !== 'courses') return;
    setAdminCoursesLoading(true);
    supabase.rpc('admin_get_courses')
      .then(({ data }) => { if (data) setAdminCourses(data); })
      .finally(() => setAdminCoursesLoading(false));
  }, [tab]);

  const loadCourseEnrollments = async (course) => {
    setCourseEnrollmentsLoading(true);
    const { data } = await supabase.rpc('admin_get_course_enrollments', { p_course_id: course.id });
    if (data) setCourseEnrollments(data);
    setCourseEnrollmentsLoading(false);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) return;
    const slug = courseForm.slug.trim() || courseForm.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const payload = { ...courseForm, slug, price: Number(courseForm.price)||0, is_free_for_members: courseForm.free_for === 'members' || courseForm.free_for === 'all' };
    if (showCourseModal === 'new') {
      const { data, error } = await supabase.from('courses').insert({ ...payload, created_by: profile?.id, status:'published' }).select().single();
      if (!error && data) { setAdminCourses(prev => [data, ...prev]); setShowCourseModal(null); }
      else console.error(error);
    } else {
      const { data, error } = await supabase.from('courses').update(payload).eq('id', showCourseModal.id).select().single();
      if (!error && data) { setAdminCourses(prev => prev.map(c => c.id===data.id?data:c)); setShowCourseModal(null); }
    }
  };

  const deleteAdminCourse = async (courseId) => {
    if (!window.confirm('Delete this course and all its modules, videos and enrollments? Cannot be undone.')) return;
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (!error) setAdminCourses(prev => prev.filter(c => c.id !== courseId));
  };

  const issueCertificate = async (userId, courseId, idx) => {
    const { error } = await supabase.rpc('admin_issue_certificate', { p_user_id: userId, p_course_id: courseId });
    if (!error) {
      setCourseEnrollments(prev => prev.map((e,i) => i===idx ? {...e, has_certificate: true} : e));
    }
  };

  const revokeCertificate = async (userId, courseId) => {
    if (!window.confirm('Revoke this certificate?')) return;
    const { data: cert } = await supabase.from('certificates').select('id').eq('user_id', userId).eq('course_id', courseId).single();
    if (cert) {
      await supabase.rpc('admin_revoke_certificate', { p_cert_id: cert.id });
      setCourseEnrollments(prev => prev.map(e => e.user_id===userId ? {...e, has_certificate: false} : e));
    }
  };

  /* open course modal */
  const openCourseModal = (course) => {
    if (course === 'new') {
      setCourseForm({ title:'', slug:'', subtitle:'', description:'', category:'', level:'Intermediate', price:0, free_for:'none', instructor:'', duration_hours:'' });
    } else {
      setCourseForm({ title:course.title, slug:course.slug, subtitle:course.subtitle||'', description:course.description||'', category:course.category||'', level:course.level||'Intermediate', price:course.price||0, free_for:course.free_for||'none', instructor:course.instructor||'', duration_hours:course.duration_hours||'' });
    }
    setShowCourseModal(course);
  };

  /* ── blog state ── */
  const [blogPosts,      setBlogPosts]      = useState([]);
  const [blogAuthors,    setBlogAuthors]    = useState({});
  const [blogLoading,    setBlogLoading]    = useState(false);
  const [blogFilter,     setBlogFilter]     = useState('pending');

  useEffect(() => {
    if (tab !== 'blog') return;
    setBlogLoading(true);
    supabase.rpc('admin_get_blog_posts')
      .then(async ({ data, error }) => {
        if (error) { console.error('Blog fetch error:', error); return; }
        setBlogPosts(data || []);
        // fetch author names
        if (data?.length) {
          const ids = [...new Set(data.map(p => p.author_id))];
          const { data: profiles } = await supabase
            .from('profiles').select('id, full_name, email').in('id', ids);
          const map = {};
          (profiles||[]).forEach(p => { map[p.id] = p; });
          setBlogAuthors(map);
        }
      })
      .finally(() => setBlogLoading(false));
  }, [tab]);

  const handleBlogAction = async (id, action, note = null) => {
    if (action === 'delete') {
      if (!window.confirm('Permanently delete this blog post?')) return;
      const { error } = await supabase.rpc('admin_delete_blog', { p_post_id: id });
      if (!error) setBlogPosts(prev => prev.filter(p => p.id !== id));
      return;
    }
    const fnMap = {
      approved: 'admin_approve_blog',
      rejected: 'admin_reject_blog',
      pending:  'admin_unpublish_blog',
    };
    const { data, error } = await supabase.rpc(fnMap[action], action === 'pending'
      ? { p_post_id: id }
      : { p_post_id: id, p_note: note }
    );
    if (!error && data) setBlogPosts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
  };

  /* ── events state ── */
  const [adminEvents,      setAdminEvents]      = useState([]);
  const [eventsLoading,    setEventsLoading]    = useState(false);
  const [showEventModal,   setShowEventModal]   = useState(null); // 'new' | event obj
  const [eventRsvps,       setEventRsvps]       = useState([]);
  const [rsvpEventView,    setRsvpEventView]    = useState(null);
  const [rsvpLoading,      setRsvpLoading]      = useState(false);
  const [eventForm, setEventForm] = useState({
    title:'', description:'', event_type:'Physical', location:'', venue:'',
    city:'Delhi', event_date:'', event_time:'', capacity:'', is_free:true, price:0, status:'upcoming', tags:'',
  });

  useEffect(() => {
    if (tab !== 'events') return;
    setEventsLoading(true);
    supabase.from('events').select('*').order('event_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setAdminEvents(data || []); setEventsLoading(false); });
  }, [tab]);

  const openEventModal = (ev) => {
    if (ev === 'new') {
      setEventForm({ title:'', description:'', event_type:'Physical', location:'', venue:'', city:'Delhi', event_date:'', event_time:'', capacity:'', is_free:true, price:0, status:'upcoming', tags:'' });
    } else {
      setEventForm({ title:ev.title, description:ev.description||'', event_type:ev.event_type||'Physical', location:ev.location||'', venue:ev.venue||'', city:ev.city||'Delhi', event_date:ev.event_date||'', event_time:ev.event_time||'', capacity:ev.capacity||'', is_free:ev.is_free!==false, price:ev.price||0, status:ev.status||'upcoming', tags:(ev.tags||[]).join(', ') });
    }
    setShowEventModal(ev);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim()) return;
    const payload = { ...eventForm, tags: eventForm.tags.split(',').map(t=>t.trim()).filter(Boolean), capacity: eventForm.capacity ? Number(eventForm.capacity) : null, price: Number(eventForm.price)||0, event_date: eventForm.event_date || null, created_by: profile?.id };
    if (showEventModal === 'new') {
      const { data, error } = await supabase.from('events').insert(payload).select().single();
      if (!error && data) { setAdminEvents(prev => [data, ...prev]); setShowEventModal(null); showToast('Event created!'); }
      else showToast('Error: ' + (error?.message || 'Failed'), true);
    } else {
      const { data, error } = await supabase.from('events').update(payload).eq('id', showEventModal.id).select().single();
      if (!error && data) { setAdminEvents(prev => prev.map(e => e.id===data.id?data:e)); setShowEventModal(null); showToast('Event updated!'); }
      else showToast('Error: ' + (error?.message || 'Failed'), true);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event and all its RSVPs?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) { setAdminEvents(prev => prev.filter(e => e.id !== id)); showToast('Event deleted.'); }
  };

  const loadRsvps = async (ev) => {
    setRsvpEventView(ev); setRsvpLoading(true);
    const { data } = await supabase.rpc('admin_get_event_rsvps', { p_event_id: ev.id });
    setEventRsvps(data || []); setRsvpLoading(false);
  };

  /* ── contacts state ── */
  const [contacts,       setContacts]       = useState([]);
  const [contactsLoading,setContactsLoading]= useState(false);
  const [contactFilter,  setContactFilter]  = useState('unread');

  useEffect(() => {
    if (tab !== 'contacts') return;
    setContactsLoading(true);
    supabase.rpc('admin_get_contact_messages')
      .then(({ data, error }) => {
        if (!error) setContacts(data || []);
        else console.error('Contacts error:', error);
      })
      .finally(() => setContactsLoading(false));
  }, [tab]);

  const markContactStatus = async (id, status) => {
    await supabase.from('contact_messages').update({ status }).eq('id', id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
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
          <button className={`admin-nav-v2${tab==='blog'?' active':''}`} onClick={() => setTab('blog')}>
            <i className="fa-solid fa-newspaper"></i> Blog Posts
          </button>
          <button className={`admin-nav-v2${tab==='jobs'?' active':''}`} onClick={() => setTab('jobs')}>
            <i className="fa-solid fa-briefcase"></i> Jobs
          </button>

          <div className="admin-nav-group-label">Finance</div>
          <button className={`admin-nav-v2${tab==='payments'?' active':''}`} onClick={() => setTab('payments')}>
            <i className="fa-solid fa-indian-rupee-sign"></i> Payments
          </button>

          <div className="admin-nav-group-label">Settings</div>
          <button className={`admin-nav-v2${tab==='contacts'?' active':''}`} onClick={() => setTab('contacts')}>
            <i className="fa-solid fa-envelope"></i> Contact Messages
          </button>
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
                              {/* Committee assignment */}
                              {!m.is_committee_member
                                ? <button className="admin-btn" style={{background:'linear-gradient(135deg,#B8860B,#DAA520)',color:'#fff',border:'none'}}
                                    onClick={() => setCommitteeModal(m)}>
                                    <i className="fa-solid fa-crown"></i> Assign
                                  </button>
                                : <button className="admin-btn" style={{background:'rgba(184,134,11,0.1)',color:'#8B6000',border:'1px solid #DAA520'}}
                                    onClick={() => handleRemoveCommittee(m.id)}>
                                    <i className="fa-solid fa-crown"></i> {m.committee_role?.split('-')[0] || 'Member'}
                                  </button>
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

                    {/* ═══ EVENTS ═══ */}
          {tab === 'events' && !rsvpEventView && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Events <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({adminEvents.length})</span></span>
                <button className="btn btn-primary btn-sm" onClick={() => openEventModal('new')}>
                  <i className="fa-solid fa-plus"></i> Add Event
                </button>
              </div>
              {eventsLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…</div>
              ) : adminEvents.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-calendar" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p>No events yet.</p>
                  <button className="btn btn-primary btn-sm" style={{marginTop:'14px'}} onClick={() => openEventModal('new')}><i className="fa-solid fa-plus"></i> Create First Event</button>
                </div>
              ) : adminEvents.map(ev => (
                <div key={ev.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:'200px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{ev.title}</span>
                      <span className={`status-pill ${ev.status==='upcoming'?'sp-active':ev.status==='ongoing'?'sp-pending':'sp-rejected'}`}>{ev.status}</span>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                      {ev.event_date && <span><i className="fa-regular fa-calendar" style={{marginRight:'3px'}}></i>{new Date(ev.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                      {ev.venue && <span><i className="fa-solid fa-location-dot" style={{marginRight:'3px'}}></i>{ev.venue}</span>}
                      {ev.capacity && <span><i className="fa-solid fa-users" style={{marginRight:'3px'}}></i>{ev.capacity} seats</span>}
                      <span style={{color:ev.is_free?'var(--green)':'var(--blue)',fontWeight:600}}>{ev.is_free ? 'Free' : `₹${ev.price}`}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',flexShrink:0}}>
                    <button className="admin-btn admin-btn-orange" onClick={() => loadRsvps(ev)}><i className="fa-solid fa-users"></i> RSVPs</button>
                    <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openEventModal(ev)}><i className="fa-solid fa-pen"></i> Edit</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => deleteEvent(ev.id)}><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ EVENT RSVPs VIEW ═══ */}
          {tab === 'events' && rsvpEventView && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <button onClick={() => setRsvpEventView(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}><i className="fa-solid fa-arrow-left"></i></button>
                <span>RSVPs: <strong>{rsvpEventView.title}</strong></span>
              </div>
              {rsvpLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…</div>
              ) : eventRsvps.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-users" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>No RSVPs yet.
                </div>
              ) : (
                <>
                  <div style={{display:'flex',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}}>
                    <div style={{background:'var(--blue-pale)',borderRadius:'var(--radius-md)',padding:'10px 16px',fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>
                      <i className="fa-solid fa-users" style={{marginRight:'6px'}}></i>Total: {eventRsvps.length}
                    </div>
                    <div style={{background:'var(--orange-pale)',borderRadius:'var(--radius-md)',padding:'10px 16px',fontSize:'13px',fontWeight:700,color:'var(--orange)'}}>
                      <i className="fa-solid fa-hand-holding-heart" style={{marginRight:'6px'}}></i>Volunteers: {eventRsvps.filter(r=>r.is_volunteer).length}
                    </div>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table className="dboard-table">
                      <thead><tr><th>Name</th><th>Contact</th><th>Profession</th><th>ICAI No.</th><th>City</th><th>Vol.</th><th>Registered</th></tr></thead>
                      <tbody>
                        {eventRsvps.map((r,i) => (
                          <tr key={i}>
                            <td>
                              <div className="dboard-table-name">{r.full_name}</div>
                              {r.organisation && <div className="dboard-table-sub">{r.designation?`${r.designation}, `:''}{r.organisation}</div>}
                            </td>
                            <td>
                              <a href={`mailto:${r.email}`} style={{color:'var(--orange)',fontSize:'12px',display:'block',textDecoration:'none'}}>{r.email}</a>
                              {r.phone && <div className="dboard-table-sub">{r.phone}</div>}
                            </td>
                            <td className="dboard-table-muted" style={{fontSize:'12px'}}>{r.profession||'—'}</td>
                            <td style={{fontSize:'12px',fontFamily:'monospace',color:'var(--blue)',fontWeight:600}}>{r.icai_membership_no||'—'}</td>
                            <td className="dboard-table-muted" style={{fontSize:'12px'}}>{r.city||'—'}</td>
                            <td style={{textAlign:'center'}}>{r.is_volunteer?<span title="Volunteer">🙋</span>:<span style={{color:'var(--text-light)'}}>—</span>}</td>
                            <td className="dboard-table-muted" style={{fontSize:'12px'}}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ COURSES — LMS ADMIN ═══ */}
          {tab === 'courses' && !adminCourseView && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Courses <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({adminCourses.length})</span></span>
                <button className="btn btn-primary btn-sm" onClick={() => openCourseModal('new')}>
                  <i className="fa-solid fa-plus"></i> Add Course
                </button>
              </div>
              {adminCoursesLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading courses…
                </div>
              ) : adminCourses.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-book-open" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p>No courses yet.</p>
                  <button className="btn btn-primary btn-sm" style={{marginTop:'16px'}} onClick={() => openCourseModal('new')}><i className="fa-solid fa-plus"></i> Create First Course</button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {adminCourses.map(c => (
                    <div key={c.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'200px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{c.title}</span>
                          <span className={`status-pill ${c.status==='published'?'sp-active':'sp-pending'}`}>{c.status}</span>
                        </div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                          {c.category} · {c.level}
                          {c.price > 0 ? ` · ₹${c.price}` : ' · Free'}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <button className="admin-btn admin-btn-orange" onClick={() => { setAdminCourseView(c); loadCourseEnrollments(c); }}>
                          <i className="fa-solid fa-users"></i> Enrollments
                        </button>
                        <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openCourseModal(c)}>
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button className="admin-btn admin-btn-danger" onClick={() => deleteAdminCourse(c.id)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ COURSE ENROLLMENTS + CERTIFICATE ISSUER ═══ */}
          {tab === 'courses' && adminCourseView && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <button onClick={() => setAdminCourseView(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <span>Enrollments: <strong>{adminCourseView.title}</strong></span>
              </div>
              {courseEnrollmentsLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…</div>
              ) : courseEnrollments.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-users" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>No enrollments yet.
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table className="dboard-table">
                    <thead><tr><th>Student</th><th>Progress</th><th>Enrolled</th><th>Certificate</th><th>Action</th></tr></thead>
                    <tbody>
                      {courseEnrollments.map((e,i) => (
                        <tr key={i}>
                          <td>
                            <div className="dboard-table-name">{e.full_name}</div>
                            <div className="dboard-table-sub">{e.profession} · {e.email}</div>
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div style={{flex:1,height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden',minWidth:'60px'}}>
                                <div style={{height:'100%',background:Number(e.videos_completed)===Number(e.total_videos)&&Number(e.total_videos)>0?'var(--green)':'var(--orange)',borderRadius:'3px',width: e.total_videos>0?`${Math.round((e.videos_completed/e.total_videos)*100)}%`:'0%'}}></div>
                              </div>
                              <span style={{fontSize:'12px',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{e.videos_completed}/{e.total_videos}</span>
                            </div>
                          </td>
                          <td className="dboard-table-muted" style={{fontSize:'12px'}}>{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('en-IN') : '—'}</td>
                          <td>
                            {e.has_certificate
                              ? <span className="dboard-pill pill-green"><i className="fa-solid fa-certificate" style={{marginRight:'4px'}}></i>Issued</span>
                              : <span className="dboard-pill pill-orange">Pending</span>
                            }
                          </td>
                          <td>
                            {e.has_certificate ? (
                              <button className="admin-btn" style={{background:'#FFF0EE',color:'#C0392B',border:'1px solid #F5BDBA',fontSize:'11px'}} onClick={() => revokeCertificate(e.user_id, adminCourseView.id)}>
                                <i className="fa-solid fa-xmark"></i> Revoke
                              </button>
                            ) : (
                              <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none',fontSize:'11px'}} onClick={() => issueCertificate(e.user_id, adminCourseView.id, i)}>
                                <i className="fa-solid fa-certificate"></i> Issue Certificate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

          {/* ═══ BLOG POSTS ═══ */}
          {tab === 'blog' && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Blog Posts</span>
                <div style={{display:'flex',gap:'6px'}}>
                  {['pending','approved','rejected'].map(f => (
                    <button key={f} onClick={() => setBlogFilter(f)}
                      style={{padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1.5px solid',
                        background: blogFilter===f ? (f==='approved'?'var(--green)':f==='rejected'?'#C0392B':'var(--blue)') : 'transparent',
                        color: blogFilter===f ? '#fff' : 'var(--text-muted)',
                        borderColor: blogFilter===f ? (f==='approved'?'var(--green)':f==='rejected'?'#C0392B':'var(--blue)') : 'var(--border)',
                      }}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                      <span style={{marginLeft:'5px',background:'rgba(0,0,0,0.1)',padding:'1px 6px',borderRadius:'10px'}}>
                        {blogPosts.filter(p=>p.status===f).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {blogLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : blogPosts.filter(p=>p.status===blogFilter).length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-newspaper" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No {blogFilter} blog posts.
                </div>
              ) : blogPosts.filter(p=>p.status===blogFilter).map(post => (
                <div key={post.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'20px',marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',marginBottom:'12px',flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:'200px'}}>
                      <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>{post.title}</div>
                      <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                        {post.category && <span>{post.category}</span>}
                        <span>by <strong>{blogAuthors[post.author_id]?.full_name || 'Unknown'}</strong> · {blogAuthors[post.author_id]?.email || ''}</span>
                        <span>{new Date(post.created_at).toLocaleDateString('en-IN')}</span>
                        {post.read_time_mins && <span>{post.read_time_mins} min read</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',flexShrink:0}}>
                      {post.status !== 'approved' && (
                        <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none'}}
                          onClick={() => handleBlogAction(post.id, 'approved')}>
                          <i className="fa-solid fa-check"></i> Approve & Publish
                        </button>
                      )}
                      {post.status !== 'rejected' && (
                        <button className="admin-btn" style={{background:'#FFF0EE',color:'#C0392B',border:'1px solid #F5BDBA'}}
                          onClick={() => {
                            const note = window.prompt('Reason for rejection (optional):');
                            handleBlogAction(post.id, 'rejected', note);
                          }}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      )}
                      {post.status === 'approved' && (
                        <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}}
                          onClick={() => handleBlogAction(post.id, 'pending')}>
                          <i className="fa-solid fa-rotate-left"></i> Unpublish
                        </button>
                      )}
                      <button className="admin-btn admin-btn-danger"
                        onClick={() => handleBlogAction(post.id, 'delete')}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ CONTACT MESSAGES ═══ */}
          {tab === 'contacts' && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Contact Messages</span>
                <div style={{display:'flex',gap:'6px'}}>
                  {['unread','read','replied'].map(f => (
                    <button key={f} onClick={() => setContactFilter(f)}
                      style={{padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1.5px solid',
                        background: contactFilter===f ? (f==='unread'?'var(--blue)':f==='replied'?'var(--green)':'var(--text-muted)') : 'transparent',
                        color: contactFilter===f ? '#fff' : 'var(--text-muted)',
                        borderColor: contactFilter===f ? (f==='unread'?'var(--blue)':f==='replied'?'var(--green)':'var(--text-muted)') : 'var(--border)',
                      }}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                      <span style={{marginLeft:'5px',background:'rgba(0,0,0,0.1)',padding:'1px 6px',borderRadius:'10px'}}>
                        {contacts.filter(c=>c.status===f).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {contactsLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : contacts.filter(c=>c.status===contactFilter).length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-envelope" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No {contactFilter} messages.
                </div>
              ) : contacts.filter(c=>c.status===contactFilter).map(msg => (
                <div key={msg.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'20px',marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',marginBottom:'12px',flexWrap:'wrap'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{msg.name}</span>
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',fontWeight:600,
                          background:msg.status==='unread'?'rgba(26,60,110,0.1)':msg.status==='replied'?'var(--green-pale)':'var(--off-white)',
                          color:msg.status==='unread'?'var(--blue)':msg.status==='replied'?'var(--green)':'var(--text-muted)',
                          border:`1px solid ${msg.status==='unread'?'#C0CDE8':msg.status==='replied'?'#9ADDC3':'var(--border)'}`,
                        }}>
                          {msg.status.charAt(0).toUpperCase()+msg.status.slice(1)}
                        </span>
                      </div>
                      <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                        <a href={`mailto:${msg.email}`} style={{color:'var(--orange)',fontWeight:600,textDecoration:'none'}}>{msg.email}</a>
                        {msg.phone && <span><i className="fa-solid fa-phone" style={{marginRight:'3px'}}></i>{msg.phone}</span>}
                        <span>{new Date(msg.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      {msg.subject && <div style={{marginTop:'4px',fontSize:'12px',fontWeight:600,color:'var(--blue-mid)'}}>{msg.subject}</div>}
                    </div>
                    <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap'}}>
                      <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject||'Your FIP Enquiry')}`}
                        className="admin-btn" style={{background:'var(--blue)',color:'#fff',border:'none',textDecoration:'none'}}
                        onClick={() => markContactStatus(msg.id,'replied')}>
                        <i className="fa-solid fa-reply"></i> Reply
                      </a>
                      {msg.status === 'unread' && (
                        <button className="admin-btn" style={{background:'var(--off-white)',color:'var(--text-muted)',border:'1px solid var(--border)'}}
                          onClick={() => markContactStatus(msg.id,'read')}>
                          <i className="fa-solid fa-check"></i> Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                    {msg.message}
                  </div>
                </div>
              ))}
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

      {/* ── Event Create / Edit Modal ── */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'600px'}}>
            <button className="modal-close" onClick={() => setShowEventModal(null)}>&#x2715;</button>
            <div className="modal-title">{showEventModal === 'new' ? 'Create New Event' : 'Edit Event'}</div>
            <div className="form-row">
              <div className="form-group" style={{flex:2}}>
                <label className="form-label">Event Title *</label>
                <input className="form-input" type="text" placeholder="e.g. GST Conclave 2026" value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={eventForm.event_type} onChange={e=>setEventForm(f=>({...f,event_type:e.target.value}))}>
                  <option>Physical</option><option>Virtual</option><option>Hybrid</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Event details…" value={eventForm.description} onChange={e=>setEventForm(f=>({...f,description:e.target.value}))} style={{minHeight:'80px'}}></textarea>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Venue / Location</label>
                <input className="form-input" type="text" placeholder="e.g. Le Meridien, New Delhi" value={eventForm.venue} onChange={e=>setEventForm(f=>({...f,venue:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" type="text" placeholder="Delhi" value={eventForm.city} onChange={e=>setEventForm(f=>({...f,city:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={eventForm.event_date} onChange={e=>setEventForm(f=>({...f,event_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" type="text" placeholder="e.g. 09:00 AM" value={eventForm.event_time} onChange={e=>setEventForm(f=>({...f,event_time:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="form-input" type="number" placeholder="e.g. 200" value={eventForm.capacity} onChange={e=>setEventForm(f=>({...f,capacity:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={eventForm.status} onChange={e=>setEventForm(f=>({...f,status:e.target.value}))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input className="form-input" type="number" placeholder="0 = free" value={eventForm.price} onChange={e=>setEventForm(f=>({...f,price:e.target.value,is_free:Number(e.target.value)===0}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags <span style={{fontWeight:400,color:'var(--text-light)'}}>— comma separated</span></label>
              <input className="form-input" type="text" placeholder="e.g. GST, Networking, Summit" value={eventForm.tags} onChange={e=>setEventForm(f=>({...f,tags:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setShowEventModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveEvent} disabled={!eventForm.title.trim()}>
                {showEventModal === 'new' ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Committee Assignment Modal ── */}
      {committeeModal && (
        <div className="modal-overlay" onClick={() => setCommitteeModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'460px'}}>
            <button className="modal-close" onClick={() => setCommitteeModal(null)}>&#x2715;</button>
            <div style={{textAlign:'center',marginBottom:'20px'}}>
              <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#B8860B,#FFD700)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:'22px'}}>
                <i className="fa-solid fa-crown" style={{color:'#3D2B00'}}></i>
              </div>
              <div className="modal-title" style={{color:'#B8860B'}}>Assign Committee Role</div>
              <div style={{fontSize:'13px',color:'var(--text-muted)'}}>Assigning to <strong>{committeeModal.full_name}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label">Committee</label>
              <select className="form-select" value={cmForm.committee_name} onChange={e=>setCmForm(f=>({...f,committee_name:e.target.value}))}>
                <option value="">Select committee…</option>
                {COMMITTEES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={cmForm.committee_role} onChange={e=>setCmForm(f=>({...f,committee_role:e.target.value}))}>
                <option>Chairman</option>
                <option>Co-Chairman</option>
                <option>Chairperson</option>
                <option>Co-Chairperson</option>
                <option>Secretary</option>
                <option>Member</option>
              </select>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setCommitteeModal(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'linear-gradient(135deg,#B8860B,#DAA520)',color:'#fff',border:'none',fontWeight:700}}
                onClick={handleAssignCommittee} disabled={!cmForm.committee_name}>
                <i className="fa-solid fa-crown"></i> Assign Gold Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Course Add / Edit Modal ── */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'560px'}}>
            <button className="modal-close" onClick={() => setShowCourseModal(null)}>&#x2715;</button>
            <div className="modal-title">{showCourseModal === 'new' ? 'Add New Course' : 'Edit Course'}</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" type="text" placeholder="e.g. Mastering GST Litigation" value={courseForm.title} onChange={e=>setCourseForm(f=>({...f,title:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Slug (URL)</label>
                <input className="form-input" type="text" placeholder="auto-generated from title" value={courseForm.slug} onChange={e=>setCourseForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subtitle</label>
              <input className="form-input" type="text" placeholder="e.g. Sankalp 2026 — 6 Expert Sessions" value={courseForm.subtitle} onChange={e=>setCourseForm(f=>({...f,subtitle:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="What will students learn?" value={courseForm.description} onChange={e=>setCourseForm(f=>({...f,description:e.target.value}))} style={{minHeight:'80px'}}></textarea>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" type="text" placeholder="e.g. GST, Direct Tax" value={courseForm.category} onChange={e=>setCourseForm(f=>({...f,category:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select" value={courseForm.level} onChange={e=>setCourseForm(f=>({...f,level:e.target.value}))}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input className="form-input" type="number" placeholder="0 = free" value={courseForm.price} onChange={e=>setCourseForm(f=>({...f,price:e.target.value}))}/>
              </div>
              <div className="form-group">
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Instructor</label>
                <input className="form-input" type="text" placeholder="e.g. CA Gaurav Aggrawal" value={courseForm.instructor} onChange={e=>setCourseForm(f=>({...f,instructor:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (hours)</label>
                <input className="form-input" type="number" placeholder="e.g. 8" value={courseForm.duration_hours} onChange={e=>setCourseForm(f=>({...f,duration_hours:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Access / Pricing</label>
              <select className="form-select" value={courseForm.free_for} onChange={e=>setCourseForm(f=>({...f,free_for:e.target.value}))}>
                <option value="none">Paid — everyone pays the course price</option>
                <option value="members">Free for Active Members · Students pay</option>
                <option value="students">Free for Students · Members pay</option>
                <option value="all">Free for Everyone</option>
              </select>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setShowCourseModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveCourse} disabled={!courseForm.title.trim()}>
                {showCourseModal === 'new' ? 'Create Course' : 'Save Changes'}
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