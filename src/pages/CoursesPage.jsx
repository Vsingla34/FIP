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

  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('All');
  const [courseTab,  setCourseTab]  = useState('upcoming'); // 'upcoming' | 'past'

  /* Load live courses from Supabase only — no hardcoded fallback */
  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCourses(data || []);
        setLoading(false);
      });
  }, []);

  /* derive filter categories from real data */
  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];

  const today = new Date(); today.setHours(0,0,0,0);

  // Upcoming: no event_date (evergreen) OR event_date is today/future
  const upcomingCourses = courses.filter(c =>
    !c.event_date || new Date(c.event_date) >= today
  );
  // Past: event_date exists and is strictly before today
  const pastCourses = courses.filter(c =>
    c.event_date && new Date(c.event_date) < today
  );

  const activeCourses = courseTab === 'past' ? pastCourses : upcomingCourses;

  const filtered = activeCourses.filter(c => {
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
    // Always go to course detail page — no more LMS/watch
    if (course.slug) navigate(`/courses/${course.slug}`);
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
          <p>FIP Learning brings together expert-led courses, practical knowledge, and industry insights to help professionals stay informed, compliant, and future-ready. Explore our upcoming programs and invest in your continuous professional growth.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">

          {/* ── Upcoming / Past tabs ── */}
          <div className="blog-tabs" style={{marginBottom:'20px'}}>
            <button
              className={`blog-tab${courseTab==='upcoming'?' active':''}`}
              onClick={() => { setCourseTab('upcoming'); setFilter('All'); }}>
              <i className="fa-solid fa-calendar-days"></i> Upcoming
              <span style={{marginLeft:'6px',background:'rgba(255,255,255,0.2)',padding:'1px 7px',borderRadius:'10px',fontSize:'11px'}}>
                {upcomingCourses.length}
              </span>
            </button>
            <button
              className={`blog-tab${courseTab==='past'?' active':''}`}
              onClick={() => { setCourseTab('past'); setFilter('All'); }}>
              <i className="fa-solid fa-clock-rotate-left"></i> Past Courses
              <span style={{marginLeft:'6px',background:'rgba(255,255,255,0.2)',padding:'1px 7px',borderRadius:'10px',fontSize:'11px'}}>
                {pastCourses.length}
              </span>
            </button>
          </div>

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
                : courseTab === 'past'
                ? 'No past courses found.'
                : 'No upcoming courses match your search.'}
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
                    {/* Thumbnail — banner image or coloured fallback */}
                    <div className={`course-thumb ${bgCls}`} style={
                      (c.banner_url || c.thumbnail_url)
                        ? { backgroundImage:`url('${c.banner_url || c.thumbnail_url}')`, backgroundSize:'cover', backgroundPosition:'center', padding:0 }
                        : {}
                    }>
                      {/* Overlay for image cards */}
                      {(c.banner_url || c.thumbnail_url) && (
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.45) 100%)',borderRadius:'inherit'}}/>
                      )}
                      {/* Emoji only if no image */}
                      {!(c.banner_url || c.thumbnail_url) && <span>{emoji}</span>}
                      {/* Tag always top-right */}
                      {free
                        ? <span className="course-tag tag-free">{getFreeLabel(c)}</span>
                        : c.created_at && (Date.now() - new Date(c.created_at) < 30*24*60*60*1000)
                        ? <span className="course-tag tag-hot">New</span>
                        : null
                      }
                      {/* Date on image */}
                      {c.event_date && (
                        <div style={{position:'absolute',bottom:'10px',left:'12px',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',color:'#fff',fontSize:'11px',fontWeight:700,padding:'4px 10px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'5px'}}>
                          <i className="fa-regular fa-calendar" style={{color:'#FFD09B'}}></i>
                          {new Date(c.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                          {c.event_time && <span style={{opacity:.7}}>· {c.event_time.split('-')[0].trim()}</span>}
                        </div>
                      )}
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
                        {c.event_date && !c.duration_hours && (
                          <span style={{color:'#2D8CFF',fontWeight:600,fontSize:'11px'}}>
                            <i className="fa-brands fa-zoom" style={{marginRight:'3px'}}></i>Live Zoom
                          </span>
                        )}
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