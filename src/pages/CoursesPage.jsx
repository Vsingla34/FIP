import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

/* Category emoji map */
const CATEGORY_EMOJI = {
  'GST': '📑', 'GST & Indirect Tax': '📑', 'Indirect Tax': '📑',
  'Direct Tax': '📊', 'Income Tax': '📊',
  'Corporate Law': '🏛', 'Company Law': '🏛', 'IBC': '🏛',
  'FEMA': '💱', 'RBI': '💱',
  'Audit': '🔍', 'Audit & Assurance': '🔍', 'Forensic': '🔍',
  'Finance': '📈', 'Valuation': '📈',
  'Legal': '⚖️', 'Law': '⚖️',
};

const BG_COLORS = ['ct-blue','ct-teal','ct-orange','ct-purple','ct-green','ct-red'];

function getCourseEmoji(category) {
  if (!category) return '📚';
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📚';
}

export default function CoursesPage() {
  const { user, profile } = useAuth();
  const { openModal, showToast } = useApp();
  const navigate = useNavigate();

  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');

  /* Hardcoded courses — always shown as fallback */
  const HARDCODED = [
    { id:'hc-1', slug:null, bg:'ct-blue',   emoji:'📑', category:'GST & Indirect Tax', title:'Mastering GST Litigation — Sankalp 2026',   instructor:'CA Gaurav Aggarwal', duration_hours:null, cpe_hours:0,  level:'Intermediate', price:999,  is_free_for_members:false, status:'published', created_at:null },
    { id:'hc-2', slug:null, bg:'ct-teal',   emoji:'🏛', category:'Corporate Law',       title:'NCLT & Corporate Insolvency Practice',        instructor:'Expert Panel',       duration_hours:null, cpe_hours:0,  level:'Advanced',     price:0,    is_free_for_members:true,  status:'published', created_at:null },
    { id:'hc-3', slug:null, bg:'ct-orange', emoji:'📊', category:'Direct Tax',          title:'Income Tax Search & Seizure — Practical Guide', instructor:'Senior Practitioners',duration_hours:null, cpe_hours:0, level:'Advanced',    price:1499, is_free_for_members:false, status:'published', created_at:null },
    { id:'hc-4', slug:null, bg:'ct-purple', emoji:'⚖️', category:'Company Law',         title:'FEMA & RBI Compliance for CS Professionals',  instructor:'CS Expert Panel',    duration_hours:null, cpe_hours:0,  level:'Intermediate', price:0,    is_free_for_members:true,  status:'published', created_at:null },
    { id:'hc-5', slug:null, bg:'ct-green',  emoji:'📈', category:'Finance & Valuation', title:'Business Valuation Under SEBI & IBC',         instructor:'IBBI Registered Valuers',duration_hours:null,cpe_hours:0,level:'Advanced',  price:1999, is_free_for_members:false, status:'published', created_at:null },
    { id:'hc-6', slug:null, bg:'ct-red',    emoji:'🔍', category:'Audit & Assurance',   title:'Forensic Audit & Fraud Detection in Practice', instructor:'CFE Practitioners', duration_hours:null, cpe_hours:0,  level:'Advanced',     price:1299, is_free_for_members:false, status:'published', created_at:null },
  ];

  /* load live courses from Supabase and merge with hardcoded */
  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const live = (data || []).map(c => ({ ...c, bg: null }));
        // merge: live courses first, then hardcoded ones not already duplicated
        setCourses([...live, ...HARDCODED]);
        setLoading(false);
      });
  }, []);

  /* derive filter categories from real data */
  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];

  const filtered = courses.filter(c => {
    const matchCat  = filter === 'All' || c.category === filter;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.category||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor||'').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCardClick = (course) => {
    if (course.slug) {
      navigate(`/courses/${course.slug}`);
    } else {
      // Hardcoded course with no slug → open enroll directly
      if (!user) { openModal('register', { course }); return; }
      openModal('enroll', { course });
    }
  };

  const handleEnroll = (course) => {
    if (!user) { openModal('register', { course, courseSlug: course.slug }); return; }
    if (profile?.role === 'admin') {
      if (course.slug) navigate(`/courses/${course.slug}/watch`);
      else showToast('This course has no video content yet.');
      return;
    }
    const isFreeForUser = isFree(course);
    if (isFreeForUser) {
      if (course.slug) navigate(`/courses/${course.slug}/watch`);
      else openModal('enroll', { course });
      return;
    }
    openModal('enroll', { course });
  };

  const getFreeLabel = (course) => {
    const f = course.free_for || 'none';
    const isActiveMember = profile?.membership_status === 'Active';
    const isStudent = !isActiveMember;
    if (f === 'all') return 'Free for All';
    if (f === 'members' && isActiveMember) return 'Free for You';
    if (f === 'members') return 'Free for Members';
    if (f === 'students' && isStudent) return 'Free for You';
    if (f === 'students') return 'Free for Students';
    if (!course.price || course.price === 0) return 'Free';
    return `₹${Number(course.price).toLocaleString('en-IN')}`;
  };

  const formatPrice = (course) => getFreeLabel(course);

  const isFree = (course) => {
    const f = course.free_for || (course.is_free_for_members ? 'members' : 'none');
    const isActiveMember = profile?.membership_status === 'Active';
    if (f === 'all') return true;
    if (f === 'members' && isActiveMember) return true;
    if (f === 'students' && !isActiveMember) return true;
    return !course.price || course.price === 0;
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Courses</span></div>
          <h1>Courses &amp; Programmes</h1>
          <p>Expert-led, CPE-eligible courses for CAs, CSs, CMAs and legal professionals.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">
          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="Search — GST, NCLT, Income Tax, Company Law…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="filter-pills">
            {categories.map(cat => (
              <div key={cat} className={`fpill${filter===cat?' active':''}`}
                onClick={() => setFilter(cat)}>{cat}</div>
            ))}
          </div>

          {loading ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',display:'block',marginBottom:'12px',color:'var(--orange)'}}></i>
              Loading courses…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-book-open" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
              {courses.length === 0
                ? 'No courses published yet. Check back soon.'
                : 'No courses match your search.'}
            </div>
          ) : (
            <div className="course-grid">
              {filtered.map((c, i) => {
                const free     = isFree(c);
                const emoji    = c.emoji || getCourseEmoji(c.category);
                const bgCls    = c.bg || BG_COLORS[i % BG_COLORS.length];
                const priceStr = formatPrice(c);

                return (
                  <div className="course-card" key={c.id} onClick={() => handleCardClick(c)} style={{cursor:'pointer'}}>
                    <div className={`course-thumb ${bgCls}`}>
                      <span>{emoji}</span>
                      {free
                        ? <span className="course-tag tag-free">{getFreeLabel(c)}</span>
                        : c.created_at && (Date.now() - new Date(c.created_at) < 30*24*60*60*1000)
                        ? <span className="course-tag tag-hot">New</span>
                        : null
                      }
                    </div>
                    <div className="course-body">
                      <div className="course-cat">{c.category || 'Professional Development'}</div>
                      <div className="course-title">{c.title}</div>
                      <div className="course-instr">
                        <i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)'}}></i>
                        {c.instructor || 'FIP Expert Panel'}
                      </div>
                      <div className="course-meta">
                        {c.duration_hours && <span><i className="fa-regular fa-clock"></i> {c.duration_hours}h</span>}
                        
                        {c.level && <span><i className="fa-solid fa-signal"></i> {c.level}</span>}
                      </div>
                      <div className="course-footer">
                        {free
                          ? <span className="course-price-free">{priceStr}</span>
                          : <span className="course-price">{priceStr}</span>
                        }
                        <button className="c-enroll-btn"
                          onClick={e => { e.stopPropagation(); handleEnroll(c); }}>
                          {c.slug ? 'View Course' : 'Enroll Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}