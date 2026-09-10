import * as React from 'react';

// Extracted from AdminPage.jsx as-is. All state/handlers still live in the
// parent; this component only owns rendering.
export default function AdminBlogTab({
  blogFilter, setBlogFilter, blogPosts,
  blogSearch, setBlogSearch,
  blogLoading, dBlogSearch, blogAuthors, handleBlogAction,
}) {
  return (
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
          value={blogSearch} onChange={e=>setBlogSearch(e.target.value)}/>
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
  );
}   
