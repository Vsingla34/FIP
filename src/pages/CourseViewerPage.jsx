import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

/* ── extract YouTube video ID from any YouTube URL ── */
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // assume it's already a video ID if no URL pattern matches
  return url.length === 11 ? url : null;
}

/* ── format seconds to mm:ss or hh:mm:ss ── */
function formatTime(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

export default function CourseViewerPage() {
  const { slug } = useParams();
  const { user, profile } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [course,    setCourse]    = useState(null);
  const [modules,   setModules]   = useState([]); // [{module, videos:[]}]
  const [activeVid, setActiveVid] = useState(null);
  const [progress,  setProgress]  = useState({}); // video_id -> {percent, completed}
  const [bookmarks, setBookmarks] = useState([]); // for active video
  const [certificate, setCertificate] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const [bookmarkNote,    setBookmarkNote]    = useState('');
  const [showBookmarkBox, setShowBookmarkBox] = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [sidebarOpen,     setSidebarOpen]     = useState(true);

  const iframeRef = useRef(null);

  /* ── load course ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. Load course — don't filter by status, RLS handles visibility
      const { data: c, error: courseErr } = await supabase
        .from('courses').select('*').eq('slug', slug).single();

      if (courseErr || !c) {
        console.error('Course not found:', courseErr);
        navigate('/courses');
        return;
      }
      setCourse(c);

      // 2. Load modules + videos
      const { data: content } = await supabase.rpc('get_course_content', { p_course_id: c.id });
      if (content) {
        const grouped = {};
        content.forEach(row => {
          if (!grouped[row.module_id]) {
            grouped[row.module_id] = {
              id: row.module_id, title: row.module_title, order: row.module_order, videos: []
            };
          }
          if (row.video_id) {
            grouped[row.module_id].videos.push({
              id: row.video_id, title: row.video_title, youtube_url: row.youtube_url,
              duration_seconds: row.duration_seconds, sort_order: row.sort_order,
              is_preview: row.is_preview,
            });
          }
        });
        const mods = Object.values(grouped).sort((a,b) => a.order - b.order);
        setModules(mods);

        // auto-select first video
        const first = mods[0]?.videos[0];
        if (first) setActiveVid(first);
      }

      // 3. Load progress (if logged in)
      if (user) {
        const { data: prog } = await supabase
          .from('video_progress').select('*').eq('user_id', user.id).eq('course_id', c.id);
        if (prog) {
          const map = {};
          prog.forEach(p => { map[p.video_id] = p; });
          setProgress(map);
        }

        // 4. Check certificate
        const { data: cert } = await supabase
          .from('certificates').select('*').eq('user_id', user.id).eq('course_id', c.id).single();
        if (cert) setCertificate(cert);
      }

      setLoading(false);
    };
    load();
  }, [slug, user]);

  /* ── load bookmarks when active video changes ── */
  useEffect(() => {
    if (!user || !activeVid) return;
    supabase.from('video_bookmarks')
      .select('*').eq('user_id', user.id).eq('video_id', activeVid.id)
      .order('timestamp_seconds')
      .then(({ data }) => setBookmarks(data || []));
  }, [user, activeVid]);

  /* ── mark video complete ── */
  const markComplete = async (videoId) => {
    if (!user || !course) return;
    await supabase.from('video_progress').upsert({
      user_id: user.id, video_id: videoId, course_id: course.id,
      completed: true, percent_watched: 100,
    }, { onConflict: 'user_id,video_id' });
    setProgress(prev => ({ ...prev, [videoId]: { ...prev[videoId], completed: true, percent_watched: 100 } }));
    showToast('Lesson marked as complete!');
  };

  /* ── add bookmark ── */
  const addBookmark = async () => {
    if (!user || !activeVid) return;
    const { data, error } = await supabase.from('video_bookmarks').insert({
      user_id: user.id, video_id: activeVid.id,
      timestamp_seconds: currentTime,
      note: bookmarkNote.trim() || null,
    }).select().single();
    if (!error && data) {
      setBookmarks(prev => [...prev, data].sort((a,b) => a.timestamp_seconds - b.timestamp_seconds));
      setBookmarkNote('');
      setShowBookmarkBox(false);
      showToast(`Bookmark added at ${formatTime(currentTime)}`);
    }
  };

  /* ── delete bookmark ── */
  const deleteBookmark = async (id) => {
    await supabase.from('video_bookmarks').delete().eq('id', id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  /* ── download certificate ── */
  const downloadCertificate = () => {
    if (!certificate || !course || !profile) return;
    const certWindow = window.open('', '_blank');
    const html = generateCertificateHTML(profile, course, certificate);
    certWindow.document.write(html);
    certWindow.document.close();
    setTimeout(() => certWindow.print(), 500);
  };

  /* ── YouTube embed URL ── */
  const getEmbedUrl = (video) => {
    if (!video) return '';
    const id = getYouTubeId(video.youtube_url);
    if (!id) return '';
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&showinfo=0&enablejsapi=1`;
  };

  /* ── completed video count ── */
  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const totalVideos    = modules.reduce((sum, m) => sum + m.videos.length, 0);
  const coursePercent  = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px',color:'var(--text-muted)'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
      <span>Loading course…</span>
    </div>
  );

  if (!course) return null;

  return (
    <div className="lms-wrap">

      {/* ── Top bar ── */}
      <div className="lms-topbar">
        <div className="lms-topbar-left">
          <Link to={`/courses/${slug}`} className="lms-back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div className="lms-course-title-top">{course.title}</div>
        </div>
        <div className="lms-topbar-right">
          <div className="lms-progress-mini">
            <div className="lms-progress-fill" style={{width:`${coursePercent}%`}}></div>
          </div>
          <span className="lms-progress-label">{coursePercent}% complete</span>
          {certificate && (
            <button className="btn btn-primary btn-sm" onClick={downloadCertificate}>
              <i className="fa-solid fa-certificate"></i> Download Certificate
            </button>
          )}
          <button className="lms-sidebar-toggle" onClick={() => setSidebarOpen(o=>!o)}>
            <i className={`fa-solid ${sidebarOpen?'fa-chevron-right':'fa-bars'}`}></i>
          </button>
        </div>
      </div>

      <div className={`lms-layout${sidebarOpen?'':' sidebar-hidden'}`}>

        {/* ── Video player area ── */}
        <div className="lms-player-area">

          {/* Player */}
          <div className="lms-player-box">
            {activeVid ? (
              getYouTubeId(activeVid.youtube_url) ? (
                <iframe
                  ref={iframeRef}
                  src={getEmbedUrl(activeVid)}
                  title={activeVid.title}
                  className="lms-iframe"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="lms-no-video">
                  <i className="fa-solid fa-video-slash"></i>
                  <p>Invalid YouTube URL for this video.</p>
                </div>
              )
            ) : (
              <div className="lms-no-video">
                <i className="fa-solid fa-play-circle"></i>
                <p>Select a lesson to begin.</p>
              </div>
            )}
          </div>

          {/* Video controls bar */}
          {activeVid && (
            <div className="lms-controls-bar">
              <div className="lms-vid-info">
                <div className="lms-vid-title">{activeVid.title}</div>
                {activeVid.duration_seconds > 0 && (
                  <div className="lms-vid-duration">
                    <i className="fa-regular fa-clock"></i> {formatTime(activeVid.duration_seconds)}
                  </div>
                )}
              </div>
              <div className="lms-ctrl-btns">
                {/* Bookmark button */}
                <button className="lms-ctrl-btn" onClick={() => setShowBookmarkBox(b => !b)} title="Add bookmark">
                  <i className="fa-solid fa-bookmark"></i> Bookmark
                </button>
                {/* Mark complete */}
                {user && !progress[activeVid.id]?.completed && (
                  <button className="lms-ctrl-btn lms-ctrl-complete" onClick={() => markComplete(activeVid.id)}>
                    <i className="fa-solid fa-check-circle"></i> Mark Complete
                  </button>
                )}
                {progress[activeVid.id]?.completed && (
                  <span className="lms-completed-badge">
                    <i className="fa-solid fa-check-circle"></i> Completed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bookmark input box */}
          {showBookmarkBox && (
            <div className="lms-bookmark-box">
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)',marginBottom:'8px'}}>
                <i className="fa-solid fa-bookmark" style={{color:'var(--orange)',marginRight:'6px'}}></i>
                Add Bookmark
              </div>
              <input
                className="form-input" type="text"
                placeholder="Note (optional) — e.g. 'Important GST ruling here'"
                value={bookmarkNote}
                onChange={e => setBookmarkNote(e.target.value)}
                style={{marginBottom:'10px'}}
              />
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn btn-primary btn-sm" onClick={addBookmark}>
                  <i className="fa-solid fa-plus"></i> Save Bookmark
                </button>
                <button className="btn btn-outline-blue btn-sm" onClick={() => setShowBookmarkBox(false)}>Cancel</button>
              </div>
              {!user && <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'8px'}}>Log in to save bookmarks.</p>}
            </div>
          )}

          {/* Bookmarks list */}
          {bookmarks.length > 0 && (
            <div className="lms-bookmarks-list">
              <div className="lms-section-label">
                <i className="fa-solid fa-bookmark"></i> Your Bookmarks ({bookmarks.length})
              </div>
              {bookmarks.map(b => (
                <div className="lms-bookmark-item" key={b.id}>
                  <span className="lms-bookmark-time">{formatTime(b.timestamp_seconds)}</span>
                  <span className="lms-bookmark-note">{b.note || 'Bookmarked moment'}</span>
                  <button className="lms-bookmark-del" onClick={() => deleteBookmark(b.id)} title="Remove bookmark">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Course completion / certificate */}
          {certificate && (
            <div className="lms-cert-banner">
              <i className="fa-solid fa-certificate"></i>
              <div>
                <div style={{fontWeight:700,marginBottom:'2px'}}>Certificate Issued!</div>
                <div style={{fontSize:'13px',opacity:.85}}>
                  {certificate.certificate_number} · Issued {new Date(certificate.issued_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                </div>
              </div>
              <button className="btn btn-sm" style={{background:'#fff',color:'var(--green)',fontWeight:700,border:'none',marginLeft:'auto'}} onClick={downloadCertificate}>
                <i className="fa-solid fa-download"></i> Download
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar: course content ── */}
        {sidebarOpen && (
          <div className="lms-sidebar">
            <div className="lms-sidebar-header">
              <div className="lms-sidebar-title">Course Content</div>
              <div className="lms-sidebar-meta">{totalVideos} lessons · {completedCount} completed</div>
              <div className="lms-sidebar-prog-wrap">
                <div className="lms-sidebar-prog-fill" style={{width:`${coursePercent}%`}}></div>
              </div>
            </div>

            {modules.length === 0 ? (
            <div style={{padding:'24px 16px',textAlign:'center',color:'rgba(255,255,255,0.35)'}}>
              <i className="fa-solid fa-circle-info" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>
              <div style={{fontSize:'12px',lineHeight:1.6}}>No lessons added yet.<br/>Check back soon.</div>
            </div>
          ) : modules.map((mod, mi) => (
              <div className="lms-module" key={mod.id}>
                <div className="lms-module-header">
                  <span className="lms-module-num">Section {mi + 1}</span>
                  <span className="lms-module-title">{mod.title}</span>
                </div>
                {mod.videos.map(vid => {
                  const done = progress[vid.id]?.completed;
                  const active = activeVid?.id === vid.id;
                  return (
                    <div
                      key={vid.id}
                      className={`lms-lesson${active?' lms-lesson-active':''}${done?' lms-lesson-done':''}`}
                      onClick={() => setActiveVid(vid)}
                    >
                      <div className={`lms-lesson-icon${done?' done':''}${active?' active':''}`}>
                        {done
                          ? <i className="fa-solid fa-check"></i>
                          : active
                          ? <i className="fa-solid fa-pause"></i>
                          : <i className="fa-solid fa-play"></i>
                        }
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="lms-lesson-title">{vid.title}</div>
                        {vid.duration_seconds > 0 && (
                          <div className="lms-lesson-duration">{formatTime(vid.duration_seconds)}</div>
                        )}
                      </div>
                      {vid.is_preview && <span className="lms-preview-tag">Preview</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Certificate HTML generator (opens in new tab for printing/saving as PDF) ── */
function generateCertificateHTML(profile, course, certificate) {
  const name = profile?.full_name || 'Member';
  const date = new Date(certificate.issued_at).toLocaleDateString('en-IN', {
    day:'numeric', month:'long', year:'numeric'
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Certificate — ${course.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#f0f2f8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:'Inter',sans-serif;}
    .cert{
      background:#fff;width:900px;min-height:640px;
      border:3px solid #1A3C6E;
      border-radius:12px;padding:60px 80px;
      position:relative;overflow:hidden;
    }
    .cert::before{
      content:'';position:absolute;inset:10px;border:1px solid rgba(242,101,34,0.3);border-radius:8px;pointer-events:none;
    }
    .cert-watermark{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-size:180px;font-weight:900;color:rgba(26,60,110,0.03);
      font-family:'Playfair Display',serif;pointer-events:none;letter-spacing:-4px;
    }
    .cert-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;}
    .cert-logo{font-family:'Playfair Display',serif;font-size:28px;font-weight:800;color:#1A3C6E;letter-spacing:-1px;}
    .cert-logo span{color:#F26522;}
    .cert-date{font-size:13px;color:#888;}
    .cert-divider{height:3px;background:linear-gradient(90deg,#1A3C6E,#F26522,#1A3C6E);border-radius:2px;margin-bottom:40px;}
    .cert-heading{font-size:13px;font-weight:700;color:#F26522;text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:12px;}
    .cert-main-title{font-family:'Playfair Display',serif;font-size:38px;font-weight:800;color:#1A3C6E;text-align:center;margin-bottom:20px;}
    .cert-presented{font-size:15px;color:#666;text-align:center;margin-bottom:6px;}
    .cert-name{font-family:'Playfair Display',serif;font-size:48px;font-weight:700;font-style:italic;color:#1A3C6E;text-align:center;margin-bottom:20px;border-bottom:2px dashed rgba(242,101,34,0.3);padding-bottom:16px;}
    .cert-course-label{font-size:14px;color:#888;text-align:center;margin-bottom:8px;}
    .cert-course-name{font-size:22px;font-weight:700;color:#1A3C6E;text-align:center;margin-bottom:32px;}
    .cert-meta{display:flex;justify-content:center;gap:40px;margin-bottom:40px;}
    .cert-meta-item{text-align:center;}
    .cert-meta-label{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
    .cert-meta-value{font-size:16px;font-weight:700;color:#1A3C6E;}
    .cert-footer{display:flex;align-items:flex-end;justify-content:space-between;margin-top:20px;padding-top:20px;border-top:1px solid #eee;}
    .cert-sig{text-align:center;}
    .cert-sig-line{width:160px;height:1px;background:#1A3C6E;margin-bottom:6px;}
    .cert-sig-name{font-size:13px;font-weight:700;color:#1A3C6E;}
    .cert-sig-title{font-size:11px;color:#888;}
    .cert-num{font-size:11px;color:#aaa;text-align:right;}
    @media print{
      body{background:#fff;padding:0;}
      .cert{border:3px solid #1A3C6E;width:100%;}
      @page{size:A4 landscape;margin:0;}
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-watermark">FIP</div>
    <div class="cert-top">
      <div class="cert-logo">F<span>|</span>P</div>
      <div class="cert-date">Issued on ${date}</div>
    </div>
    <div class="cert-divider"></div>
    <div class="cert-heading">Certificate of Completion</div>
    <div class="cert-main-title">This is to certify that</div>
    <div class="cert-presented">this certificate is proudly presented to</div>
    <div class="cert-name">${name}</div>
    <div class="cert-course-label">has successfully completed the course</div>
    <div class="cert-course-name">${course.title}</div>
    <div class="cert-meta">
      <div class="cert-meta-item">

      </div>
      <div class="cert-meta-item">
        <div class="cert-meta-label">Category</div>
        <div class="cert-meta-value">${course.category || 'Professional Development'}</div>
      </div>
      <div class="cert-meta-item">
        <div class="cert-meta-label">Level</div>
        <div class="cert-meta-value">${course.level || 'Intermediate'}</div>
      </div>
    </div>
    <div class="cert-footer">
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">CA Gaurav Aggrawal</div>
        <div class="cert-sig-title">President, Federation of Indian Professionals</div>
      </div>
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">Authorised Signatory</div>
        <div class="cert-sig-title">FIP Certification Committee</div>
      </div>
      <div class="cert-num">
        Certificate No: ${certificate.certificate_number}<br/>
        Issued by: Federation of Indian Professionals<br/>
        www.fipin.org
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      document.title = "FIP Certificate — ${course.title} — ${name}";
    };
  </script>
</body>
</html>`;
}