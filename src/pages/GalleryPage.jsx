import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function GalleryPage() {
  const [loading, setLoading]   = useState(true);
  const [images,  setImages]    = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null); // the currently enlarged image, or null

  useEffect(() => {
    supabase.from('gallery_images').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { setImages(data || []); setLoading(false); });
  }, []);

  // Every distinct event that has at least one photo, for the filter chips
  const eventOptions = [...new Map(
    images.filter(i => i.event_id && i.event_name).map(i => [i.event_id, i.event_name])
  ).entries()];

  const filtered = eventFilter === 'all' ? images : images.filter(i => i.event_id === eventFilter);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Gallery</span></div>
          <h1>Event Gallery</h1>
          <p>Moments from FIP events, conferences, and gatherings across the country.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">

          {loading ? (
            <div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'26px',display:'block',marginBottom:'12px'}}></i>
              Loading…
            </div>

          ) : images.length === 0 ? (
            <div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-light)'}}>
              <i className="fa-solid fa-images" style={{fontSize:'32px',display:'block',marginBottom:'14px',opacity:.4}}></i>
              No photos yet. Check back after our next event.
            </div>

          ) : (
            <>
              {eventOptions.length > 0 && (
                <div style={{display:'flex',gap:'8px',marginBottom:'26px',flexWrap:'wrap'}}>
                  <button onClick={() => setEventFilter('all')}
                    style={{
                      padding:'7px 18px', borderRadius:'20px', fontSize:'13px', fontWeight:700,
                      cursor:'pointer', border:'1.5px solid ' + (eventFilter==='all' ? 'var(--blue)' : 'var(--border)'),
                      background: eventFilter==='all' ? 'var(--blue)' : 'transparent',
                      color: eventFilter==='all' ? '#fff' : 'var(--text-muted)',
                    }}>
                    All Photos
                  </button>
                  {eventOptions.map(([id, name]) => (
                    <button key={id} onClick={() => setEventFilter(id)}
                      style={{
                        padding:'7px 18px', borderRadius:'20px', fontSize:'13px', fontWeight:700,
                        cursor:'pointer', border:'1.5px solid ' + (eventFilter===id ? 'var(--blue)' : 'var(--border)'),
                        background: eventFilter===id ? 'var(--blue)' : 'transparent',
                        color: eventFilter===id ? '#fff' : 'var(--text-muted)',
                      }}>
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div style={{columns:'260px',columnGap:'16px'}}>
                {filtered.map(img => (
                  <div key={img.id} onClick={() => setLightbox(img)}
                    style={{breakInside:'avoid',marginBottom:'16px',borderRadius:'var(--radius-lg)',overflow:'hidden',cursor:'pointer',boxShadow:'var(--shadow-sm)',background:'var(--surface)'}}>
                    <img src={img.image_url} alt={img.caption || img.event_name || ''}
                      style={{width:'100%',display:'block'}}
                      onError={e=>e.target.closest('div').style.display='none'}/>
                    {(img.caption || img.event_name) && (
                      <div style={{padding:'10px 14px'}}>
                        {img.caption && <div style={{fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>{img.caption}</div>}
                        {img.event_name && <div style={{fontSize:'11.5px',color:'var(--text-muted)',marginTop:'2px'}}>{img.event_name}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{position:'fixed',inset:0,background:'rgba(10,20,40,0.92)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',cursor:'zoom-out'}}>
          <button onClick={() => setLightbox(null)}
            style={{position:'absolute',top:'20px',right:'24px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'8px',width:'40px',height:'40px',color:'#fff',fontSize:'18px',cursor:'pointer'}}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div style={{maxWidth:'90vw',maxHeight:'85vh'}} onClick={e=>e.stopPropagation()}>
            <img src={lightbox.image_url} alt={lightbox.caption||''} style={{maxWidth:'100%',maxHeight:'80vh',display:'block',borderRadius:'8px'}}/>
            {(lightbox.caption || lightbox.event_name) && (
              <div style={{color:'#fff',textAlign:'center',marginTop:'14px'}}>
                {lightbox.caption && <div style={{fontWeight:700,fontSize:'15px'}}>{lightbox.caption}</div>}
                {lightbox.event_name && <div style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'2px'}}>{lightbox.event_name}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}