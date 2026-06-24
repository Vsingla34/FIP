import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

const CATEGORIES = ['All','GST','Direct Tax','Corporate Law','FEMA','Audit','Finance','Legal','Technology','Other'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

function calcReadTime(text) {
  const words = (text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function timeAgo(dateStr) {
  const d = new Date(dateStr), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function BlogPage() {
  const { user, profile } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('All');
  const [search,   setSearch]   = useState('');
  const [view,     setView]     = useState('list'); // 'list' | 'write' | 'my'
  const [myPosts,  setMyPosts]  = useState([]);

  /* write form state */
  const [form,     setForm]     = useState({ title:'', subtitle:'', category:'', content:'', tags:'' });
  const [saving,   setSaving]   = useState(false);
  const [editPost, setEditPost] = useState(null);

  /* load approved posts */
  useEffect(() => {
    supabase.from('blog_posts')
      .select('id, slug, title, subtitle, category, author_id, read_time_mins, views, created_at, published_at')
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, []);

  /* load my posts */
  const loadMyPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from('blog_posts')
      .select('id, slug, title, category, status, admin_note, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });
    setMyPosts(data || []);
  };

  useEffect(() => { if (view === 'my') loadMyPosts(); }, [view, user]);

  const filtered = posts.filter(p =>
    (filter === 'All' || p.category === filter) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) ||
     (p.category||'').toLowerCase().includes(search.toLowerCase()))
  );

  /* get author name — we need to fetch profiles separately */
  const [authors, setAuthors] = useState({});
  useEffect(() => {
    if (!posts.length) return;
    const ids = [...new Set(posts.map(p => p.author_id))];
    supabase.from('profiles').select('id, full_name, profession').in('id', ids)
      .then(({ data }) => {
        const map = {};
        (data||[]).forEach(a => { map[a.id] = a; });
        setAuthors(map);
      });
  }, [posts]);

  /* submit or update blog post */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Please log in to write a blog.', true); return; }
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const readTime = calcReadTime(form.content);
    const slug = editPost?.slug || slugify(form.title);

    try {
      if (editPost) {
        const { error } = await supabase.from('blog_posts').update({
          title: form.title.trim(), subtitle: form.subtitle.trim() || null,
          category: form.category || null, content: form.content.trim(),
          tags, read_time_mins: readTime, status: 'pending',
        }).eq('id', editPost.id);
        if (error) throw error;
        showToast('Blog updated and resubmitted for review!');
      } else {
        const { error } = await supabase.from('blog_posts').insert({
          title: form.title.trim(), subtitle: form.subtitle.trim() || null,
          slug, category: form.category || null, content: form.content.trim(),
          tags, read_time_mins: readTime, author_id: user.id, status: 'pending',
        });
        if (error) throw error;
        showToast('Blog submitted for review! Admin will approve shortly.');
      }
      setForm({ title:'', subtitle:'', category:'', content:'', tags:'' });
      setEditPost(null);
      setView('my');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit. Please try again.', true);
    } finally { setSaving(false); }
  };

  const handleEdit = (post) => {
    setForm({ title: post.title, subtitle: post.subtitle||'', category: post.category||'', content: post.content||'', tags: (post.tags||[]).join(', ') });
    setEditPost(post);
    setView('write');
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this blog post?')) return;
    await supabase.from('blog_posts').delete().eq('id', postId);
    setMyPosts(prev => prev.filter(p => p.id !== postId));
    showToast('Post deleted.');
  };

  const getInitials = (name) =>
    (name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';

  const statusColor = { pending:'#F59E0B', approved:'var(--green)', rejected:'#EF4444', draft:'var(--text-light)' };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Blog</span></div>
          <h1>FIP Knowledge Blog</h1>
          <p>Insights, analysis and updates from FIP's professional community.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">

          {/* ── Tab bar ── */}
          <div className="blog-tab-bar">
            <div className="blog-tabs">
              <button className={`blog-tab${view==='list'?' active':''}`} onClick={() => setView('list')}>
                <i className="fa-solid fa-newspaper"></i> All Articles
              </button>
              {user && (
                <>
                  <button className={`blog-tab${view==='my'?' active':''}`} onClick={() => setView('my')}>
                    <i className="fa-solid fa-user-pen"></i> My Posts
                  </button>
                  <button className={`blog-tab${view==='write'?' active':''}`} onClick={() => { setView('write'); setEditPost(null); setForm({title:'',subtitle:'',category:'',content:'',tags:''}); }}>
                    <i className="fa-solid fa-pen-to-square"></i> Write Article
                  </button>
                </>
              )}
            </div>
            {!user && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
                <i className="fa-solid fa-pen"></i> Write for FIP
              </button>
            )}
          </div>

          {/* ════════════ BLOG LIST ════════════ */}
          {view === 'list' && (
            <>
              <div className="blog-filter-bar">
                <div className="search-wrap" style={{marginBottom:0,flex:1}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search articles…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="filter-pills" style={{marginBottom:0}}>
                  {CATEGORIES.map(c=>(
                    <div key={c} className={`fpill${filter===c?' active':''}`} onClick={()=>setFilter(c)}>{c}</div>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',display:'block',marginBottom:'12px',color:'var(--orange)'}}></i>
                  Loading articles…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-newspaper" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  {posts.length === 0
                    ? 'No articles published yet. Be the first to write one!'
                    : 'No articles match your search.'
                  }
                  {user && <button className="btn btn-primary btn-sm" style={{marginTop:'16px'}} onClick={()=>setView('write')}><i className="fa-solid fa-pen"></i> Write an Article</button>}
                </div>
              ) : (
                <div className="blog-grid">
                  {filtered.map(post => {
                    const author = authors[post.author_id];
                    return (
                      <Link to={`/blog/${post.slug}`} className="blog-card" key={post.id}>
                        <div className="blog-card-top">
                          {post.category && <span className="blog-cat-pill">{post.category}</span>}
                          <span className="blog-time">{timeAgo(post.published_at || post.created_at)}</span>
                        </div>
                        <h3 className="blog-card-title">{post.title}</h3>
                        {post.subtitle && <p className="blog-card-sub">{post.subtitle}</p>}
                        <div className="blog-card-footer">
                          <div className="blog-author-mini">
                            <div className="blog-av">{getInitials(author?.full_name)}</div>
                            <div>
                              <div className="blog-author-name">{author?.full_name || 'FIP Member'}</div>
                              <div className="blog-author-role">{author?.profession || ''}</div>
                            </div>
                          </div>
                          <div className="blog-card-meta">
                            <span><i className="fa-regular fa-clock"></i> {post.read_time_mins || 1} min</span>
                            {post.views > 0 && <span><i className="fa-regular fa-eye"></i> {post.views}</span>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ WRITE ARTICLE ════════════ */}
          {view === 'write' && (
            <div className="blog-write-wrap">
              <div className="blog-write-header">
                <h2>{editPost ? 'Edit Article' : 'Write an Article'}</h2>
                <p>{editPost ? 'Update your article and resubmit for review.' : 'Share your knowledge with the FIP community. Your article will be reviewed by our admin team before publishing.'}</p>
              </div>

              <div className="blog-write-notice">
                <i className="fa-solid fa-shield-check" style={{color:'var(--green)'}}></i>
                <span>All articles are reviewed before publishing to maintain quality and accuracy.</span>
              </div>

              <form onSubmit={handleSubmit} className="blog-form">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" type="text" placeholder="e.g. Key Changes in GST for FY 2026-27"
                    value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required style={{fontSize:'16px',fontWeight:600}}/>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Subtitle / Summary</label>
                    <input className="form-input" type="text" placeholder="Brief description of your article"
                      value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                      <option value="">Select category</option>
                      {CATEGORIES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Article Content *</label>
                  <div className="blog-content-hint">
                    <i className="fa-solid fa-circle-info"></i>
                    You can use blank lines to separate paragraphs. Write naturally — no formatting codes needed.
                  </div>
                  <textarea className="form-textarea blog-content-area"
                    placeholder="Write your article here…

Start with an introduction, then cover your main points clearly. Share examples, case studies, or recent developments that would help fellow CAs, CSs and legal professionals.

Use blank lines to separate paragraphs."
                    value={form.content}
                    onChange={e=>setForm(f=>({...f,content:e.target.value}))}
                    required/>
                  <div className="blog-content-counter">
                    {form.content.split(/\s+/).filter(Boolean).length} words
                    {form.content.trim() && ` · ~${calcReadTime(form.content)} min read`}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags <span style={{fontWeight:400,color:'var(--text-light)'}}>— comma separated</span></label>
                  <input className="form-input" type="text" placeholder="e.g. GST, Input Tax Credit, FY2027"
                    value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/>
                </div>

                <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                  <button type="submit" className="btn btn-primary" disabled={saving||!form.title.trim()||!form.content.trim()}>
                    {saving
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</>
                      : <><i className="fa-solid fa-paper-plane"></i> {editPost ? 'Update & Resubmit' : 'Submit for Review'}</>
                    }
                  </button>
                  <button type="button" className="btn btn-outline-blue" onClick={() => { setView('list'); setEditPost(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* ════════════ MY POSTS ════════════ */}
          {view === 'my' && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
                <h2 style={{fontSize:'18px',fontWeight:700,color:'var(--blue)'}}>My Articles ({myPosts.length})</h2>
                <button className="btn btn-primary btn-sm" onClick={()=>{setView('write');setEditPost(null);setForm({title:'',subtitle:'',category:'',content:'',tags:''});}}>
                  <i className="fa-solid fa-plus"></i> Write New Article
                </button>
              </div>

              {myPosts.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-user-pen" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p>You haven't written any articles yet.</p>
                  <button className="btn btn-primary btn-sm" style={{marginTop:'16px'}} onClick={()=>setView('write')}>
                    <i className="fa-solid fa-pen"></i> Write Your First Article
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {myPosts.map(post => (
                    <div key={post.id} className="blog-my-card">
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{post.title}</span>
                          <span style={{
                            padding:'2px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                            background:`${statusColor[post.status]}18`,
                            color:statusColor[post.status],
                            border:`1px solid ${statusColor[post.status]}40`,
                          }}>
                            {post.status.charAt(0).toUpperCase()+post.status.slice(1)}
                          </span>
                        </div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                          {post.category && <span style={{marginRight:'10px'}}>{post.category}</span>}
                          {timeAgo(post.created_at)}
                        </div>
                        {post.status === 'rejected' && post.admin_note && (
                          <div style={{marginTop:'8px',background:'#FFF0EE',border:'1px solid #F5BDBA',borderRadius:'6px',padding:'8px 12px',fontSize:'12px',color:'#C0392B'}}>
                            <i className="fa-solid fa-circle-info" style={{marginRight:'6px'}}></i>
                            Admin note: {post.admin_note}
                          </div>
                        )}
                        {post.status === 'approved' && (
                          <div style={{marginTop:'8px',fontSize:'12px',color:'var(--green)',display:'flex',alignItems:'center',gap:'5px'}}>
                            <i className="fa-solid fa-check-circle"></i> Published · <Link to={`/blog/${post.slug}`} style={{color:'var(--green)',fontWeight:600}}>View Article →</Link>
                          </div>
                        )}
                        {post.status === 'pending' && (
                          <div style={{marginTop:'8px',fontSize:'12px',color:'#F59E0B',display:'flex',alignItems:'center',gap:'5px'}}>
                            <i className="fa-solid fa-clock"></i> Awaiting admin review
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                        {(post.status === 'pending' || post.status === 'rejected' || post.status === 'draft') && (
                          <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}}
                            onClick={async () => {
                              const { data } = await supabase.from('blog_posts').select('*').eq('id', post.id).single();
                              if (data) handleEdit(data);
                            }}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                        )}
                        <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(post.id)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}