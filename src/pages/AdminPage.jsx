import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { committees as defaultCommittees } from '../data/index.js';
import * as XLSX from 'xlsx';

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
/* ── Helper: collapsible activity section ── */
function ActivitySection({ icon, color, title, count, children }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius-md)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:'var(--off-white)',cursor:'pointer',userSelect:'none'}}
        onClick={() => setOpen(o => !o)}>
        <div style={{width:'28px',height:'28px',borderRadius:'6px',background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className={'fa-solid ' + icon} style={{fontSize:'12px',color}}></i>
        </div>
        <span style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',flex:1}}>{title}</span>
        <span style={{fontSize:'11px',fontWeight:700,color:count>0?color:'var(--text-light)',background:count>0?color+'15':'var(--border)',padding:'2px 8px',borderRadius:'10px'}}>{count}</span>
        <i className={'fa-solid fa-chevron-' + (open?'up':'down')} style={{fontSize:'10px',color:'var(--text-light)'}}></i>
      </div>
      {open && (
        <div style={{padding:'4px 14px 10px'}}>{children}</div>
      )}
    </div>
  );
}

function EmptyActivity({ text }) {
  return <div style={{textAlign:'center',padding:'14px 0',fontSize:'12px',color:'var(--text-light)'}}>{text}</div>;
}

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');

  /* members state */
  const [members,        setMembers]        = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch,   setMemberSearch]   = useState('');
  const [memberSubTab,   setMemberSubTab]   = useState('all');   // 'all' | 'students' | 'members'
  const [openActionMenu, setOpenActionMenu] = useState(null);    // member id whose ⋮ menu is open

  /* committees state */
  const [committees,    setCommittees]    = useState(defaultCommittees);
  const [editModal,     setEditModal]     = useState(null); // { mode:'committee'|'member', committeeId, memberIdx? }
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, committeeId, memberIdx? }

  /* committee form */
  const [cForm, setCForm] = useState({ name:'', abbr:'', category:'Other', desc:'' });

  /* member form */
  const [mForm, setMForm] = useState({ name:'', role:'Member' });

  const { profile, signOut, isAdmin } = useAuth();
  const { showToast, openModal }      = useApp();
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

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  /* ── role / status changes ── */
  const [committeeModal, setCommitteeModal] = useState(null);
  const [memberDetail,   setMemberDetail]   = useState(null);
  const [memberActivity, setMemberActivity] = useState(null); // { payments, courses, rsvps, referrals }
  const [activityLoading, setActivityLoading] = useState(false);

  const openMemberDetail = async (m) => {
    setMemberDetail(m);
    setMemberActivity(null);
    setActivityLoading(true);
    try {
      const [paymentsRes, coursesRes, rsvpsRes, referralsRes, blogRes] = await Promise.all([
        supabase.from('payments').select('item_name,total_amount,status,created_at').eq('user_id', m.id).order('created_at',{ascending:false}).limit(10),
        supabase.from('course_registrations').select('course_title,status,created_at').eq('user_id', m.id).order('created_at',{ascending:false}).limit(10),
        supabase.from('event_rsvps').select('full_name,status,created_at,event_id').eq('user_id', m.id).order('created_at',{ascending:false}).limit(10),
        supabase.from('referrals').select('status,created_at,reward_given').eq('referrer_id', m.id).order('created_at',{ascending:false}),
        supabase.from('blog_posts').select('title,status,created_at').eq('author_id', m.id).order('created_at',{ascending:false}).limit(10),
      ]);
      setMemberActivity({
        payments:   paymentsRes.data  || [],
        courses:    coursesRes.data   || [],
        rsvps:      rsvpsRes.data     || [],
        referrals:  referralsRes.data || [],
        blogs:      blogRes.data      || [],
      });
    } catch(e) { console.error('Activity load error:', e); }
    setActivityLoading(false);
  };
  const [cmForm, setCmForm] = useState({ committee_name:'', committee_role:'Member' });

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
    event_date:'', event_time:'', zoom_link:'', zoom_password:'', whatsapp_group_link:'',
    banner_url:'', what_you_learn:'', speakers:'',
  });

  useEffect(() => {
    if (tab !== 'courses') return;
    setAdminCoursesLoading(true);
    supabase.rpc('admin_get_courses')
      .then(({ data }) => { if (data) setAdminCourses(data); })
      .finally(() => setAdminCoursesLoading(false));
  }, [tab]);

  const downloadEnrollmentsExcel = function(courseName, enrollments) {
    var headers = ['Full Name', 'Email', 'Phone', 'Status', 'Registered On'];
    var rows = enrollments.map(function(e) {
      return [
        e.full_name || '',
        e.email || '',
        e.phone || '',
        e.status || 'registered',
        e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : '',
      ];
    });
    var allRows = [headers].concat(rows);
    var csvLines = allRows.map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell).split('"').join('""') + '"';
      }).join(',');
    });
    var csvContent = csvLines.join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var safe = courseName.split('').filter(function(c){ return /[a-zA-Z0-9]/.test(c); }).join('_').slice(0,30);
    var date = new Date().toISOString().slice(0,10);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'FIP_Enrollments_' + safe + '_' + date + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
  };

  const downloadMembersExcel = function(membersList) {
    var headers = ['Full Name', 'Email', 'Phone', 'Profession', 'City', 'Role', 'Account Type', 'Membership Status', 'Membership End', 'Joined'];
    var rows = membersList.map(function(m) {
      return [
        m.full_name || '',
        m.email || '',
        m.phone || '',
        m.profession || '',
        m.city || '',
        m.role || '',
        m.account_type || '',
        m.membership_status || '',
        m.membership_end || '',
        m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '',
      ];
    });
    var allRows = [headers].concat(rows);
    var csvLines = allRows.map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell).split('"').join('""') + '"';
      }).join(',');
    });
    var csvContent = csvLines.join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var date = new Date().toISOString().slice(0,10);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'FIP_Members_' + date + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Members CSV downloaded!');
  };

  const downloadPaymentsExcel = function(paymentsList) {
    var headers = ['Member Name', 'Email', 'Phone', 'Item / Plan', 'Amount (₹)', 'GST (₹)', 'Total (₹)', 'Transaction ID', 'Order ID', 'Status', 'Date'];
    var rows = paymentsList.map(function(p) {
      return [
        p.profiles?.full_name || '',
        p.profiles?.email     || '',
        p.profiles?.phone     || '',
        p.item_name           || '',
        p.amount              || 0,
        p.gst_amount          || 0,
        p.total_amount        || 0,
        p.razorpay_payment_id || '',
        p.razorpay_order_id   || '',
        p.status              || '',
        p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '',
      ];
    });
    var csvLines = [headers].concat(rows).map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell).split('"').join('""') + '"';
      }).join(',');
    });
    var blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    var a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'FIP_Payments_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    showToast('Payments CSV downloaded!');
  };

  const loadCourseEnrollments = async (course) => {
    setCourseEnrollmentsLoading(true);
    const { data } = await supabase.rpc('admin_get_course_registrations', { p_course_id: course.id });
    if (data) setCourseEnrollments(data);
    setCourseEnrollmentsLoading(false);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) return;
    const slug = courseForm.slug.trim() || courseForm.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const payload = {
      ...courseForm, slug,
      price:          Number(courseForm.price) || 0,
      duration_hours: courseForm.duration_hours ? Number(courseForm.duration_hours) : null,
      is_free_for_members: courseForm.free_for === 'members' || courseForm.free_for === 'all',
      event_date:    courseForm.event_date    || null,
      event_time:    (courseForm.event_time    || '').trim() || null,
      zoom_link:     (courseForm.zoom_link     || '').trim() || null,
      whatsapp_group_link: (courseForm.whatsapp_group_link || '').trim() || null,
      flyer_template_url: (courseForm.flyer_template_url || '').trim() || null,
      zoom_password: (courseForm.zoom_password || '').trim() || null,
      banner_url:    (courseForm.banner_url    || '').trim() || null,
      what_you_learn: courseForm.what_you_learn
        ? courseForm.what_you_learn.split('\n').map(l=>l.trim()).filter(Boolean)
        : [],
      speakers: courseForm.speakers
        ? (() => { try { return JSON.parse(courseForm.speakers); } catch(e) { return []; } })()
        : [],
    };
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
      setCourseForm({ title:'', slug:'', subtitle:'', description:'', category:'', level:'Intermediate', price:0, free_for:'none', instructor:'', duration_hours:'', event_date:'', event_time:'', zoom_link:'', zoom_password:'', whatsapp_group_link:'', banner_url:'', what_you_learn:'', speakers:'' });
    } else {
      setCourseForm({ title:course.title, slug:course.slug, subtitle:course.subtitle||'', description:course.description||'', category:course.category||'', level:course.level||'Intermediate', price:course.price||0, free_for:course.free_for||'none', instructor:course.instructor||'', duration_hours:course.duration_hours||'', event_date:course.event_date||'', event_time:course.event_time||'', zoom_link:course.zoom_link||'', zoom_password:course.zoom_password||'', whatsapp_group_link:course.whatsapp_group_link||'', flyer_template_url:course.flyer_template_url||'', is_private:course.is_private||false, banner_url:course.banner_url||'', what_you_learn:(course.what_you_learn||[]).join('\n'), speakers:course.speakers ? JSON.stringify(course.speakers, null, 2) : '' });
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
    city:'Delhi', event_date:'', event_time:'', capacity:'', is_free:true, price:0,
    status:'upcoming', tags:'', image_url:'', zoom_link:'',
  });

  useEffect(() => {
    if (tab !== 'events') return;
    setEventsLoading(true);
    supabase.from('events').select('*').order('event_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setAdminEvents(data || []); setEventsLoading(false); });
  }, [tab]);

  const openEventModal = (ev) => {
    if (ev === 'new') {
      setEventForm({ title:'', description:'', event_type:'Physical', location:'', venue:'', city:'Delhi', event_date:'', event_time:'', capacity:'', is_free:true, price:0, status:'upcoming', tags:'', image_url:'', zoom_link:'', allowed_professions:[], is_private:false });
    } else {
      setEventForm({ title:ev.title, description:ev.description||'', event_type:ev.event_type||'Physical', location:ev.location||'', venue:ev.venue||'', city:ev.city||'Delhi', event_date:ev.event_date||'', event_time:ev.event_time||'', capacity:ev.capacity||'', is_free:ev.is_free!==false, price:ev.price||0, status:ev.status||'upcoming', tags:(ev.tags||[]).join(', '), image_url:ev.image_url||'', zoom_link:ev.zoom_link||'', allowed_professions:ev.allowed_professions||[], is_private:ev.is_private||false });
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
    if (!window.confirm('Delete this event and all its registrations?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) { setAdminEvents(prev => prev.filter(e => e.id !== id)); showToast('Event deleted.'); }
  };

  const loadRsvps = async (ev) => {
    setRsvpEventView(ev); setRsvpLoading(true);
    const { data } = await supabase.rpc('admin_get_event_rsvps', { p_event_id: ev.id });
    setEventRsvps(data || []); setRsvpLoading(false);
  };

  /* ── popups state ── */
  const [popups,        setPopups]        = useState([]);
  const [popupsLoading, setPopupsLoading] = useState(false);
  const [popupModal,    setPopupModal]    = useState(null); // 'new' | popup obj
  const [popupForm,     setPopupForm]     = useState({ title:'', image_url:'', cta_label:'Register Now', cta_link:'/courses', is_active:true, sort_order:0 });

  useEffect(() => {
    if (tab !== 'popups') return;
    setPopupsLoading(true);
    supabase.from('popups').select('*').order('sort_order').then(({ data }) => {
      setPopups(data || []);
      setPopupsLoading(false);
    });
  }, [tab]);

  const savePopup = async () => {
    if (!popupForm.title.trim() || !popupForm.image_url.trim()) return;
    const payload = { ...popupForm, sort_order: Number(popupForm.sort_order)||0 };
    if (popupModal === 'new') {
      const { data, error } = await supabase.from('popups').insert(payload).select().single();
      if (!error) { setPopups(p => [...p, data]); setPopupModal(null); showToast('Popup created!'); }
      else showToast('Error: ' + error.message, true);
    } else {
      const { data, error } = await supabase.from('popups').update(payload).eq('id', popupModal.id).select().single();
      if (!error) { setPopups(p => p.map(x => x.id===data.id?data:x)); setPopupModal(null); showToast('Popup updated!'); }
      else showToast('Error: ' + error.message, true);
    }
  };

  const deletePopup = async (id) => {
    if (!window.confirm('Delete this popup?')) return;
    await supabase.from('popups').delete().eq('id', id);
    setPopups(p => p.filter(x => x.id !== id));
    showToast('Popup deleted.');
  };

  const togglePopup = async (id, val) => {
    await supabase.from('popups').update({ is_active: val }).eq('id', id);
    setPopups(p => p.map(x => x.id===id ? {...x, is_active:val} : x));
  };

  /* ── certificates state ── */
  const [certCourses,     setCertCourses]     = useState([]);
  const [certCourseId,    setCertCourseId]    = useState('');
  const [certList,        setCertList]        = useState([]);
  const [certGenerating,  setCertGenerating]  = useState(false);
  const [certResult,      setCertResult]      = useState(null);

  // Excel recipient upload
  const [certRecipients,  setCertRecipients]  = useState([]);   // [{name,email}]
  const [certExcelName,   setCertExcelName]   = useState('');   // file name for display

  // Template selection
  const [certTemplateMode,  setCertTemplateMode]  = useState('classic');  // 'classic'|'modern'|'professional'|'custom'
  const [certTemplateUrl,   setCertTemplateUrl]   = useState('');         // only used when mode='custom'

  const DEFAULT_TEMPLATES = [
    { id:'classic',      label:'Classic Blue',     desc:'Formal design — navy border, gold name',   bg:'#F8F6F0', accent:'#C9A84C', text:'#1A3C6E' },
    { id:'modern',       label:'Modern Orange',    desc:'Clean white with FIP orange accents',       bg:'#FFFFFF', accent:'#F26122', text:'#1A3C6E' },
    { id:'professional', label:'Dark Professional',desc:'Premium dark navy with gold lettering',     bg:'#0F2044', accent:'#DAA520', text:'#FFFFFF' },
  ];

  useEffect(() => {
    if (tab !== 'certificates') return;
    supabase.from('courses').select('id,title,event_date').eq('status','published')
      .order('created_at',{ascending:false})
      .then(({ data }) => setCertCourses(data || []));
    supabase.rpc('admin_get_certificates').then(({ data }) => setCertList(data || []));
  }, [tab]);

  const loadCertCourse = (cId) => {
    setCertCourseId(cId);
    setCertResult(null);
  };

  /* Parse Excel / CSV file into [{name, email}] */
  const parseExcelFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const wb   = XLSX.read(buffer, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rows.length) { showToast('Excel file is empty.', true); return []; }
    const headers = rows[0].map(h => String(h||'').toLowerCase().trim());
    const nameIdx  = headers.findIndex(h => h.includes('name'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    if (nameIdx === -1 || emailIdx === -1) {
      showToast('Excel must have a "Name" column and an "Email" column.', true);
      return [];
    }
    return rows.slice(1)
      .filter(r => r[nameIdx] && r[emailIdx])
      .map(r => ({ name: String(r[nameIdx]).trim(), email: String(r[emailIdx]).trim() }))
      .filter(r => r.name && r.email.includes('@'));
  };

  const generateCertificates = async () => {
    if (!certCourseId) { showToast('Please select a course.', true); return; }
    if (!certRecipients.length) { showToast('Please upload an Excel file with recipients.', true); return; }
    if (certTemplateMode === 'custom' && !certTemplateUrl) {
      showToast('Please upload a custom template image.', true); return;
    }
    setCertGenerating(true); setCertResult(null);
    try {
      const res = await fetch('/api/generate-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId:      certCourseId,
          recipients:    certRecipients,
          templateStyle: certTemplateMode,
          templateUrl:   certTemplateMode === 'custom' ? certTemplateUrl : null,
          sendEmails:    true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || ('Server error ' + res.status);
        showToast('Error: ' + msg, true);
        setCertGenerating(false);
        return;
      }
      setCertResult(data);
      supabase.rpc('admin_get_certificates').then(({ data: d }) => setCertList(d || []));
      showToast(`${data.generated} certificates sent!`);
    } catch (err) {
      showToast('Network error: ' + err.message, true);
    }
    setCertGenerating(false);
  };
  /* ── membership settings state ── */
  const [memSettings,     setMemSettings]     = useState(null);
  const [memSettingsLoading, setMemSettingsLoading] = useState(false);
  const [memForm,         setMemForm]         = useState({
    standard_price: 500,
    renewal_price:  200,
    validity_months: 12,
    membership_start_date: '',
    membership_end_date:   '',
    description: '',
  });
  const [memSaving, setMemSaving] = useState(false);

  useEffect(() => {
    if (tab !== 'membership_settings') return;
    setMemSettingsLoading(true);
    supabase.from('site_settings').select('*').eq('key', 'membership').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setMemForm(f => ({ ...f, ...v }));
        }
        setMemSettingsLoading(false);
      });
  }, [tab]);

  const saveMembershipSettings = async () => {
    setMemSaving(true);
    const { error } = await supabase.from('site_settings').upsert(
      { key: 'membership', value: memForm, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    setMemSaving(false);
    if (!error) showToast('Membership settings saved!');
    else showToast('Error: ' + error.message, true);
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
    ]).then(async ([jobsRes, summaryRes]) => {
      if (!jobsRes.error) {
        setJobs(jobsRes.data || []);
      } else {
        // Fallback: direct query (works even if approval_status column doesn't exist yet)
        console.warn('admin_get_all_jobs RPC failed, using direct query:', jobsRes.error.message);
        const { data: directData } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        setJobs(directData || []);
      }
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

  /* ── Dashboard live stats ── */
  const [dashStats,       setDashStats]       = useState({ revenue:0, events:0, enrollments:0, activeMembers:0 });
  const [recentPayments,  setRecentPayments]  = useState([]);
  const [dashLoading,     setDashLoading]     = useState(false);

  /* ── All Payments tab ── */
  const [allPayments,        setAllPayments]        = useState([]);
  const [allPaymentsLoading, setAllPaymentsLoading] = useState(false);
  const [paymentSearch,      setPaymentSearch]      = useState('');
  const [paymentStatusFilter,setPaymentStatusFilter]= useState('All');

  /* ── Search states for all admin tabs ── */
  /* ── Bulk Email system ── */
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [showEmailCompose,  setShowEmailCompose]  = useState(false);
  const [emailSubject,      setEmailSubject]      = useState('');
  const [emailContent,      setEmailContent]      = useState('');
  const [emailSending,      setEmailSending]      = useState(false);

  const [eventSearch,         setEventSearch]         = useState('');
  const [eventTypeFilter,     setEventTypeFilter]     = useState('All');
  const [courseSearch,        setCourseSearch]        = useState('');
  const [courseStatusFilter,  setCourseStatusFilter]  = useState('All');
  const [jobSearch,           setJobSearch]           = useState('');
  const [jobTypeFilter,       setJobTypeFilter]       = useState('All');
  const [testiSearch,         setTestiSearch]         = useState('');
  const [blogSearch,          setBlogSearch]          = useState('');

  /* ── Debounced values: fire after 1.5s or when user types 3+ words ── */
  const dEventSearch  = useDebounce(eventSearch,  1500, 3);
  const dCourseSearch = useDebounce(courseSearch, 1500, 3);
  const dJobSearch    = useDebounce(jobSearch,    1500, 3);
  const dPaySearch    = useDebounce(paymentSearch,1500, 3);
  const dTestiSearch  = useDebounce(testiSearch,  1500, 3);
  const dBlogSearch   = useDebounce(blogSearch,   1500, 3);

  /* ── Slides tab ── */
  const SLIDE_ACTIONS = ['join','courses','events','webinars','committees','directory','about','membership'];
  const emptySlide = { image_url:'', badge:'', title:'', subtitle:'', description:'', btn_label:'', btn_action:'join', tag:'', sort_order:0, is_active:true };
  const [slides,       setSlides]       = useState([]);
  const [slidesLoading,setSlidesLoading]= useState(false);
  const [slideForm,    setSlideForm]    = useState(emptySlide);
  const [slideSaving,  setSlideSaving]  = useState(false);
  const [editingSlideId, setEditingSlideId] = useState(null); // null = new, uuid = edit

  useEffect(() => {
    if (tab !== 'dashboard') return;
    setDashLoading(true);
    Promise.all([
      // Revenue this year (paid payments)
      supabase.from('payments').select('total_amount').eq('status','paid')
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString()),
      // Active events count
      supabase.from('events').select('id', { count:'exact', head:true }).in('status',['upcoming','ongoing']),
      // Course registrations count
      supabase.from('course_registrations').select('id', { count:'exact', head:true }),
      // Total profiles count
      supabase.from('profiles').select('id', { count:'exact', head:true }),
      // Active members count
      supabase.from('profiles').select('id', { count:'exact', head:true }).eq('membership_status','Active'),
      // Recent payments with profile join
      supabase.from('payments').select('total_amount,amount,gst_amount,status,item_name,created_at,user_id,razorpay_payment_id,razorpay_order_id,profiles(full_name,email,phone)')
        .order('created_at', { ascending:false }).limit(8),
    ]).then(([revRes, evRes, courseRes, totalMembRes, activeMembRes, payRes]) => {
      const revenue = (revRes.data||[]).reduce((s,p) => s + (Number(p.total_amount)||0), 0);
      setDashStats({
        revenue,
        events:        evRes.count       || 0,
        enrollments:   courseRes.count   || 0,
        totalMembers:  totalMembRes.count || 0,
        activeMembers: activeMembRes.count || 0,
      });
      setRecentPayments(payRes.data || []);
      setDashLoading(false);
    });
  }, [tab]);

  /* ── Load all payments when tab opens ── */
  useEffect(() => {
    if (tab !== 'payments') return;
    setAllPaymentsLoading(true);
    supabase
      .from('payments')
      .select('total_amount,amount,gst_amount,status,item_name,created_at,user_id,razorpay_payment_id,razorpay_order_id,profiles(full_name,email,phone)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setAllPayments(data || []); setAllPaymentsLoading(false); });
  }, [tab]);

  /* ── Load slides when tab opens ── */
  useEffect(() => {
    if (tab !== 'slides') return;
    setSlidesLoading(true);
    supabase.from('slides').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { setSlides(data || []); setSlidesLoading(false); });
  }, [tab]);

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

  const matchesSearch = (m) =>
    !memberSearch ||
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.profession?.toLowerCase().includes(memberSearch.toLowerCase());

  const allUsers     = members.filter(matchesSearch);
  const studentUsers = members.filter(m => ['guest_user','student'].includes((m.account_type||'').toLowerCase()) && matchesSearch(m));
  const paidMembers  = members.filter(m => ((m.account_type||'').toLowerCase() === 'fip_member' || m.membership_status === 'Active') && !['guest_user','student'].includes((m.account_type||'').toLowerCase()) && matchesSearch(m));

  const filteredMembers = memberSubTab === 'students' ? studentUsers
    : memberSubTab === 'members' ? paidMembers
    : allUsers;

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
          <button className={`admin-nav-v2${tab==='slides'?' active':''}`} onClick={() => setTab('slides')}>
            <i className="fa-solid fa-image"></i> Hero Slides
          </button>

          <div className="admin-nav-group-label">Finance</div>
          <button className={`admin-nav-v2${tab==='payments'?' active':''}`} onClick={() => setTab('payments')}>
            <i className="fa-solid fa-indian-rupee-sign"></i> Payments
          </button>

          <div className="admin-nav-group-label">Settings</div>
          <button className={`admin-nav-v2${tab==='contacts'?' active':''}`} onClick={() => setTab('contacts')}>
            <i className="fa-solid fa-envelope"></i> Contact Messages
          </button>
          <button className={`admin-nav-v2${tab==='certificates'?' active':''}`} onClick={() => setTab('certificates')}>
            <i className="fa-solid fa-certificate"></i> Certificates
          </button>
          <button className={`admin-nav-v2${tab==='membership_settings'?' active':''}`} onClick={() => setTab('membership_settings')}>
            <i className="fa-solid fa-id-card"></i> Membership
          </button>
          <button className={`admin-nav-v2${tab==='popups'?' active':''}`} onClick={() => setTab('popups')}>
            <i className="fa-solid fa-rectangle-ad"></i> Popups
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
              <h2 className="admin-page-title">Dashboard Overview {dashLoading && <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'14px',color:'var(--text-light)',marginLeft:'8px'}}></i>}</h2>

              {/* Stat cards row — matches reference exactly */}
              <div className="dboard-stats-row">
                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-blue"><i className="fa-solid fa-users"></i></div>
                  <div className="dboard-stat-val">{dashStats.totalMembers || totalMembers}</div>
                  <div className="dboard-stat-lbl">Total Members</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> {dashStats.activeMembers} active
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-orange"><i className="fa-solid fa-indian-rupee-sign"></i></div>
                  <div className="dboard-stat-val">{dashStats.revenue >= 100000 ? `₹${(dashStats.revenue/100000).toFixed(1)}L` : `₹${dashStats.revenue.toLocaleString('en-IN')}`}</div>
                  <div className="dboard-stat-lbl">Revenue This Year</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> Paid payments only
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-green"><i className="fa-solid fa-calendar-check"></i></div>
                  <div className="dboard-stat-val">{dashStats.events}</div>
                  <div className="dboard-stat-lbl">Active Events</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> Upcoming & ongoing
                  </div>
                </div>

                <div className="dboard-stat-card">
                  <div className="dboard-stat-icon dsi-purple"><i className="fa-solid fa-graduation-cap"></i></div>
                  <div className="dboard-stat-val">{dashStats.enrollments}</div>
                  <div className="dboard-stat-lbl">Course Registrations</div>
                  <div className="dboard-stat-trend trend-up">
                    <i className="fa-solid fa-arrow-up"></i> All time
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
                        {dashLoading ? (
                          <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}><i className="fa-solid fa-spinner fa-spin"></i></td></tr>
                        ) : recentPayments.length === 0 ? (
                          <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}>No payments yet</td></tr>
                        ) : recentPayments.map((p,i) => (
                          <tr key={i}>
                            <td>
                              <div className="dboard-table-name">{p.profiles?.full_name || '—'}</div>
                            </td>
                            <td className="dboard-table-muted" style={{fontSize:'11px',maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.item_name}</td>
                            <td>
                              <span style={{color:'var(--orange)',fontWeight:700}}>₹{p.total_amount}</span>
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
              {/* Header row */}
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Users <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({allUsers.length} total)</span></span>
                <button className="btn btn-sm" style={{background:'#217346',color:'#fff',border:'none',fontWeight:700,display:'flex',alignItems:'center',gap:'6px'}}
                  onClick={() => downloadMembersExcel(filteredMembers)}>
                  <i className="fa-solid fa-file-excel"></i> Download Excel ({filteredMembers.length})
                </button>
              </div>

              {/* Sub-tabs */}
              <div style={{display:'flex',gap:'8px',marginBottom:'18px',flexWrap:'wrap'}}>
                {[
                  { id:'all',      label:'All Users',  count: allUsers.length },
                  { id:'students', label:'Guest Users', count: studentUsers.length },
                  { id:'members',  label:'FIP Members', count: paidMembers.length },
                ].map(t => (
                  <button key={t.id} onClick={() => setMemberSubTab(t.id)}
                    style={{
                      padding:'6px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:700,
                      cursor:'pointer', border:'1.5px solid',
                      background: memberSubTab===t.id ? 'var(--blue)' : 'transparent',
                      color:      memberSubTab===t.id ? '#fff'        : 'var(--text-muted)',
                      borderColor:memberSubTab===t.id ? 'var(--blue)' : 'var(--border)',
                      transition:'all 0.15s',
                    }}>
                    {t.label}
                    <span style={{marginLeft:'6px',background:memberSubTab===t.id?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.08)',padding:'1px 7px',borderRadius:'10px'}}>
                      {t.count}
                    </span>
                  </button>
                ))}
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
                <>
                {/* Transparent overlay — closes ⋮ menu when clicking outside */}
                {openActionMenu && (
                  <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setOpenActionMenu(null)}/>
                )}
                
                {/* ── Bulk Email Toolbar ── */}
                {selectedMemberIds.size > 0 && !showEmailCompose && (
                  <div style={{display:'flex',alignItems:'center',gap:'12px',background:'var(--blue)',color:'#fff',padding:'10px 16px',borderRadius:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
                    <span style={{fontWeight:700}}>{selectedMemberIds.size} member{selectedMemberIds.size>1?'s':''} selected</span>
                    <button onClick={() => setShowEmailCompose(true)} style={{background:'var(--orange)',color:'#fff',border:'none',borderRadius:'6px',padding:'7px 16px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                      <i className="fa-solid fa-envelope"></i> Compose & Send Email
                    </button>
                    <button onClick={() => setSelectedMemberIds(new Set())} style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',borderRadius:'6px',padding:'7px 12px',cursor:'pointer'}}>
                      Deselect All
                    </button>
                  </div>
                )}
                {showEmailCompose && (
                  <div style={{background:'var(--off-white)',border:'2px solid var(--blue)',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                      <div style={{fontWeight:800,color:'var(--blue)',fontSize:'15px'}}>
                        <i className="fa-solid fa-envelope" style={{color:'var(--orange)',marginRight:'8px'}}></i>
                        Send Email to {selectedMemberIds.size} member{selectedMemberIds.size>1?'s':''}
                      </div>
                      <button onClick={() => { setShowEmailCompose(false); setEmailSubject(''); setEmailContent(''); }} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'20px'}}>✕</button>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',background:'var(--blue-pale)',padding:'8px 12px',borderRadius:'6px',marginBottom:'14px'}}>
                      💡 Tip: Use <strong>{'{name}'}</strong> in content to personalise each email with the member's name.
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject *</label>
                      <input className="form-input" type="text" placeholder="e.g. Important update from FIP" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Message *</label>
                      <textarea className="form-input" rows={6} style={{resize:'vertical'}}
                        placeholder={'Dear {name},\n\nWrite your message here...\n\nWarm regards,\nFIP Team'}
                        value={emailContent} onChange={e=>setEmailContent(e.target.value)}/>
                    </div>
                    <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                      <button disabled={!emailSubject.trim()||!emailContent.trim()||emailSending}
                        style={{background:'var(--blue)',color:'#fff',border:'none',borderRadius:'8px',padding:'11px 24px',fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',opacity:(!emailSubject.trim()||!emailContent.trim()||emailSending)?.55:1}}
                        onClick={async () => {
                          setEmailSending(true);
                          try {
                            const res = await fetch('/api/send-bulk-email', { method:'POST', headers:{'Content-Type':'application/json'},
                              body: JSON.stringify({ userId:profile?.id, subject:emailSubject, content:emailContent, recipientIds:[...selectedMemberIds] }) });
                            const d = await res.json();
                            if (res.ok) {
                              showToast(`Email sent to ${d.sent} member${d.sent!==1?'s':''}! ${d.failed>0?`(${d.failed} failed)`:''}`);
                              setShowEmailCompose(false); setSelectedMemberIds(new Set()); setEmailSubject(''); setEmailContent('');
                            } else showToast('Error: ' + (d.error||'Send failed'), true);
                          } catch(e) { showToast('Network error: ' + e.message, true); }
                          setEmailSending(false);
                        }}>
                        {emailSending ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending to {selectedMemberIds.size} members…</> : <><i className="fa-solid fa-paper-plane"></i> Send Now</>}
                      </button>
                      <button onClick={() => { setShowEmailCompose(false); setEmailSubject(''); setEmailContent(''); }}
                        style={{background:'transparent',color:'var(--text-muted)',border:'1px solid var(--border)',borderRadius:'8px',padding:'11px 16px',cursor:'pointer',fontWeight:600}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div style={{overflowX:'auto'}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{width:'36px',paddingRight:'8px'}}>
                          <input type="checkbox"
                            title="Select all visible members"
                            checked={filteredMembers.length>0 && filteredMembers.every(m=>selectedMemberIds.has(m.id))}
                            onChange={e => setSelectedMemberIds(e.target.checked ? new Set(filteredMembers.map(m=>m.id)) : new Set())}/>
                        </th>
                        <th>Member</th><th>Profession</th><th>Role</th><th>Membership</th><th>Joined</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m,i) => (
                        <tr key={i} style={{background:selectedMemberIds.has(m.id)?'rgba(26,60,110,0.04)':undefined}}>
                          <td><input type="checkbox" checked={selectedMemberIds.has(m.id)}
                            onChange={e => setSelectedMemberIds(prev => { const n=new Set(prev); e.target.checked?n.add(m.id):n.delete(m.id); return n; })}/></td>
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
                              background:m.role==='admin'?'rgba(242,101,34,0.12)':
                                m.account_type==='fip_member'||m.membership_status==='Active'?'rgba(34,197,94,0.1)':
                                ['guest_user','student'].includes(m.account_type)?'rgba(107,114,128,0.1)':'var(--blue-tint)',
                              color:m.role==='admin'?'var(--orange-dark)':
                                m.account_type==='fip_member'||m.membership_status==='Active'?'#15803D':
                                ['guest_user','student'].includes(m.account_type)?'#6B7280':'var(--blue-mid)',
                              border:m.role==='admin'?'1px solid #F5C4A8':
                                m.account_type==='fip_member'||m.membership_status==='Active'?'1px solid #86EFAC':
                                ['guest_user','student'].includes(m.account_type)?'1px solid #D1D5DB':'1px solid #C0CDE8'}}>
                              <i className={`fa-solid ${m.role==='admin'?'fa-shield-halved':m.membership_status==='Active'||m.account_type==='fip_member'?'fa-star':['guest_user','student'].includes(m.account_type)?'fa-user-clock':'fa-user'}`} style={{fontSize:'9px'}}></i>
                              {m.role==='admin'?'Admin':
                                m.account_type==='fip_member'||m.membership_status==='Active'?'FIP Member':
                                ['guest_user','student'].includes(m.account_type)?'Guest User':'Member'}
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
                          <td style={{position:'relative'}}>
                            {/* ⋮ three-dot trigger */}
                            <button
                              onClick={e => { e.stopPropagation(); setOpenActionMenu(openActionMenu === m.id ? null : m.id); }}
                              style={{
                                width:'32px', height:'32px', borderRadius:'8px',
                                background: openActionMenu===m.id ? 'var(--blue-pale)' : 'var(--off-white)',
                                border:'1px solid var(--border)', cursor:'pointer',
                                fontSize:'16px', fontWeight:900, color:'var(--blue)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                lineHeight:1, letterSpacing:'0px',
                              }}
                              title="Actions"
                            >⋮</button>

                            {/* Dropdown */}
                            {openActionMenu === m.id && (
                              <div style={{
                                position:'absolute', right:0, top:'38px', zIndex:200,
                                background:'var(--surface)', border:'1px solid var(--border)',
                                borderRadius:'10px', boxShadow:'0 6px 24px rgba(0,0,0,0.13)',
                                minWidth:'190px', overflow:'hidden',
                              }}>
                                {/* View */}
                                <button onClick={() => { openMemberDetail(m); setOpenActionMenu(null); }}
                                  style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--blue)',fontWeight:600}}>
                                  <i className="fa-solid fa-eye" style={{width:'14px',color:'var(--blue)'}}></i> View Details
                                </button>
                                <div style={{height:'1px',background:'var(--border)',margin:'0 10px'}}/>

                                {/* Role toggle */}
                                {m.role !== 'admin'
                                  ? <button onClick={() => { handleRoleChange(m.id,'admin'); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--orange-dark)',fontWeight:600}}>
                                      <i className="fa-solid fa-shield-halved" style={{width:'14px',color:'var(--orange)'}}></i> Make Admin
                                    </button>
                                  : <button onClick={() => { handleRoleChange(m.id,'member'); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#C0392B',fontWeight:600}}>
                                      <i className="fa-solid fa-user" style={{width:'14px',color:'#C0392B'}}></i> Make Member
                                    </button>
                                }

                                {/* Status toggle */}
                                {m.membership_status !== 'Active'
                                  ? <button onClick={() => { handleStatusChange(m.id,'Active'); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--green)',fontWeight:600}}>
                                      <i className="fa-solid fa-circle-check" style={{width:'14px',color:'var(--green)'}}></i> Activate
                                    </button>
                                  : <button onClick={() => { handleStatusChange(m.id,'Inactive'); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--text-muted)',fontWeight:600}}>
                                      <i className="fa-solid fa-ban" style={{width:'14px'}}></i> Deactivate
                                    </button>
                                }
                                <div style={{height:'1px',background:'var(--border)',margin:'0 10px'}}/>

                                {/* Committee */}
                                {!m.is_committee_member
                                  ? <button onClick={() => { setCommitteeModal(m); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#8B6000',fontWeight:600}}>
                                      <i className="fa-solid fa-crown" style={{width:'14px',color:'#DAA520'}}></i> Assign Committee
                                    </button>
                                  : <button onClick={() => { handleRemoveCommittee(m.id); setOpenActionMenu(null); }}
                                      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#8B6000',fontWeight:600}}>
                                      <i className="fa-solid fa-crown" style={{width:'14px',color:'#DAA520'}}></i> Remove Committee
                                    </button>
                                }
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
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
              {/* Search + filter */}
              <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
                <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search events by title, location…"
                    value={eventSearch} onChange={e=>setEventSearch(e.target.value)}/>
                </div>
                <select className="form-select" style={{width:'140px'}} value={eventTypeFilter} onChange={e=>setEventTypeFilter(e.target.value)}>
                  <option value="All">All Types</option>
                  <option>Physical</option><option>Online</option><option>Hybrid</option>
                </select>
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
                    <button className="admin-btn admin-btn-orange" onClick={() => loadRsvps(ev)}><i className="fa-solid fa-users"></i> Registrations</button>
                    <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openEventModal(ev)}><i className="fa-solid fa-pen"></i> Edit</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => deleteEvent(ev.id)}><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ EVENT REGISTRATIONS VIEW ═══ */}
          {tab === 'events' && rsvpEventView && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                <button onClick={() => setRsvpEventView(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}><i className="fa-solid fa-arrow-left"></i></button>
                <span style={{flex:1}}>Registrations: <strong>{rsvpEventView.title}</strong></span>
                {eventRsvps.length > 0 && (
                  <button
                    style={{background:'#217346',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 14px',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
                    onClick={() => {
                      const hdrs = ['Name','Email','Phone','Profession','Designation','Organisation','ICAI No.','City','Volunteer','Registered On'];
                      const rows = eventRsvps.map(r => [
                        r.full_name||'', r.email||'', r.phone||'',
                        r.profession||'', r.designation||'', r.organisation||'',
                        r.icai_membership_no||'', r.city||'',
                        r.is_volunteer?'Yes':'No',
                        r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '',
                      ]);
                      const csv = [hdrs,...rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
                      a.download = `FIP_Event_${(rsvpEventView.title||'').replace(/\s+/g,'_')}_Registrations.csv`;
                      a.click();
                    }}>
                    <i className="fa-solid fa-file-excel"></i> Download Excel ({eventRsvps.length})
                  </button>
                )}
                {/* Send update links to incomplete registrants */}
                {(() => {
                  const incomplete = eventRsvps.filter(r =>
                    r.profession === 'Chartered Accountant' && !r.icai_membership_no
                  );
                  if (!incomplete.length) return null;
                  return (
                    <button
                      style={{background:'var(--orange)',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 14px',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
                      onClick={async () => {
                        if (!window.confirm(`Send update link emails to ${incomplete.length} incomplete registrant${incomplete.length>1?'s':''}?`)) return;
                        const res = await fetch('/api/send-update-links', {
                          method:'POST', headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({ adminId:profile?.id, eventId:rsvpEventView.id, rsvpIds:incomplete.map(r=>r.id) }),
                        });
                        const d = await res.json();
                        if (res.ok) showToast(`✅ Sent update links to ${d.sent} registrant${d.sent!==1?'s':''}!`);
                        else showToast('Error: ' + (d.error||'Send failed'), true);
                      }}>
                      <i className="fa-solid fa-envelope"></i> Send Update Links ({incomplete.length} incomplete)
                    </button>
                  );
                })()}
              </div>
              {rsvpLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…</div>
              ) : eventRsvps.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-users" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>No registrations yet.
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
              <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
                <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search by title, category, instructor…"
                    value={courseSearch} onChange={e=>setCourseSearch(e.target.value)}/>
                </div>
                <select className="form-select" style={{width:'140px'}} value={courseStatusFilter} onChange={e=>setCourseStatusFilter(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="published">Published</option><option value="draft">Draft</option>
                </select>
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
              <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                <button onClick={() => setAdminCourseView(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <span style={{flex:1}}>Registrations: <strong>{adminCourseView.title}</strong></span>
                <button className="btn btn-sm" style={{background:'#217346',color:'#fff',border:'none',fontWeight:700,display:'flex',alignItems:'center',gap:'6px'}}
                  onClick={() => downloadEnrollmentsExcel(adminCourseView.title, courseEnrollments)}
                  disabled={courseEnrollments.length === 0}>
                  <i className="fa-solid fa-file-excel"></i> Download CSV {courseEnrollments.length > 0 && `(${courseEnrollments.length})`}
                </button>
              </div>
              {courseEnrollmentsLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…</div>
              ) : courseEnrollments.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-users" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>No registrations yet.
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table className="dboard-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Registered On</th></tr></thead>
                    <tbody>
                      {courseEnrollments.map((e,i) => (
                        <tr key={i}>
                          <td>
                            <div className="dboard-table-name">{e.full_name || '—'}</div>
                          </td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{e.email || '—'}</td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{e.phone || '—'}</td>
                          <td>
                            <span className={`dboard-pill ${e.status==='attended'?'pill-green':'pill-orange'}`}>
                              {e.status || 'registered'}
                            </span>
                          </td>
                          <td className="dboard-table-muted" style={{fontSize:'12px'}}>{e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ HERO SLIDES ═══ */}
          {tab === 'slides' && (
            <div>
              <h2 className="admin-page-title">Hero Slides</h2>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>
                Slide 1 (the main FIP hero) is fixed. Add image slides below — they appear after it in the carousel.
              </p>

              {/* ── Add / Edit Slide Form ── */}
              <div className="admin-form-card" style={{marginBottom:'28px'}}>
                <div className="admin-form-title" style={{marginBottom:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>
                    <i className={`fa-solid ${editingSlideId ? 'fa-pen' : 'fa-plus-circle'}`} style={{color:'var(--orange)',marginRight:'8px'}}></i>
                    {editingSlideId ? 'Edit Slide' : 'Add New Slide'}
                  </span>
                  {editingSlideId && (
                    <button onClick={() => { setEditingSlideId(null); setSlideForm(emptySlide); }}
                      style={{fontSize:'12px',color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer'}}>
                      ✕ Cancel Edit
                    </button>
                  )}
                </div>

                {/* Image URL + preview */}
                <div className="form-group" style={{marginBottom:'12px'}}>
                  <label className="form-label">Image URL <span style={{color:'var(--orange)'}}>*</span></label>
                  <input className="form-input" placeholder="https://… or /image.jpg"
                    value={slideForm.image_url}
                    onChange={e => setSlideForm(f => ({...f, image_url: e.target.value}))}/>
                  {slideForm.image_url && (
                    <div style={{marginTop:'10px',borderRadius:'10px',overflow:'hidden',height:'140px',background:'#000'}}>
                      <img src={slideForm.image_url} alt="preview" onError={e => e.target.style.display='none'}
                        style={{width:'100%',height:'100%',objectFit:'cover',opacity:.85}}/>
                    </div>
                  )}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                  <div className="form-group">
                    <label className="form-label">Badge text <span style={{fontSize:'11px',color:'var(--text-muted)'}}>(top label)</span></label>
                    <input className="form-input" placeholder="e.g. Community Events"
                      value={slideForm.badge}
                      onChange={e => setSlideForm(f => ({...f, badge: e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tag <span style={{fontSize:'11px',color:'var(--text-muted)'}}>(small pill)</span></label>
                    <input className="form-input" placeholder="e.g. Coming Soon"
                      value={slideForm.tag}
                      onChange={e => setSlideForm(f => ({...f, tag: e.target.value}))}/>
                  </div>
                </div>

                <div className="form-group" style={{marginBottom:'12px'}}>
                  <label className="form-label">Title <span style={{color:'var(--orange)'}}>*</span></label>
                  <input className="form-input" placeholder="Main headline for this slide"
                    value={slideForm.title}
                    onChange={e => setSlideForm(f => ({...f, title: e.target.value}))}/>
                </div>

                <div className="form-group" style={{marginBottom:'12px'}}>
                  <label className="form-label">Subtitle</label>
                  <input className="form-input" placeholder="Sub-headline line"
                    value={slideForm.subtitle}
                    onChange={e => setSlideForm(f => ({...f, subtitle: e.target.value}))}/>
                </div>

                <div className="form-group" style={{marginBottom:'12px'}}>
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} placeholder="Short description shown on the slide"
                    value={slideForm.description}
                    onChange={e => setSlideForm(f => ({...f, description: e.target.value}))}
                    style={{minHeight:'70px'}}/>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px',gap:'12px',marginBottom:'20px'}}>
                  <div className="form-group">
                    <label className="form-label">Button Label</label>
                    <input className="form-input" placeholder="e.g. Join FIP"
                      value={slideForm.btn_label}
                      onChange={e => setSlideForm(f => ({...f, btn_label: e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Button Action</label>
                    <select className="form-select" value={slideForm.btn_action}
                      onChange={e => setSlideForm(f => ({...f, btn_action: e.target.value}))}>
                      {SLIDE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Order</label>
                    <input className="form-input" type="number" min="0" placeholder="0"
                      value={slideForm.sort_order}
                      onChange={e => setSlideForm(f => ({...f, sort_order: Number(e.target.value)}))}/>
                  </div>
                </div>

                <div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
                  <button className="btn btn-primary"
                    disabled={slideSaving || !slideForm.image_url.trim() || !slideForm.title.trim()}
                    onClick={async () => {
                      setSlideSaving(true);
                      const payload = {
                        image_url: slideForm.image_url.trim(), badge: slideForm.badge.trim()||null,
                        title: slideForm.title.trim(), subtitle: slideForm.subtitle.trim()||null,
                        description: slideForm.description.trim()||null, btn_label: slideForm.btn_label.trim()||null,
                        btn_action: slideForm.btn_action, tag: slideForm.tag.trim()||null,
                        sort_order: slideForm.sort_order,
                      };
                      if (editingSlideId) {
                        const { data, error } = await supabase.from('slides').update(payload).eq('id', editingSlideId).select();
                        setSlideSaving(false);
                        if (error) { showToast('Error: '+error.message, true); return; }
                        setSlides(prev => prev.map(s => s.id===editingSlideId ? data[0] : s).sort((a,b)=>a.sort_order-b.sort_order));
                        setEditingSlideId(null); setSlideForm(emptySlide); showToast('Slide updated!');
                      } else {
                        const { data, error } = await supabase.from('slides').insert([{...payload, is_active:true}]).select();
                        setSlideSaving(false);
                        if (error) { showToast('Error: '+error.message, true); return; }
                        setSlides(prev => [...prev, data[0]].sort((a,b)=>a.sort_order-b.sort_order));
                        setSlideForm(emptySlide); showToast('Slide added!');
                      }
                    }}>
                    {slideSaving
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</>
                      : editingSlideId
                      ? <><i className="fa-solid fa-check"></i> Update Slide</>
                      : <><i className="fa-solid fa-plus"></i> Add Slide</>}
                  </button>
                  <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'var(--text-muted)',cursor:'pointer'}}>
                    <input type="checkbox" checked={slideForm.is_active}
                      onChange={e => setSlideForm(f => ({...f, is_active: e.target.checked}))}/>
                    Active (visible on homepage)
                  </label>
                </div>
              </div>

              {/* ── Existing Slides List ── */}
              <div className="admin-form-card">
                <div className="admin-form-title" style={{marginBottom:'16px'}}>
                  Current Slides
                  <span style={{fontSize:'12px',fontWeight:400,color:'var(--text-muted)',marginLeft:'8px'}}>
                    ({slides.length} slides + 1 fixed hero)
                  </span>
                </div>

                {slidesLoading ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                    <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'22px',display:'block',marginBottom:'8px'}}></i>
                    Loading slides…
                  </div>
                ) : slides.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                    <i className="fa-solid fa-image" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                    No slides added yet. Add one above.
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    {slides.map((s, idx) => (
                      <div key={s.id} style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--off-white)',borderRadius:'10px',padding:'12px 14px',border:'1px solid var(--border)'}}>

                        {/* Thumbnail */}
                        <div style={{width:'90px',height:'56px',borderRadius:'8px',overflow:'hidden',flexShrink:0,background:'#111'}}>
                          <img src={s.image_url} alt={s.title}
                            onError={e => { e.target.style.display='none'; }}
                            style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </div>

                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'14px',color:'var(--blue)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {idx + 2}. {s.title}
                          </div>
                          <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                            {s.badge && <span><i className="fa-solid fa-tag" style={{marginRight:'3px'}}></i>{s.badge}</span>}
                            {s.btn_action && <span><i className="fa-solid fa-arrow-pointer" style={{marginRight:'3px'}}></i>{s.btn_action}</span>}
                            <span>Order: {s.sort_order}</span>
                          </div>
                        </div>

                        {/* Active toggle */}
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'var(--text-muted)',cursor:'pointer',flexShrink:0}}>
                          <input type="checkbox" checked={s.is_active}
                            onChange={async (e) => {
                              const checked = e.target.checked;
                              await supabase.from('slides').update({ is_active: checked }).eq('id', s.id);
                              setSlides(prev => prev.map(x => x.id===s.id ? {...x, is_active: checked} : x));
                            }}/>
                          {s.is_active ? 'Active' : 'Hidden'}
                        </label>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingSlideId(s.id);
                            setSlideForm({
                              image_url:   s.image_url || '',
                              badge:       s.badge || '',
                              title:       s.title || '',
                              subtitle:    s.subtitle || '',
                              description: s.description || '',
                              btn_label:   s.btn_label || '',
                              btn_action:  s.btn_action || 'join',
                              tag:         s.tag || '',
                              sort_order:  s.sort_order || 0,
                              is_active:   s.is_active,
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{background:'var(--blue-pale)',color:'var(--blue)',border:'1px solid #C0CDE8',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',flexShrink:0,fontSize:'13px'}}>
                          <i className="fa-solid fa-pen"></i>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete slide "${s.title}"?`)) return;
                            await supabase.from('slides').delete().eq('id', s.id);
                            setSlides(prev => prev.filter(x => x.id !== s.id));
                          }}
                          style={{background:'#FEE2E2',color:'#C0392B',border:'1px solid #F5BDBA',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',flexShrink:0,fontSize:'13px'}}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ PAYMENTS ═══ */}
          {tab === 'payments' && (() => {
            const filtPay = allPayments
              .filter(p => paymentStatusFilter === 'All' || p.status === paymentStatusFilter)
              .filter(p => !dPaySearch || [p.profiles?.full_name, p.profiles?.email, p.item_name, p.razorpay_payment_id].some(v => v?.toLowerCase().includes(dPaySearch.toLowerCase())));
            return (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'14px'}}>
                <span>All Payments
                  <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400,marginLeft:'8px'}}>
                    ({filtPay.length})
                  </span>
                </span>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{fontSize:'13px',color:'var(--green)',fontWeight:700}}>
                    ₹{filtPay.filter(p=>p.status==='paid').reduce((s,p)=>s+(Number(p.total_amount)||0),0).toLocaleString('en-IN')} collected
                  </span>
                  {allPayments.length > 0 && (
                    <button className="btn btn-sm"
                      style={{background:'#217346',color:'#fff',border:'none',fontWeight:700,display:'flex',alignItems:'center',gap:'6px'}}
                      onClick={() => downloadPaymentsExcel(filtPay)}>
                      <i className="fa-solid fa-file-excel"></i> Download Excel ({filtPay.length})
                    </button>
                  )}
                </div>
              </div>
              {/* Search + Status filter */}
              <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
                <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search by name, email, item, transaction ID…"
                    value={paymentSearch} onChange={e=>setPaymentSearch(e.target.value)}/>
                </div>
                <select className="form-select" style={{width:'140px'}} value={paymentStatusFilter}
                  onChange={e=>setPaymentStatusFilter(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {allPaymentsLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading payments…
                </div>
              ) : allPayments.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-indian-rupee-sign" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No payments recorded yet.
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table className="dboard-table">
                    <thead>
                      <tr><th>Member</th><th>Phone</th><th>Item / Plan</th><th>Amount</th><th>Transaction ID</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filtPay.map((p,i) => (
                        <tr key={i}>
                          <td>
                            <div className="dboard-table-name">{p.profiles?.full_name || '—'}</div>
                            <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{p.profiles?.email || ''}</div>
                          </td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{p.profiles?.phone || '—'}</td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {p.item_name || '—'}
                          </td>
                          <td>
                            <span style={{color:'var(--orange)',fontWeight:700}}>₹{Number(p.total_amount||0).toLocaleString('en-IN')}</span>
                          </td>
                          <td style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'monospace'}}>
                            {p.razorpay_payment_id || '—'}
                          </td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                          </td>
                          <td>
                            <span className={`dboard-pill ${p.status==='paid'?'pill-green':p.status==='failed'?'pill-red':'pill-orange'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            );
          })()}

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
              {/* Search bar */}
              <div className="search-wrap" style={{marginBottom:'16px'}}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="search" placeholder="Search by name, profession, content…"
                  value={testiSearch} onChange={e=>{setTestiSearch(e.target.value);setTestiPage(1);}}/>
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
              <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
                <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search by title, company, location…"
                    value={jobSearch} onChange={e=>setJobSearch(e.target.value)}/>
                </div>
                <select className="form-select" style={{width:'150px'}} value={jobTypeFilter} onChange={e=>setJobTypeFilter(e.target.value)}>
                  <option value="All">All Types</option>
                  <option>Full-time</option><option>Part-time</option>
                  <option>Contract</option><option>Internship</option><option>Freelance</option>
                </select>
              </div>

              {/* ── Member submissions pending approval ── */}
              {jobs.filter(j => j.approval_status === 'pending').length > 0 && (
                <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:'var(--radius-md)',padding:'14px 18px',marginBottom:'20px'}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#92400E',marginBottom:'10px',display:'flex',alignItems:'center',gap:'7px'}}>
                    <i className="fa-solid fa-clock" style={{color:'#D97706'}}></i>
                    {jobs.filter(j=>j.approval_status==='pending').length} Member Job Post{jobs.filter(j=>j.approval_status==='pending').length>1?'s':''} Awaiting Approval
                  </div>
                  {jobs.filter(j => j.approval_status === 'pending').map(job => (
                    <div key={job.id} style={{background:'#fff',border:'1px solid #FCD34D',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'200px'}}>
                        <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'3px'}}>{job.title}</div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'4px'}}>
                          {job.company} · {job.location} · {job.job_type}
                        </div>
                        {(job.poster_name || job.poster_email) && (
                          <div style={{fontSize:'12px',color:'#92400E',fontWeight:600}}>
                            <i className="fa-solid fa-user" style={{marginRight:'4px'}}></i>
                            Posted by: {job.poster_name || job.poster_email}
                          </div>
                        )}
                        {job.description && (
                          <p style={{fontSize:'12px',color:'var(--text-muted)',margin:'6px 0 0',lineHeight:1.6}}>
                            {job.description.slice(0,150)}{job.description.length>150?'…':''}
                          </p>
                        )}
                      </div>
                      <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap'}}>
                        <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none'}}
                          onClick={async () => {
                            const { error } = await supabase.rpc('admin_approve_job', { p_job_id: job.id });
                            if (!error) setJobs(prev => prev.map(j => j.id===job.id ? {...j,approval_status:'approved',status:'active'} : j));
                            else showToast('Error: '+error.message, true);
                          }}>
                          <i className="fa-solid fa-check"></i> Approve
                        </button>
                        <button className="admin-btn" style={{background:'#FFF0EE',color:'#C0392B',border:'1px solid #F5BDBA'}}
                          onClick={async () => {
                            const note = window.prompt('Reason for rejection (shown to member):');
                            if (note === null) return;
                            const { error } = await supabase.rpc('admin_reject_job', { p_job_id: job.id, p_note: note });
                            if (!error) setJobs(prev => prev.map(j => j.id===job.id ? {...j,approval_status:'rejected',rejection_note:note} : j));
                          }}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
              {/* Search bar */}
              <div className="search-wrap" style={{marginBottom:'16px'}}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="search" placeholder="Search by title, category…"
                  value={blogSearch} onChange={e=>{setBlogSearch(e.target.value);setBlogPage(1);}}/>
              </div>

              {blogLoading ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
                </div>
              ) : (() => { const filtBlog = blogPosts.filter(p=>p.status===blogFilter && (!dBlogSearch || p.title?.toLowerCase().includes(dBlogSearch.toLowerCase()) || p.category?.toLowerCase().includes(dBlogSearch.toLowerCase()))); return filtBlog.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-newspaper" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
                  No {blogFilter} blog posts.
                </div>
              ) : filtBlog.map(post => (
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
              ));
              })()}
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

          {/* ═══ CERTIFICATES ═══ */}
          {tab === 'certificates' && (
            <div>
              <h2 className="admin-page-title">Certificate Generation</h2>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>
                Upload an Excel file with participant names and emails, choose a template, and send certificates in one click.
              </p>

              {/* ── STEP 1: Select Course ── */}
              <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)',padding:'20px',marginBottom:'16px'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'var(--blue)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800}}>1</div>
                  Select Course
                </div>
                <select className="form-select" style={{maxWidth:'480px'}} value={certCourseId} onChange={e => loadCertCourse(e.target.value)}>
                  <option value="">— Select a course —</option>
                  {certCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}{c.event_date ? ' (' + new Date(c.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) + ')' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── STEP 2: Upload Excel ── */}
              <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'20px',marginBottom:'16px'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'var(--blue)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800}}>2</div>
                  Upload Recipients Excel
                </div>

                <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',marginBottom:'12px'}}>
                  <label style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'#217346',color:'#fff',padding:'10px 18px',borderRadius:'var(--radius-md)',cursor:'pointer',fontSize:'13px',fontWeight:700,flexShrink:0}}>
                    <i className="fa-solid fa-file-excel"></i>
                    {certExcelName ? 'Change File' : 'Upload Excel / CSV'}
                    <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCertExcelName(file.name);
                        setCertRecipients([]);
                        const parsed = await parseExcelFile(file);
                        setCertRecipients(parsed);
                        if (parsed.length) showToast(parsed.length + ' recipients loaded from file.');
                      }}/>
                  </label>
                  {certExcelName && (
                    <span style={{fontSize:'13px',color:'var(--text-muted)'}}>
                      <i className="fa-solid fa-file-excel" style={{color:'#217346',marginRight:'5px'}}></i>
                      {certExcelName}
                    </span>
                  )}
                  {certRecipients.length > 0 && (
                    <span style={{fontSize:'13px',fontWeight:700,color:'var(--green)',display:'flex',alignItems:'center',gap:'5px'}}>
                      <i className="fa-solid fa-circle-check"></i> {certRecipients.length} recipients loaded
                    </span>
                  )}
                </div>

                <div style={{fontSize:'11px',color:'var(--text-muted)',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:'8px',padding:'10px 12px',display:'flex',gap:'8px'}}>
                  <i className="fa-solid fa-circle-info" style={{color:'#92400E',flexShrink:0,marginTop:'1px'}}></i>
                  <span>Your Excel file must have a <strong>Name</strong> column and an <strong>Email</strong> column (header row required). Both .xlsx and .csv formats are supported.</span>
                </div>

                {/* Recipients preview table */}
                {certRecipients.length > 0 && (
                  <div style={{marginTop:'14px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',marginBottom:'8px'}}>Preview — first 5 recipients:</div>
                    <div style={{overflowX:'auto'}}>
                      <table className="dboard-table" style={{fontSize:'12px'}}>
                        <thead><tr><th>#</th><th>Name</th><th>Email</th></tr></thead>
                        <tbody>
                          {certRecipients.slice(0,5).map((r,i) => (
                            <tr key={i}>
                              <td style={{color:'var(--text-muted)',width:'36px'}}>{i+1}</td>
                              <td style={{fontWeight:600}}>{r.name}</td>
                              <td style={{color:'var(--text-muted)'}}>{r.email}</td>
                            </tr>
                          ))}
                          {certRecipients.length > 5 && (
                            <tr>
                              <td colSpan={3} style={{textAlign:'center',color:'var(--text-muted)',fontStyle:'italic',padding:'8px'}}>
                                … and {certRecipients.length - 5} more
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button style={{marginTop:'8px',fontSize:'11px',color:'#C0392B',background:'none',border:'none',cursor:'pointer',padding:0}}
                      onClick={() => { setCertRecipients([]); setCertExcelName(''); }}>
                      <i className="fa-solid fa-xmark" style={{marginRight:'4px'}}></i>Clear recipients
                    </button>
                  </div>
                )}
              </div>

              {/* ── STEP 3: Choose Template ── */}
              <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'20px',marginBottom:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'var(--blue)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800}}>3</div>
                  Choose Certificate Template
                </div>

                {/* Default templates grid */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'12px',marginBottom:'16px'}}>
                  {DEFAULT_TEMPLATES.map(t => (
                    <div key={t.id}
                      onClick={() => setCertTemplateMode(t.id)}
                      style={{
                        border: certTemplateMode===t.id ? '2px solid var(--orange)' : '2px solid var(--border)',
                        borderRadius:'10px', overflow:'hidden', cursor:'pointer',
                        transition:'border-color .15s',
                        boxShadow: certTemplateMode===t.id ? '0 0 0 3px rgba(242,97,34,0.15)' : 'none',
                      }}>
                      {/* Mini certificate preview */}
                      <div style={{height:'110px',background:t.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px',gap:'5px',position:'relative'}}>
                        <div style={{width:'90%',height:'2px',background:t.accent,opacity:.7,borderRadius:'1px'}}/>
                        <div style={{fontSize:'8px',fontWeight:700,color:t.text,fontFamily:'Georgia,serif',textAlign:'center',letterSpacing:'.5px'}}>
                          CERTIFICATE OF COMPLETION
                        </div>
                        <div style={{fontSize:'11px',fontWeight:700,color:t.accent,fontFamily:'Georgia,serif',fontStyle:'italic'}}>
                          Recipient Name
                        </div>
                        <div style={{fontSize:'7px',color:t.text,opacity:.7,textAlign:'center',fontFamily:'Georgia,serif'}}>Course Title</div>
                        <div style={{width:'90%',height:'1px',background:t.accent,opacity:.4,borderRadius:'1px'}}/>
                        {certTemplateMode===t.id && (
                          <div style={{position:'absolute',top:'6px',right:'6px',width:'18px',height:'18px',borderRadius:'50%',background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="fa-solid fa-check" style={{fontSize:'9px',color:'#fff'}}></i>
                          </div>
                        )}
                      </div>
                      <div style={{padding:'8px 10px',background:'var(--surface)',borderTop:'1px solid var(--border)'}}>
                        <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)'}}>{t.label}</div>
                        <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>{t.desc}</div>
                      </div>
                    </div>
                  ))}

                  {/* Custom upload option */}
                  <div
                    onClick={() => setCertTemplateMode('custom')}
                    style={{
                      border: certTemplateMode==='custom' ? '2px solid var(--orange)' : '2px dashed var(--border)',
                      borderRadius:'10px', overflow:'hidden', cursor:'pointer',
                      transition:'border-color .15s',
                      boxShadow: certTemplateMode==='custom' ? '0 0 0 3px rgba(242,97,34,0.15)' : 'none',
                    }}>
                    <div style={{height:'110px',background:'var(--blue-pale)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',position:'relative'}}>
                      <i className="fa-solid fa-upload" style={{fontSize:'22px',color:'var(--blue)',opacity:.6}}></i>
                      <span style={{fontSize:'11px',color:'var(--blue)',fontWeight:600}}>Custom Template</span>
                      {certTemplateMode==='custom' && (
                        <div style={{position:'absolute',top:'6px',right:'6px',width:'18px',height:'18px',borderRadius:'50%',background:'var(--orange)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <i className="fa-solid fa-check" style={{fontSize:'9px',color:'#fff'}}></i>
                        </div>
                      )}
                    </div>
                    <div style={{padding:'8px 10px',background:'var(--surface)',borderTop:'1px solid var(--border)'}}>
                      <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)'}}>Custom Image</div>
                      <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>Upload your own design</div>
                    </div>
                  </div>
                </div>

                {/* Custom template upload — only shown when custom is selected */}
                {certTemplateMode === 'custom' && (
                  <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'10px',padding:'16px'}}>
                    <label style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'var(--blue)',color:'#fff',padding:'10px 18px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:700}}>
                      <i className="fa-solid fa-upload"></i>
                      {certTemplateUrl && certTemplateUrl !== 'uploading' ? 'Change Template' : 'Upload Template Image'}
                      <input type="file" accept="image/png,image/jpeg,image/jpg" style={{display:'none'}}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCertTemplateUrl('uploading');
                          const fileName = 'templates/' + Date.now() + '_' + file.name.replace(/[^a-z0-9._]/gi,'_');
                          const { error } = await supabase.storage.from('certificates').upload(fileName, file, { upsert:true });
                          if (error) { showToast('Upload failed: ' + error.message, true); setCertTemplateUrl(''); return; }
                          const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(fileName);
                          setCertTemplateUrl(urlData.publicUrl);
                          showToast('Template uploaded!');
                        }}/>
                    </label>
                    {certTemplateUrl === 'uploading' && (
                      <span style={{marginLeft:'12px',fontSize:'13px',color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin" style={{marginRight:'5px'}}></i>Uploading…</span>
                    )}
                    {certTemplateUrl && certTemplateUrl !== 'uploading' && (
                      <div style={{marginTop:'12px',position:'relative',display:'inline-block'}}>
                        <img src={certTemplateUrl} alt="Template preview"
                          style={{maxWidth:'100%',maxHeight:'200px',objectFit:'contain',border:'1px solid var(--border)',borderRadius:'8px',display:'block'}}
                          onError={e=>e.target.style.display='none'}/>
                        <button onClick={() => setCertTemplateUrl('')}
                          style={{position:'absolute',top:'5px',right:'5px',background:'rgba(0,0,0,0.5)',color:'#fff',border:'none',borderRadius:'50%',width:'22px',height:'22px',cursor:'pointer',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                      </div>
                    )}
                    <div style={{marginTop:'10px',fontSize:'11px',color:'#5B4500',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:'6px',padding:'8px 10px'}}>
                      <i className="fa-solid fa-circle-info" style={{marginRight:'5px'}}></i>
                      Leave blank spaces at ~52% (name), ~61% (course), ~73% (date) from the top of your template.
                    </div>
                  </div>
                )}
              </div>

              {/* ── GENERATE BUTTON ── */}
              <div style={{marginBottom:'24px'}}>
                <button className="btn btn-primary"
                  onClick={generateCertificates}
                  disabled={certGenerating || !certCourseId || !certRecipients.length || (certTemplateMode==='custom' && (!certTemplateUrl||certTemplateUrl==='uploading'))}
                  style={{fontSize:'14px',padding:'13px 28px'}}>
                  {certGenerating
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating &amp; Emailing…</>
                    : <><i className="fa-solid fa-certificate"></i> Generate &amp; Email Certificates ({certRecipients.length})</>
                  }
                </button>
                {!certCourseId && <span style={{marginLeft:'12px',fontSize:'12px',color:'var(--text-muted)'}}>Select a course first.</span>}
                {certCourseId && !certRecipients.length && <span style={{marginLeft:'12px',fontSize:'12px',color:'var(--text-muted)'}}>Upload an Excel file with recipients.</span>}
              </div>

              {/* Result */}
              {certResult && (
                <div style={{background:certResult.failed===0?'#ECFDF5':'#FEF3C7',border:`1px solid ${certResult.failed===0?'#6EE7B7':'#FCD34D'}`,borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'24px'}}>
                  <div style={{fontSize:'14px',fontWeight:700,color:certResult.failed===0?'var(--green)':'#92400E',marginBottom:'8px'}}>
                    {certResult.failed===0
                      ? <><i className="fa-solid fa-circle-check" style={{marginRight:'6px'}}></i>All certificates sent successfully!</>
                      : <><i className="fa-solid fa-triangle-exclamation" style={{marginRight:'6px'}}></i>Partially completed</>
                    }
                  </div>
                  <div style={{fontSize:'13px',color:'var(--text-muted)',display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <span>✅ Sent: <strong>{certResult.generated}</strong></span>
                    <span>❌ Failed: <strong>{certResult.failed}</strong></span>
                    <span>Total: <strong>{certResult.total}</strong></span>
                  </div>
                  {certResult.results?.filter(r=>!r.success).length > 0 && (
                    <div style={{marginTop:'10px',fontSize:'12px',color:'#C0392B'}}>
                      {certResult.results.filter(r=>!r.success).map((r,i) => (
                        <div key={i}><i className="fa-solid fa-xmark" style={{marginRight:'4px'}}></i>{r.name} ({r.email}) — {r.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Issued Certificates List */}
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'12px'}}>
                Issued Certificates
                <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400,marginLeft:'8px'}}>({certList.length})</span>
              </div>
              {certList.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-certificate" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  No certificates issued yet.
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table className="dboard-table">
                    <thead><tr><th>Recipient</th><th>Email</th><th>Course</th><th>Sent</th><th>Certificate</th></tr></thead>
                    <tbody>
                      {certList.slice(0,50).map((c,i) => (
                        <tr key={i}>
                          <td><div className="dboard-table-name">{c.recipient_name}</div></td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{c.recipient_email}</td>
                          <td style={{fontSize:'12px',color:'var(--text-muted)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.course_title || '—'}</td>
                          <td style={{textAlign:'center'}}>
                            {c.email_sent
                              ? <span style={{color:'var(--green)',fontWeight:700,fontSize:'12px'}}><i className="fa-solid fa-check"></i></span>
                              : <span style={{color:'var(--text-light)',fontSize:'12px'}}>—</span>
                            }
                          </td>
                          <td>
                            {c.certificate_url
                              ? <a href={c.certificate_url} target="_blank" rel="noopener" style={{fontSize:'12px',color:'var(--blue)',fontWeight:600,textDecoration:'none'}}>
                                  <i className="fa-solid fa-download" style={{marginRight:'4px'}}></i>Download
                                </a>
                              : <span style={{fontSize:'12px',color:'var(--text-light)'}}>—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ MEMBERSHIP SETTINGS ═══ */}
          {tab === 'membership_settings' && (
            <div className="admin-form-card">
              <div className="admin-form-title">Membership Plan Settings</div>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>
                Configure membership pricing, validity period and membership dates. These values are used across the site.
              </p>

              {memSettingsLoading ? (
                <div style={{textAlign:'center',padding:'40px'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i></div>
              ) : (
                <>
                  {/* Pricing section */}
                  <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'20px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
                      <i className="fa-solid fa-indian-rupee-sign"></i> Pricing
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Standard Membership Price (₹) *</label>
                        <input className="form-input" type="number" min="0" placeholder="500"
                          value={memForm.standard_price}
                          onChange={e=>setMemForm(f=>({...f,standard_price:Number(e.target.value)}))}/>
                        <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>For new members joining FIP</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Renewal Membership Price (₹) *</label>
                        <input className="form-input" type="number" min="0" placeholder="200"
                          value={memForm.renewal_price}
                          onChange={e=>setMemForm(f=>({...f,renewal_price:Number(e.target.value)}))}/>
                        <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>For existing members renewing</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Validity Period (months)</label>
                        <input className="form-input" type="number" min="1" max="60" placeholder="12"
                          value={memForm.validity_months}
                          onChange={e=>setMemForm(f=>({...f,validity_months:Number(e.target.value)}))}/>
                        <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>How long membership lasts after payment</div>
                      </div>
                    </div>
                  </div>

                  {/* Membership period */}
                  <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'20px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
                      <i className="fa-solid fa-calendar"></i> Membership Year
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Membership Period Start</label>
                        <input className="form-input" type="date"
                          value={memForm.membership_start_date}
                          onChange={e=>setMemForm(f=>({...f,membership_start_date:e.target.value}))}/>
                        <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>e.g. 01-04-2025 (financial year start)</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Membership Period End</label>
                        <input className="form-input" type="date"
                          value={memForm.membership_end_date}
                          onChange={e=>setMemForm(f=>({...f,membership_end_date:e.target.value}))}/>
                        <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>e.g. 31-03-2026 (financial year end)</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{marginBottom:'20px'}}>
                    <label className="form-label">Membership Description</label>
                    <textarea className="form-textarea"
                      placeholder="Describe what members get with their FIP membership…"
                      value={memForm.description}
                      onChange={e=>setMemForm(f=>({...f,description:e.target.value}))}
                      style={{minHeight:'120px'}}/>
                    <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>This can be shown on the membership page</div>
                  </div>

                  {/* Preview */}
                  <div style={{background:'linear-gradient(135deg,#1A3C6E,#1B4A9E)',borderRadius:'var(--radius-lg)',padding:'20px 24px',marginBottom:'20px',color:'#fff'}}>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>Preview</div>
                    <div style={{display:'flex',gap:'24px',flexWrap:'wrap'}}>
                      <div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>New Member</div>
                        <div style={{fontSize:'28px',fontWeight:900,color:'#FFD09B'}}>₹{memForm.standard_price}<span style={{fontSize:'14px',fontWeight:400,color:'rgba(255,255,255,0.45)'}}>/yr</span></div>
                      </div>
                      <div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>Renewal</div>
                        <div style={{fontSize:'28px',fontWeight:900,color:'#FFD09B'}}>₹{memForm.renewal_price}<span style={{fontSize:'14px',fontWeight:400,color:'rgba(255,255,255,0.45)'}}>/yr</span></div>
                      </div>
                      <div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>Validity</div>
                        <div style={{fontSize:'28px',fontWeight:900,color:'#FFD09B'}}>{memForm.validity_months}<span style={{fontSize:'14px',fontWeight:400,color:'rgba(255,255,255,0.45)'}}> months</span></div>
                      </div>
                      {memForm.membership_start_date && memForm.membership_end_date && (
                        <div>
                          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>Period</div>
                          <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>
                            {new Date(memForm.membership_start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}
                            {' – '}
                            {new Date(memForm.membership_end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                    <button className="btn btn-primary" onClick={saveMembershipSettings} disabled={memSaving}>
                      {memSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save Settings</>}
                    </button>

                  </div>


                </>
              )}
            </div>
          )}

          {/* ═══ POPUPS ═══ */}
          {tab === 'popups' && (
            <div className="admin-form-card">
              <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
                <span>Hero Popups <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({popups.length})</span></span>
                <button className="btn btn-primary btn-sm" onClick={() => { setPopupForm({title:'',image_url:'',cta_label:'Register Now',cta_link:'/courses',is_active:true,sort_order:popups.length}); setPopupModal('new'); }}>
                  <i className="fa-solid fa-plus"></i> Add Popup
                </button>
              </div>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'16px'}}>
                These popups appear on the homepage hero when visitors land on the site. Multiple popups show as a carousel.
              </p>
              {popupsLoading ? (
                <div style={{textAlign:'center',padding:'40px'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i></div>
              ) : popups.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-rectangle-ad" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p>No popups yet. Add your first popup to show on the homepage.</p>
                </div>
              ) : popups.map(p => (
                <div key={p.id} style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px 16px',marginBottom:'10px',flexWrap:'wrap'}}>
                  {/* Preview thumbnail */}
                  <img src={p.image_url} alt={p.title} style={{width:'80px',height:'56px',objectFit:'cover',borderRadius:'8px',flexShrink:0,border:'1px solid var(--border)'}}
                    onError={e=>e.target.style.display='none'}/>
                  <div style={{flex:1,minWidth:'160px'}}>
                    <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'3px'}}>{p.title}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                      <span>CTA: {p.cta_label}</span>
                      <span>Link: {p.cta_link}</span>
                      <span>Order: {p.sort_order}</span>
                    </div>
                  </div>
                  {/* Toggle active */}
                  <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',flexShrink:0}}>
                    <div style={{position:'relative',width:'36px',height:'20px'}} onClick={() => togglePopup(p.id, !p.is_active)}>
                      <div style={{position:'absolute',inset:0,borderRadius:'10px',background:p.is_active?'var(--green)':'var(--border)',transition:'background 0.2s'}}/>
                      <div style={{position:'absolute',top:'2px',left:p.is_active?'18px':'2px',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                    </div>
                    <span style={{fontSize:'12px',color:p.is_active?'var(--green)':'var(--text-muted)',fontWeight:600}}>{p.is_active?'Active':'Hidden'}</span>
                  </label>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}}
                      onClick={() => { setPopupForm({title:p.title,image_url:p.image_url,cta_label:p.cta_label||'Register Now',cta_link:p.cta_link||'/courses',is_active:p.is_active,sort_order:p.sort_order||0}); setPopupModal(p); }}>
                      <i className="fa-solid fa-pen"></i> Edit
                    </button>
                    <button className="admin-btn admin-btn-danger" onClick={() => deletePopup(p.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Popup Create/Edit Modal ── */}
          {popupModal && (
            <div className="modal-overlay" onClick={() => setPopupModal(null)}>
              <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'520px'}}>
                <button className="modal-close" onClick={() => setPopupModal(null)}>&#x2715;</button>
                <div className="modal-title">{popupModal==='new'?'Add New Popup':'Edit Popup'}</div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="e.g. ITR Filing Mastery Webinar" value={popupForm.title} onChange={e=>setPopupForm(f=>({...f,title:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Image URL *
                    <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'6px'}}>— upload to Supabase Storage and paste URL here</span>
                  </label>
                  <input className="form-input" type="url" placeholder="https://..." value={popupForm.image_url} onChange={e=>setPopupForm(f=>({...f,image_url:e.target.value}))}/>
                  {popupForm.image_url && (
                    <img src={popupForm.image_url} alt="preview" style={{marginTop:'8px',width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',border:'1px solid var(--border)'}}
                      onError={e=>e.target.style.display='none'}/>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CTA Button Label</label>
                    <input className="form-input" placeholder="Register Now" value={popupForm.cta_label} onChange={e=>setPopupForm(f=>({...f,cta_label:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTA Link</label>
                    <input className="form-input" placeholder="/courses or https://..." value={popupForm.cta_link} onChange={e=>setPopupForm(f=>({...f,cta_link:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input className="form-input" type="number" placeholder="0 = first" value={popupForm.sort_order} onChange={e=>setPopupForm(f=>({...f,sort_order:e.target.value}))}/>
                  </div>
                  <div className="form-group" style={{display:'flex',alignItems:'center',gap:'10px',paddingTop:'22px'}}>
                    <input type="checkbox" id="popup_active" checked={popupForm.is_active} onChange={e=>setPopupForm(f=>({...f,is_active:e.target.checked}))} style={{width:'16px',height:'16px',accentColor:'var(--green)'}}/>
                    <label htmlFor="popup_active" style={{fontSize:'13px',color:'var(--text-muted)',cursor:'pointer'}}>Active (show on site)</label>
                  </div>
                </div>
                <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
                  <button className="btn btn-outline-blue btn-sm" onClick={() => setPopupModal(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={savePopup} disabled={!popupForm.title.trim()||!popupForm.image_url.trim()}>
                    {popupModal==='new'?'Create Popup':'Save Changes'}
                  </button>
                </div>
              </div>
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
                <label className="form-label">
                  <i className="fa-solid fa-user-tie" style={{color:'var(--orange)',marginRight:'6px'}}></i>
                  Restrict to Professions
                  <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'6px'}}>(leave empty = open to all)</span>
                </label>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px',background:'var(--off-white)',padding:'10px',borderRadius:'8px',border:'1px solid var(--border)'}}>
                  {['Chartered Accountant','Company Secretary','Cost Accountant','Advocate','Student','Other'].map(prof => {
                    const checked = (eventForm.allowed_professions||[]).includes(prof);
                    return (
                      <label key={prof} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',padding:'4px 10px',borderRadius:'20px',border:'1.5px solid',background:checked?'var(--blue)':'transparent',color:checked?'#fff':'var(--text-muted)',borderColor:checked?'var(--blue)':'var(--border)'}}>
                        <input type="checkbox" style={{display:'none'}} checked={checked}
                          onChange={e => setEventForm(f => ({
                            ...f,
                            allowed_professions: e.target.checked
                              ? [...(f.allowed_professions||[]), prof]
                              : (f.allowed_professions||[]).filter(p=>p!==prof)
                          }))}/>
                        {prof}
                      </label>
                    );
                  })}
                </div>
              </div>
            <div className="form-group">
              <label className="form-label">Tags <span style={{fontWeight:400,color:'var(--text-light)'}}>— comma separated</span></label>
              <input className="form-input" type="text" placeholder="e.g. GST, Networking, Summit" value={eventForm.tags} onChange={e=>setEventForm(f=>({...f,tags:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-image" style={{color:'var(--orange)',marginRight:'6px'}}></i>
                Event Banner Image URL
                <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'6px'}}>(shows on event card)</span>
              </label>
              <input className="form-input" type="url" placeholder="https://your-cdn.com/event-banner.jpg"
                value={eventForm.image_url} onChange={e=>setEventForm(f=>({...f,image_url:e.target.value}))}/>
              {eventForm.image_url && (
                <img src={eventForm.image_url} alt="preview"
                  style={{marginTop:'8px',width:'100%',maxHeight:'120px',objectFit:'cover',borderRadius:'8px',border:'1px solid var(--border)'}}
                  onError={e=>e.target.style.display='none'}/>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-brands fa-zoom" style={{color:'#2D8CFF',marginRight:'6px'}}></i>
                Zoom Meeting Link
                <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'6px'}}>(for online/hybrid events)</span>
              </label>
              <input className="form-input" type="url" placeholder="https://zoom.us/j/..."
                value={eventForm.zoom_link} onChange={e=>setEventForm(f=>({...f,zoom_link:e.target.value}))}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'16px',background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px 18px',marginBottom:'12px'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:'14px',color:'var(--blue)',marginBottom:'3px'}}>
                  {eventForm.is_private
                    ? <><i className="fa-solid fa-lock" style={{color:'var(--orange)',marginRight:'7px'}}></i>Private — FIP Members Only</>
                    : <><i className="fa-solid fa-globe" style={{color:'var(--green)',marginRight:'7px'}}></i>Public — Visible to Everyone</>}
                </div>
                <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  {eventForm.is_private
                    ? 'Only active FIP Members can see and register for this event.'
                    : 'Anyone visiting the Events page can see and register for this event.'}
                </div>
              </div>
              <div onClick={() => setEventForm(f => ({...f, is_private: !f.is_private}))}
                style={{width:'48px',height:'26px',borderRadius:'13px',background:eventForm.is_private?'var(--orange)':'var(--green)',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
                <div style={{position:'absolute',top:'3px',left:eventForm.is_private?'25px':'3px',width:'20px',height:'20px',borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
              </div>
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

      {/* ── Member Detail Modal ── */}
      {memberDetail && (
        <div className="modal-overlay" onClick={() => { setMemberDetail(null); setMemberActivity(null); }}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'640px',maxHeight:'90vh',overflowY:'auto'}}>
            <button className="modal-close" onClick={() => { setMemberDetail(null); setMemberActivity(null); }}>&#x2715;</button>

            {/* ── Profile header ── */}
            <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'20px',paddingBottom:'16px',borderBottom:'1px solid var(--border)'}}>
              <div style={{
                width:'60px',height:'60px',borderRadius:'50%',flexShrink:0,
                background: memberDetail.avatar_url ? 'transparent' : 'linear-gradient(135deg,var(--blue),#1B4A9E)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'18px',fontWeight:800,color:'#FFD09B',overflow:'hidden',
                border: memberDetail.is_committee_member ? '2px solid #FFD700' : '2px solid var(--border)',
              }}>
                {memberDetail.avatar_url
                  ? <img src={memberDetail.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : (memberDetail.full_name||'M').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                }
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'3px'}}>
                  <span style={{fontSize:'17px',fontWeight:800,color:'var(--blue)'}}>{memberDetail.full_name}</span>
                  {memberDetail.is_committee_member && <span className="gold-badge"><i className="fa-solid fa-crown"></i> Committee</span>}
                  {memberDetail.role === 'admin' && <span style={{fontSize:'10px',fontWeight:700,background:'var(--orange)',color:'#fff',padding:'2px 8px',borderRadius:'10px'}}>Admin</span>}
                </div>
                <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{memberDetail.email}</div>
                {memberDetail.profession && <div style={{fontSize:'12px',color:'var(--text-light)'}}>{memberDetail.profession}</div>}
              </div>
              <span className={'status-pill ' + (memberDetail.membership_status==='Active' ? 'sp-active' : 'sp-rejected')}>
                {memberDetail.membership_status || 'Inactive'}
              </span>
            </div>

            {/* ── Info grid ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'20px'}}>
              {[
                { label:'Phone',           val: memberDetail.phone },
                { label:'City',            val: memberDetail.city },
                { label:'Designation',     val: memberDetail.designation },
                { label:'Organisation',    val: memberDetail.organisation },
                { label:'Account Type',    val: memberDetail.account_type },
                { label:'Membership Plan', val: memberDetail.membership_plan },
                { label:'Membership End',  val: memberDetail.membership_end ? new Date(memberDetail.membership_end).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : null },
                { label:'Committee',       val: memberDetail.committee_name },
                { label:'Committee Role',  val: memberDetail.committee_role },
                { label:'Joined',          val: memberDetail.created_at ? new Date(memberDetail.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : null },
                { label:'Member ID',       val: memberDetail.profile_slug ? 'FIP-' + (memberDetail.profile_slug.split('-').pop()||'').toUpperCase() : memberDetail.id?.slice(0,8).toUpperCase() },
                { label:'Referral Code',   val: null },
              ].filter(r => r.val).map((r,i) => (
                <div key={i} style={{background:'var(--off-white)',borderRadius:'8px',padding:'9px 12px',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:'9px',fontWeight:700,color:'var(--text-light)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'3px'}}>{r.label}</div>
                  <div style={{fontSize:'13px',color:'var(--blue)',fontWeight:600}}>{r.val}</div>
                </div>
              ))}
            </div>

            {/* ── Activity sections ── */}
            {activityLoading ? (
              <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'20px',display:'block',marginBottom:'8px',color:'var(--orange)'}}></i>
                Loading activity…
              </div>
            ) : memberActivity && (
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

                {/* Payments */}
                <ActivitySection icon="fa-credit-card" color="var(--green)" title="Payments" count={memberActivity.payments.length}>
                  {memberActivity.payments.length === 0
                    ? <EmptyActivity text="No payments yet"/>
                    : memberActivity.payments.map((p,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)'}}>{p.item_name}</div>
                          <div style={{fontSize:'11px',color:'var(--text-light)'}}>{new Date(p.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'13px',fontWeight:700,color:'var(--green)'}}>₹{p.total_amount}</span>
                          <span className={'status-pill ' + (p.status==='paid'?'sp-active':'sp-rejected')} style={{fontSize:'10px',padding:'2px 8px'}}>{p.status}</span>
                        </div>
                      </div>
                    ))
                  }
                </ActivitySection>

                {/* Course Registrations */}
                <ActivitySection icon="fa-graduation-cap" color="var(--blue)" title="Course Registrations" count={memberActivity.courses.length}>
                  {memberActivity.courses.length === 0
                    ? <EmptyActivity text="No course registrations"/>
                    : memberActivity.courses.map((c,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)'}}>{c.course_title}</div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'11px',color:'var(--text-light)'}}>{new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                          <span className="status-pill sp-active" style={{fontSize:'10px',padding:'2px 8px'}}>{c.status||'registered'}</span>
                        </div>
                      </div>
                    ))
                  }
                </ActivitySection>

                {/* Event RSVPs */}
                <ActivitySection icon="fa-calendar-check" color="var(--orange)" title="Event RSVPs" count={memberActivity.rsvps.length}>
                  {memberActivity.rsvps.length === 0
                    ? <EmptyActivity text="No event RSVPs"/>
                    : memberActivity.rsvps.map((r,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)'}}>{r.full_name || 'RSVP'}</div>
                        <span style={{fontSize:'11px',color:'var(--text-light)'}}>{new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </div>
                    ))
                  }
                </ActivitySection>

                {/* Referrals */}
                <ActivitySection icon="fa-gift" color="#B8860B" title="Referrals" count={memberActivity.referrals.length}>
                  {memberActivity.referrals.length === 0
                    ? <EmptyActivity text="No referrals yet"/>
                    : (
                      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',padding:'8px 0'}}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'22px',fontWeight:800,color:'var(--blue)'}}>{memberActivity.referrals.length}</div>
                          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Total</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'22px',fontWeight:800,color:'var(--green)'}}>{memberActivity.referrals.filter(r=>r.status==='completed'||r.status==='rewarded').length}</div>
                          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Converted</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'22px',fontWeight:800,color:'#B8860B'}}>{memberActivity.referrals.filter(r=>r.reward_given).length}</div>
                          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Rewarded</div>
                        </div>
                      </div>
                    )
                  }
                </ActivitySection>

                {/* Blog Posts */}
                {memberActivity.blogs.length > 0 && (
                  <ActivitySection icon="fa-pen-nib" color="#7C3AED" title="Blog Posts" count={memberActivity.blogs.length}>
                    {memberActivity.blogs.map((b,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:'8px'}}>{b.title}</div>
                        <span className={'status-pill ' + (b.status==='approved'?'sp-active':b.status==='pending'?'sp-pending':'sp-rejected')} style={{fontSize:'10px',padding:'2px 8px',flexShrink:0}}>{b.status}</span>
                      </div>
                    ))}
                  </ActivitySection>
                )}
              </div>
            )}

            {/* Footer links */}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'20px',paddingTop:'16px',borderTop:'1px solid var(--border)'}}>
              {memberDetail.linkedin_url && (
                <a href={memberDetail.linkedin_url} target="_blank" rel="noopener"
                  style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#0077B5',color:'#fff',padding:'7px 14px',borderRadius:'7px',textDecoration:'none',fontSize:'12px',fontWeight:600}}>
                  <i className="fa-brands fa-linkedin-in"></i> LinkedIn
                </a>
              )}
              {memberDetail.profile_slug && (
                <a href={'/member/' + memberDetail.profile_slug} target="_blank" rel="noopener"
                  style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'var(--blue-pale)',color:'var(--blue)',padding:'7px 14px',borderRadius:'7px',textDecoration:'none',fontSize:'12px',fontWeight:600,border:'1px solid #C0CDE8'}}>
                  <i className="fa-solid fa-user"></i> View Profile
                </a>
              )}
              <button style={{marginLeft:'auto',background:'none',border:'1px solid var(--border)',padding:'7px 14px',borderRadius:'7px',fontSize:'12px',color:'var(--text-muted)',cursor:'pointer'}}
                onClick={() => { setMemberDetail(null); setMemberActivity(null); }}>Close</button>
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
                {committees.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

            {/* New fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Date</label>
                <input className="form-input" type="date" value={courseForm.event_date} onChange={e=>setCourseForm(f=>({...f,event_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Event Time</label>
                <input className="form-input" type="text" placeholder="e.g. 6:00 PM - 9:00 PM" value={courseForm.event_time} onChange={e=>setCourseForm(f=>({...f,event_time:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Zoom Meeting Link
                  <span style={{fontSize:'11px',color:'var(--text-light)',marginLeft:'5px'}}>— only visible after registration</span>
                </label>
                <input className="form-input" type="url" placeholder="https://zoom.us/j/..." value={courseForm.zoom_link} onChange={e=>setCourseForm(f=>({...f,zoom_link:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Zoom Password <span style={{fontWeight:400,color:'var(--text-light)'}}>— optional</span></label>
                <input className="form-input" type="text" placeholder="Meeting password" value={courseForm.zoom_password} onChange={e=>setCourseForm(f=>({...f,zoom_password:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span style={{color:'#25D366',marginRight:'5px'}}>💬</span>
                  WhatsApp Group Link
                  <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'6px'}}>(sent in registration confirmation email)</span>
                </label>
                <input className="form-input" type="url" placeholder="https://chat.whatsapp.com/..."
                  value={courseForm.whatsapp_group_link}
                  onChange={e=>setCourseForm(f=>({...f,whatsapp_group_link:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-image" style={{color:'var(--orange)',marginRight:'6px'}}></i>
                  Flyer Template Image URL
                  <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'6px'}}>(optional — background for participant flyer after purchase)</span>
                </label>
                <input className="form-input" type="url" placeholder="https://your-cdn.com/flyer-template.png"
                  value={courseForm.flyer_template_url}
                  onChange={e=>setCourseForm(f=>({...f,flyer_template_url:e.target.value}))}/>
                {courseForm.flyer_template_url && (
                  <img src={courseForm.flyer_template_url} alt="Flyer template preview"
                    style={{marginTop:'8px',width:'100%',maxHeight:'100px',objectFit:'cover',borderRadius:'6px',border:'1px solid var(--border)'}}
                    onError={e=>e.target.style.display='none'}/>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Course Banner / Poster URL
                <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'5px'}}>— optional, shown as hero background</span>
              </label>
              <input className="form-input" type="url" placeholder="https://... (Supabase storage or any image URL)" value={courseForm.banner_url} onChange={e=>setCourseForm(f=>({...f,banner_url:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">
                What You'll Learn
                <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'5px'}}>— one point per line</span>
              </label>
              <textarea className="form-textarea" placeholder={"Understand ITR Forms 1, 2, 3 & 4\nHandle capital gains calculations\nAvoid common filing mistakes"} value={courseForm.what_you_learn} onChange={e=>setCourseForm(f=>({...f,what_you_learn:e.target.value}))} style={{minHeight:'90px'}}></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">
                Speakers
                <span style={{fontWeight:400,color:'var(--text-light)',marginLeft:'5px'}}>— JSON array format</span>
              </label>
              <textarea className="form-textarea" placeholder={'[\n  {"name":"CA Gaurav Aggarwal","qualification":"President, FIP · Tax Expert","image_url":""}\n]'} value={courseForm.speakers} onChange={e=>setCourseForm(f=>({...f,speakers:e.target.value}))} style={{minHeight:'90px',fontFamily:'monospace',fontSize:'12px'}}></textarea>
              <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>
                Format: <code>[{`{"name":"...", "qualification":"...", "image_url":"..."}`}]</code>
              </div>
            </div>

            {/* ── Visibility toggle ── */}
            <div style={{display:'flex',alignItems:'center',gap:'16px',background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px 18px',marginBottom:'12px'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:'14px',color:'var(--blue)',marginBottom:'3px'}}>
                  {courseForm.is_private
                    ? <><i className="fa-solid fa-lock" style={{color:'var(--orange)',marginRight:'7px'}}></i>Private — FIP Members Only</>
                    : <><i className="fa-solid fa-globe" style={{color:'var(--green)',marginRight:'7px'}}></i>Public — Visible to Everyone</>}
                </div>
                <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  {courseForm.is_private
                    ? 'Only users with an active FIP membership can see and register for this course.'
                    : 'Anyone visiting the Courses page can see and register for this course.'}
                </div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',flexShrink:0}}>
                <div onClick={() => setCourseForm(f => ({...f, is_private: !f.is_private}))}
                  style={{width:'48px',height:'26px',borderRadius:'13px',background:courseForm.is_private?'var(--orange)':'var(--green)',position:'relative',cursor:'pointer',transition:'background .2s'}}>
                  <div style={{position:'absolute',top:'3px',left:courseForm.is_private?'25px':'3px',width:'20px',height:'20px',borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                </div>
              </label>
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