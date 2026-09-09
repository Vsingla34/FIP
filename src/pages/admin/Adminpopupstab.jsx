import * as React from 'react';

export default function AdminPopupsTab({
  tab, popups, popupsLoading,
  popupForm, setPopupForm, popupModal, setPopupModal,
  togglePopup, deletePopup, savePopup,
}) {
  return (
    <>
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

      {/* ── Popup Create/Edit Modal — sibling conditional, not nested under
           the tab check, since it can be triggered and stay open regardless
           of which tab happens to be active */}
      {popupModal && (
        <div className="modal-overlay">
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
    </>
  );
}