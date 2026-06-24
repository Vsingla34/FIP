import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

const EMOJI_MAP = {
  'GST':'📑','GST & Indirect Tax':'📑','Indirect Tax':'📑',
  'Direct Tax':'📊','Income Tax':'📊',
  'Corporate Law':'🏛','Company Law':'🏛','IBC':'🏛',
  'FEMA':'💱','RBI':'💱',
  'Audit':'🔍','Forensic':'🔍',
  'Finance':'📈','Valuation':'📈',
  'Legal':'⚖️','Law':'⚖️',
};
const BG = ['ct-blue','ct-teal','ct-orange','ct-purple','ct-green'];

function getEmoji(cat) {
  if (!cat) return '📚';
  for (const [k,v] of Object.entries(EMOJI_MAP))
    if (cat.toLowerCase().includes(k.toLowerCase())) return v;
  return '📚';
}

function formatDuration(secs) {
  if (!secs) return null;
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CourseDetailPage() {
  const { slug } = useParams();
  const { user, profile } = useAuth();
  const { openModal, showToast } = useApp();
  const navigate = useNavigate();

  const [course,  setCourse]  = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMod, setOpenMod] = useState(0); // which module is expanded

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase
        .from('courses').select('*').eq('slug', slug).single();
      if (!c) { navigate('/courses'); return; }
      setCourse(c);

      // load modules + videos
      const { data: content } = await supabase.rpc('get_course_content', { p_course_id: c.id });
      if (content) {
        const grouped = {};
        content.forEach(row => {
          if (!row.module_id) return;
          if (!grouped[row.module_id]) {
            grouped[row.module_id] = { id: row.module_id, title: row.module_title, order: row.module_order, videos: [] };
          }
          if (row.video_id) grouped[row.module_id].videos.push({
            id: row.video_id, title: row.video_title,
            duration_seconds: row.duration_seconds, is_preview: row.is_preview,
          });
        });
        setModules(Object.values(grouped).sort((a,b) => a.order - b.order));
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px',color:'var(--text-muted)'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
      <span>Loading course…</span>
    </div>
  );
  if (!course) return null;

  const totalVideos   = modules.reduce((s,m) => s + m.videos.length, 0);
  const totalSecs     = modules.reduce((s,m) => s + m.videos.reduce((ss,v) => ss + (v.duration_seconds||0), 0), 0);
  const isActiveMember = profile?.membership_status === 'Active';
  const f = course.free_for || (course.is_free_for_members ? 'members' : 'none');
  const isFreeForUser =
    f === 'all' ||
    (f === 'members' && isActiveMember) ||
    (f === 'students' && !isActiveMember) ||
    !course.price || course.price === 0;
  const priceLabel =
    f === 'all'                      ? 'Free for All' :
    f === 'members' && isActiveMember ? 'Free for You' :
    f === 'members'                   ? 'Free for Members' :
    f === 'students' && !isActiveMember ? 'Free for You' :
    f === 'students'                  ? 'Free for Students' :
    !course.price || course.price === 0 ? 'Free' :
    `₹${Number(course.price).toLocaleString('en-IN')}`;
  const totalLabel    = isFreeForUser
    ? priceLabel
    : `₹${Math.round(course.price * 1.18).toLocaleString('en-IN')} (incl. GST)`;

  const handleEnroll = () => {
    if (!user) { openModal('register', { course, courseSlug: course.slug }); return; }
    if (profile?.role === 'admin') {
      if (course.slug) navigate(`/courses/${course.slug}/watch`);
      else showToast('No video content added yet.');
      return;
    }
    if (isFreeForUser) {
      if (course.slug) navigate(`/courses/${course.slug}/watch`);
      else openModal('enroll', { course });
      return;
    }
    openModal('enroll', { course });
  };

  const emoji = getEmoji(course.category);

  return (
    <>
      {/* ── Hero ── */}
      <div className="cd-hero">
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'16px'}}>
            <Link to="/courses" style={{color:'rgba(255,255,255,0.55)',textDecoration:'none'}}>Courses</Link>
            <i className="fa-solid fa-chevron-right" style={{color:'rgba(255,255,255,0.3)'}}></i>
            <span style={{color:'rgba(255,255,255,0.85)'}}>{course.category}</span>
          </div>
          <div className="cd-hero-grid">
            <div className="cd-hero-left">
              <div className="cd-badge">{course.category}</div>
              <h1 className="cd-title">{course.title}</h1>
              {course.subtitle && <p className="cd-subtitle">{course.subtitle}</p>}
              <p className="cd-desc">{course.description}</p>
              <div className="cd-meta-row">
                {course.instructor && <span><i className="fa-solid fa-user-tie"></i> {course.instructor}</span>}
                {course.level && <span><i className="fa-solid fa-signal"></i> {course.level}</span>}
                {totalVideos > 0 && <span><i className="fa-solid fa-play-circle"></i> {totalVideos} lessons</span>}
                {totalSecs > 0 && <span><i className="fa-regular fa-clock"></i> {formatDuration(totalSecs)}</span>}
                
              </div>
            </div>

            {/* ── Sticky enroll card ── */}
            <div className="cd-enroll-card">
              <div className={`cd-thumb ${BG[0]}`}>
                <span style={{fontSize:'56px'}}>{emoji}</span>
              </div>
              <div className="cd-price-block">
                {isFreeForUser ? (
                  <div className="cd-price-free">{priceLabel}</div>
                ) : (
                  <>
                    <div className="cd-price">₹{Number(course.price).toLocaleString('en-IN')}</div>
                    <div className="cd-price-gst">{totalLabel}</div>
                  </>
                )}
              </div>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:'15px',padding:'14px'}} onClick={handleEnroll}>
                {profile?.role === 'admin' || isFreeForUser
                  ? <><i className="fa-solid fa-play"></i> Start Learning</>
                  : <><i className="fa-solid fa-lock-open"></i> Enroll Now</>
                }
              </button>
              {!isFreeForUser && (
                <div style={{textAlign:'center',fontSize:'12px',color:'var(--text-light)',marginTop:'10px'}}>
                  <i className="fa-solid fa-shield-halved" style={{color:'var(--green)',marginRight:'4px'}}></i>
                  Secure payment · 30-day access guarantee
                </div>
              )}
              <div className="cd-includes">
                <div className="cd-includes-title">This course includes:</div>
                {totalVideos > 0 && <div className="cd-include-item"><i className="fa-solid fa-play-circle"></i> {totalVideos} video lessons</div>}
                {totalSecs > 0 && <div className="cd-include-item"><i className="fa-regular fa-clock"></i> {formatDuration(totalSecs)} total content</div>}
                
                <div className="cd-include-item"><i className="fa-solid fa-infinity"></i> Lifetime access</div>
                <div className="cd-include-item"><i className="fa-solid fa-bookmark"></i> Video bookmarks &amp; notes</div>
                <div className="cd-include-item"><i className="fa-solid fa-award"></i> Certificate of completion</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Course Content ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="cd-content-grid">
            <div className="cd-main">

              {/* Curriculum */}
              <div className="cd-section">
                <h2 className="cd-section-title">Course Curriculum</h2>
                {modules.length === 0 ? (
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>
                    <i className="fa-solid fa-film" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                    Course content is being prepared. Enroll now and get access when it goes live.
                  </div>
                ) : modules.map((mod, mi) => (
                  <div className="cd-module" key={mod.id}>
                    <button className="cd-module-header" onClick={() => setOpenMod(openMod === mi ? -1 : mi)}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div className="cd-module-num">Section {mi+1}</div>
                        <div className="cd-module-title">{mod.title}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
                        <span style={{fontSize:'12px',color:'var(--text-light)'}}>{mod.videos.length} lessons</span>
                        <i className={`fa-solid fa-chevron-${openMod===mi?'up':'down'}`} style={{fontSize:'12px',color:'var(--text-muted)'}}></i>
                      </div>
                    </button>
                    {openMod === mi && (
                      <div className="cd-lessons">
                        {mod.videos.map((v, vi) => (
                          <div className="cd-lesson-row" key={v.id}>
                            <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,minWidth:0}}>
                              <div className="cd-lesson-icon">
                                {v.is_preview
                                  ? <i className="fa-solid fa-play" style={{color:'var(--orange)'}}></i>
                                  : <i className="fa-solid fa-lock" style={{color:'var(--text-light)'}}></i>
                                }
                              </div>
                              <span className="cd-lesson-title">{v.title}</span>
                              {v.is_preview && <span className="cd-preview-tag">Preview</span>}
                            </div>
                            {v.duration_seconds > 0 && (
                              <span className="cd-lesson-dur">{formatDuration(v.duration_seconds)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Instructor */}
              {course.instructor && (
                <div className="cd-section">
                  <h2 className="cd-section-title">Your Instructor</h2>
                  <div className="cd-instructor-card">
                    <div className="cd-instr-av">
                      {course.instructor.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="cd-instr-name">{course.instructor}</div>
                      <div className="cd-instr-meta">FIP Expert · {course.category}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <div className="cd-bottom-cta">
        <div className="container">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'20px',flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:'18px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>{course.title}</div>
              <div style={{fontSize:'14px',color:'var(--text-muted)'}}>{isFreeForUser ? priceLabel : totalLabel}</div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleEnroll}>
              {profile?.role === 'admin' || isFreeForUser
                ? <><i className="fa-solid fa-play"></i> Start Learning</>
                : <><i className="fa-solid fa-lock-open"></i> Enroll — {priceLabel}</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}