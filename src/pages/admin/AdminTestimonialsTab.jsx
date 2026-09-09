import * as React from 'react';

// Extracted from AdminPage.jsx as-is — a mechanical move, not a rewrite.
// All state and handlers still live in AdminPage.jsx; this component only
// owns the rendering. Deliberately preserves existing behavior exactly,
// including the fact that testiSearch is captured but not currently used to
// filter the list below — that's how it already worked before this move,
// not something introduced here.
export default function AdminTestimonialsTab({
  testimonials, testiFilter, setTestiFilter,
  testiSearch, setTestiSearch,
  testiLoading, handleTestiAction,
}) {
  return (
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
          value={testiSearch} onChange={e=>setTestiSearch(e.target.value)}/>
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
  );
}