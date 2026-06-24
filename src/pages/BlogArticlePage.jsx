import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post,   setPost]   = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: p, error } = await supabase
        .from('blog_posts').select('*').eq('slug', slug).eq('status','approved').single();
      if (error || !p) { navigate('/blog'); return; }
      setPost(p);

      // increment views
      await supabase.from('blog_posts').update({ views: (p.views||0)+1 }).eq('id', p.id);

      // load author
      const { data: a } = await supabase.from('profiles')
        .select('full_name, profession, city, avatar_url').eq('id', p.author_id).single();
      setAuthor(a);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'12px',color:'var(--text-muted)'}}>
      <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',color:'var(--orange)'}}></i>
      <span>Loading article…</span>
    </div>
  );
  if (!post) return null;

  const getInitials = (name) =>
    (name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});

  /* render content — split on double newlines → paragraphs */
  const paragraphs = (post.content||'').split(/\n{2,}/).filter(Boolean);

  return (
    <>
      {/* ── Hero ── */}
      <div className="ba-hero">
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'20px'}}>
            <Link to="/blog" style={{color:'rgba(255,255,255,0.55)',textDecoration:'none'}}>Blog</Link>
            <i className="fa-solid fa-chevron-right" style={{color:'rgba(255,255,255,0.3)'}}></i>
            {post.category && <span style={{color:'rgba(255,255,255,0.55)'}}>{post.category}</span>}
            {post.category && <i className="fa-solid fa-chevron-right" style={{color:'rgba(255,255,255,0.3)'}}></i>}
            <span style={{color:'rgba(255,255,255,0.85)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'200px'}}>{post.title}</span>
          </div>

          {post.category && (
            <div style={{display:'inline-block',background:'rgba(242,101,34,0.25)',border:'1px solid rgba(242,101,34,0.4)',color:'#FFD09B',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1.5px',padding:'4px 14px',borderRadius:'20px',marginBottom:'16px'}}>
              {post.category}
            </div>
          )}

          <h1 className="ba-title">{post.title}</h1>
          {post.subtitle && <p className="ba-subtitle">{post.subtitle}</p>}

          <div className="ba-meta">
            <div className="ba-author">
              {author?.avatar_url
                ? <img src={author.avatar_url} alt="" className="ba-av-img"/>
                : <div className="ba-av">{getInitials(author?.full_name)}</div>
              }
              <div>
                <div className="ba-author-name">{author?.full_name || 'FIP Member'}</div>
                <div className="ba-author-role">{author?.profession}{author?.city ? ` · ${author.city}` : ''}</div>
              </div>
            </div>
            <div className="ba-stats">
              <span><i className="fa-regular fa-calendar"></i> {formatDate(post.published_at||post.created_at)}</span>
              <span><i className="fa-regular fa-clock"></i> {post.read_time_mins||1} min read</span>
              {post.views > 0 && <span><i className="fa-regular fa-eye"></i> {post.views} views</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Article body ── */}
      <section className="section">
        <div className="container">
          <div className="ba-layout">
            <article className="ba-content">
              {paragraphs.map((para, i) => {
                // Detect headings (lines starting with ## or #)
                if (para.startsWith('## ')) return <h2 className="ba-h2" key={i}>{para.slice(3)}</h2>;
                if (para.startsWith('# '))  return <h2 className="ba-h2" key={i}>{para.slice(2)}</h2>;
                if (para.startsWith('### ')) return <h3 className="ba-h3" key={i}>{para.slice(4)}</h3>;
                return <p className="ba-para" key={i}>{para}</p>;
              })}

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="ba-tags">
                  <span className="ba-tags-label">Tags:</span>
                  {post.tags.map((t,i) => <span key={i} className="ba-tag">{t}</span>)}
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="ba-sidebar">
              <div className="ba-sidebar-card">
                <div className="ba-sidebar-title">About the Author</div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                  {author?.avatar_url
                    ? <img src={author.avatar_url} alt="" style={{width:'48px',height:'48px',borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                    : <div className="ba-av" style={{width:'48px',height:'48px',fontSize:'16px',flexShrink:0}}>{getInitials(author?.full_name)}</div>
                  }
                  <div>
                    <div style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{author?.full_name||'FIP Member'}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{author?.profession}</div>
                  </div>
                </div>
                {author?.city && <div style={{fontSize:'12px',color:'var(--text-light)',marginBottom:'12px'}}><i className="fa-solid fa-location-dot" style={{color:'var(--orange)',marginRight:'5px'}}></i>{author.city}</div>}
                <Link to="/blog" className="btn btn-outline-blue btn-sm" style={{width:'100%',justifyContent:'center'}}>
                  More Articles
                </Link>
              </div>

              <div className="ba-sidebar-card" style={{marginTop:'16px',background:'linear-gradient(135deg,var(--blue),#1B4A9E)',color:'#fff'}}>
                <div style={{fontWeight:700,fontSize:'15px',marginBottom:'8px'}}>Write for FIP</div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',lineHeight:1.6,marginBottom:'14px'}}>Share your expertise with 3,000+ finance professionals. Submit an article today.</p>
                <Link to="/blog" className="btn btn-sm" style={{background:'var(--orange)',color:'#fff',border:'none',width:'100%',justifyContent:'center'}}>
                  <i className="fa-solid fa-pen"></i> Start Writing
                </Link>
              </div>
            </aside>
          </div>

          <div style={{marginTop:'32px',paddingTop:'24px',borderTop:'1px solid var(--border)'}}>
            <Link to="/blog" style={{color:'var(--orange)',fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'6px'}}>
              <i className="fa-solid fa-arrow-left"></i> Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}