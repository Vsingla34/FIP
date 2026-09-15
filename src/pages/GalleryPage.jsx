import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export default function GalleryPage() {
  const [loading, setLoading]   = useState(true);
  const [images,  setImages]    = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [search, setSearch]     = useState('');
  const [sortOrder, setSortOrder] = useState('curated'); // 'curated' | 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState('grid');      // 'grid' | 'byEvent'
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    supabase.from('gallery_images').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { setImages(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const eventOptions = [...new Map(
    images.filter(i => i.event_id && i.event_name).map(i => [i.event_id, i.event_name])
  ).entries()];

  const filtered = useMemo(() => {
    let list = eventFilter === 'all' ? images : images.filter(i => i.event_id === eventFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i => (i.caption||'').toLowerCase().includes(q) || (i.event_name||'').toLowerCase().includes(q));
    }
    if (sortOrder === 'newest') list = [...list].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortOrder === 'oldest') list = [...list].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [images, eventFilter, search, sortOrder]);

  // Grouped view — an ordered list of {eventName, photos} sections. Photos
  // with no event tag land in a trailing "Other Photos" group rather than
  // being silently dropped.
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(img => {
      const key = img.event_name || '__untagged__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(img);
    });
    const groups = [...map.entries()].map(([name, photos]) => ({ name, photos }));
    // Keep tagged groups first, untagged last
    groups.sort((a,b) => (a.name==='__untagged__') - (b.name==='__untagged__'));
    return groups;
  }, [filtered]);

  const lightboxImg = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  const showPrev = useCallback(() => setLightboxIdx(i => (i > 0 ? i - 1 : filtered.length - 1)), [filtered.length]);
  const showNext = useCallback(() => setLightboxIdx(i => (i < filtered.length - 1 ? i + 1 : 0)), [filtered.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, showPrev, showNext]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx > 0 ? showPrev() : showNext();
    touchStartX.current = null;
  };

  const downloadImage = async (img) => {
    try {
      const res = await fetch(img.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (img.caption || img.event_name || 'fip-photo').replace(/[^a-zA-Z0-9._-]/g,'_') + '.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { window.open(img.image_url, '_blank'); }
  };

  const shareImage = async (img) => {
    const url = img.image_url;
    if (navigator.share) {
      try { await navigator.share({ title: img.caption || 'FIP Gallery', url }); return; } catch {}
    }
    navigator.clipboard?.writeText(url);
  };

  // Deliberate bento-grid pattern — a repeating rhythm of tile sizes so the
  // layout looks intentionally uneven, independent of whether the actual
  // photos happen to share similar aspect ratios (event photos often do).
  const getTileSpan = (idx) => {
    const pos = idx % 9;
    if (pos === 0) return { col: 2, row: 2 };  // big feature tile
    if (pos === 4) return { col: 2, row: 1 };  // wide
    if (pos === 6) return { col: 1, row: 2 };  // tall
    return { col: 1, row: 1 };                 // normal
  };

  const renderTile = (img, idx, filteredIdx) => {
    const span = getTileSpan(idx);
    return (
    <div key={img.id} className="gallery-tile"
      style={{
        animationDelay: `${Math.min(idx,12) * 0.05}s`,
        gridColumn: `span ${span.col}`,
        gridRow: `span ${span.row}`,
      }}
      onClick={() => setLightboxIdx(filteredIdx)}>
      <img src={img.image_url} alt={img.caption || img.event_name || ''}
        loading="lazy"
        onError={e=>e.target.closest('.gallery-tile').style.display='none'}/>
      <div className="gallery-tile-overlay">
        <div className="gallery-tile-zoom"><i className="fa-solid fa-expand"></i></div>
        {(img.caption || img.event_name) && (
          <div className="gallery-tile-caption">
            {img.caption && <div className="gallery-tile-caption-main">{img.caption}</div>}
            {img.event_name && <div className="gallery-tile-caption-sub">{img.event_name}</div>}
          </div>
        )}
      </div>
    </div>
    );
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Gallery</span></div>
          <h1>Event Gallery</h1>
          <p>Moments from FIP events, conferences, and gatherings across the country.</p>
          {!loading && images.length > 0 && (
            <div style={{marginTop:'14px',fontSize:'13px',color:'rgba(255,255,255,0.75)',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="fa-solid fa-images"></i>
              {images.length} photo{images.length!==1?'s':''} across {eventOptions.length} event{eventOptions.length!==1?'s':''}
            </div>
          )}
        </div>
      </div>

      <section className="section">
        <div className="container">

          {loading ? (
            <div style={{columns:'260px',columnGap:'16px'}}>
              {Array.from({length:9}).map((_,i) => (
                <div key={i} className="gallery-skeleton" style={{
                  breakInside:'avoid', marginBottom:'16px', borderRadius:'var(--radius-lg)',
                  height: [220,280,190,250,230,300,210,260,240][i%9],
                }}/>
              ))}
            </div>

          ) : images.length === 0 ? (
            <div style={{textAlign:'center',padding:'90px 20px',color:'var(--text-light)'}}>
              <i className="fa-solid fa-images" style={{fontSize:'36px',display:'block',marginBottom:'16px',opacity:.35}}></i>
              <div style={{fontSize:'16px',fontWeight:600,marginBottom:'6px'}}>No photos yet</div>
              <p style={{fontSize:'13.5px'}}>Check back after our next event.</p>
            </div>

          ) : (
            <>
              {/* Controls: search + sort + view toggle */}
              <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap',alignItems:'center'}}>
                <div style={{position:'relative',flex:'1',minWidth:'220px',maxWidth:'340px'}}>
                  <i className="fa-solid fa-magnifying-glass" style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-light)',fontSize:'13px'}}></i>
                  <input type="search" placeholder="Search photos or events…" value={search} onChange={e=>setSearch(e.target.value)}
                    style={{width:'100%',padding:'10px 14px 10px 38px',borderRadius:'24px',border:'1.5px solid var(--border)',fontSize:'13.5px',outline:'none'}}/>
                </div>

                <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)}
                  style={{padding:'9px 14px',borderRadius:'24px',border:'1.5px solid var(--border)',fontSize:'13px',fontWeight:600,color:'var(--text-muted)',background:'#fff',cursor:'pointer'}}>
                  <option value="curated">Curated Order</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                <div style={{display:'flex',border:'1.5px solid var(--border)',borderRadius:'24px',overflow:'hidden',marginLeft:'auto'}}>
                  <button onClick={()=>setViewMode('grid')}
                    style={{padding:'9px 16px',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',background:viewMode==='grid'?'var(--blue)':'transparent',color:viewMode==='grid'?'#fff':'var(--text-muted)'}}>
                    <i className="fa-solid fa-grip"></i> Grid
                  </button>
                  <button onClick={()=>setViewMode('byEvent')}
                    style={{padding:'9px 16px',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer',background:viewMode==='byEvent'?'var(--blue)':'transparent',color:viewMode==='byEvent'?'#fff':'var(--text-muted)'}}>
                    <i className="fa-solid fa-layer-group"></i> By Event
                  </button>
                </div>
              </div>

              {eventOptions.length > 0 && (
                <div style={{display:'flex',gap:'10px',marginBottom:'30px',flexWrap:'wrap'}}>
                  <button className={`gallery-chip${eventFilter==='all'?' active':''}`} onClick={() => setEventFilter('all')}>
                    All Photos
                    <span className="gallery-chip-count">{images.length}</span>
                  </button>
                  {eventOptions.map(([id, name]) => (
                    <button key={id} className={`gallery-chip${eventFilter===id?' active':''}`} onClick={() => setEventFilter(id)}>
                      {name}
                      <span className="gallery-chip-count">{images.filter(i=>i.event_id===id).length}</span>
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-light)'}}>
                  <i className="fa-solid fa-magnifying-glass" style={{fontSize:'28px',display:'block',marginBottom:'12px',opacity:.35}}></i>
                  No photos match "{search}".
                </div>
              ) : viewMode === 'grid' ? (
                <div className="gallery-bento-grid">
                  {filtered.map((img, idx) => renderTile(img, idx, idx))}
                </div>
              ) : (
                <div>
                  {grouped.map(group => (
                    <div key={group.name} style={{marginBottom:'40px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                        <h3 style={{fontSize:'18px',fontWeight:800,color:'var(--blue)',margin:0}}>
                          {group.name === '__untagged__' ? 'Other Photos' : group.name}
                        </h3>
                        <span style={{fontSize:'12px',color:'var(--text-light)',background:'var(--off-white)',padding:'2px 10px',borderRadius:'12px'}}>
                          {group.photos.length} photo{group.photos.length!==1?'s':''}
                        </span>
                      </div>
                      <div className="gallery-bento-grid">
                        {group.photos.map((img, idx) => renderTile(img, idx, filtered.indexOf(img)))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </section>

      {/* Back to top */}
      {showBackToTop && (
        <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})}
          style={{position:'fixed',bottom:'90px',right:'24px',width:'46px',height:'46px',borderRadius:'50%',background:'var(--blue)',color:'#fff',border:'none',boxShadow:'var(--shadow-md)',cursor:'pointer',zIndex:90,fontSize:'16px'}}>
          <i className="fa-solid fa-arrow-up"></i>
        </button>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="gallery-lightbox" onClick={() => setLightboxIdx(null)}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button className="gallery-lightbox-close" onClick={() => setLightboxIdx(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>

          {filtered.length > 1 && (
            <>
              <button className="gallery-lightbox-nav gallery-lightbox-prev" onClick={e=>{e.stopPropagation();showPrev();}}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <button className="gallery-lightbox-nav gallery-lightbox-next" onClick={e=>{e.stopPropagation();showNext();}}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </>
          )}

          <div className="gallery-lightbox-content" onClick={e=>e.stopPropagation()}>
            <img key={lightboxImg.id} src={lightboxImg.image_url} alt={lightboxImg.caption||''} className="gallery-lightbox-img"/>
            <div className="gallery-lightbox-info">
              <div>
                {lightboxImg.caption && <div className="gallery-lightbox-caption">{lightboxImg.caption}</div>}
                {lightboxImg.event_name && <div className="gallery-lightbox-event">{lightboxImg.event_name}</div>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <button onClick={()=>shareImage(lightboxImg)} title="Share"
                  style={{background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',width:'36px',height:'36px',borderRadius:'50%',cursor:'pointer',fontSize:'14px'}}>
                  <i className="fa-solid fa-share-nodes"></i>
                </button>
                <button onClick={()=>downloadImage(lightboxImg)} title="Download"
                  style={{background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',width:'36px',height:'36px',borderRadius:'50%',cursor:'pointer',fontSize:'14px'}}>
                  <i className="fa-solid fa-download"></i>
                </button>
                {filtered.length > 1 && (
                  <div className="gallery-lightbox-counter">{lightboxIdx+1} / {filtered.length}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}