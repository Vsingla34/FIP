import * as React from 'react';

const SLIDE_ACTIONS = ['join','courses','events','webinars','committees','directory','about','membership'];
const emptySlide = { image_url:'', badge:'', title:'', subtitle:'', description:'', btn_label:'', btn_action:'join', tag:'', sort_order:0, is_active:true };

export default function AdminSlidesTab({
  editingSlideId, setEditingSlideId, slideForm, setSlideForm,
  slideSaving, setSlideSaving, supabase, showToast, setSlides, slides, slidesLoading,
}) {
  return (
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
  );
}