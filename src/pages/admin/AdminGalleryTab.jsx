import * as React from 'react';

export default function AdminGalleryTab({
  galleryEventId, setGalleryEventId, galleryEvents,
  galleryCaption, setGalleryCaption, galleryUploading, uploadGalleryImage,
  galleryLoading, galleryImages, moveGalleryImage, deleteGalleryImage,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title" style={{marginBottom:'4px'}}>Event Gallery</div>
      <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>
        Upload photos from events — shown publicly on the Gallery page.
        Tagging a photo with an event is optional.
      </p>

      {/* Upload form */}
      <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px',marginBottom:'24px'}}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Event <span style={{fontWeight:400,color:'var(--text-light)'}}>(optional)</span></label>
            <select className="form-select" value={galleryEventId} onChange={e=>setGalleryEventId(e.target.value)}>
              <option value="">No specific event</option>
              {galleryEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Caption <span style={{fontWeight:400,color:'var(--text-light)'}}>(optional)</span></label>
            <input className="form-input" type="text" placeholder="e.g. Keynote session"
              value={galleryCaption} onChange={e=>setGalleryCaption(e.target.value)}/>
          </div>
        </div>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="form-label">Photo <span style={{fontWeight:400,color:'var(--text-light)'}}>— max 8MB</span></label>
          <input className="form-input" type="file" accept="image/*" disabled={galleryUploading}
            onChange={e => { uploadGalleryImage(e.target.files[0]); e.target.value = ''; }}/>
          {galleryUploading && (
            <div style={{fontSize:'12px',color:'var(--blue)',marginTop:'8px'}}>
              <i className="fa-solid fa-spinner fa-spin"></i> Uploading…
            </div>
          )}
        </div>
      </div>

      {galleryLoading ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
        </div>
      ) : galleryImages.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-light)'}}>
          <i className="fa-solid fa-images" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
          No photos uploaded yet.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'16px'}}>
          {galleryImages.map((img, idx) => (
            <div key={img.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius-md)',overflow:'hidden',background:'#fff'}}>
              <div style={{aspectRatio:'4/3',overflow:'hidden',background:'var(--off-white)'}}>
                <img src={img.image_url} alt={img.caption||''} style={{width:'100%',height:'100%',objectFit:'cover'}}
                  onError={e=>e.target.style.opacity=0.3}/>
              </div>
              <div style={{padding:'10px 12px'}}>
                {img.caption && <div style={{fontSize:'12.5px',fontWeight:600,color:'var(--blue)',marginBottom:'2px'}}>{img.caption}</div>}
                {img.event_name && <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'8px'}}>{img.event_name}</div>}
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={() => moveGalleryImage(idx,-1)} disabled={idx===0}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:idx===0?'default':'pointer',opacity:idx===0?0.4:1}}>
                    <i className="fa-solid fa-chevron-left" style={{fontSize:'10px'}}></i>
                  </button>
                  <button onClick={() => moveGalleryImage(idx,1)} disabled={idx===galleryImages.length-1}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:idx===galleryImages.length-1?'default':'pointer',opacity:idx===galleryImages.length-1?0.4:1}}>
                    <i className="fa-solid fa-chevron-right" style={{fontSize:'10px'}}></i>
                  </button>
                  <button onClick={() => deleteGalleryImage(img)}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:'pointer',color:'#DC2626',marginLeft:'auto'}}>
                    <i className="fa-solid fa-trash" style={{fontSize:'10px'}}></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}