// PromoPopup.jsx — fetches popups from DB, shows one at a time.
// Next popup appears only AFTER user closes the current one (X button).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function PromoPopup() {
  const [queue,   setQueue]   = useState([]);  // unseen popups
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);

  /* Fetch active popups once on mount */
  useEffect(() => {
    supabase
      .from('popups')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!data?.length) return;
        // Only show popups the user hasn't dismissed this session
        const unseen = data.filter(p => !sessionStorage.getItem('fip_popup_' + p.id));
        if (!unseen.length) return;
        setQueue(unseen.slice(1));     // remaining after first
        setCurrent(unseen[0]);
        setTimeout(() => setVisible(true), 1500);  // delay before first popup
      });
  }, []);

  /* Close current popup — show next one after brief pause */
  const handleClose = () => {
    if (current) sessionStorage.setItem('fip_popup_' + current.id, '1');
    setVisible(false);
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setTimeout(() => {
        setCurrent(next);
        setQueue(rest);
        setVisible(true);
      }, 800);  // 800ms gap between popups
    }
  };

  if (!visible || !current) return null;

  const isExternal = current.cta_link?.startsWith('http');

  return (
    <div
      style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,0.65)',
        zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'16px',
        backdropFilter:'blur(3px)',
        animation:'fadeIn 0.3s ease',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background:'#fff',
          borderRadius:'16px',
          overflow:'hidden',
          maxWidth:'520px',
          width:'100%',
          boxShadow:'0 24px 80px rgba(0,0,0,0.4)',
          animation:'slideUp 0.35s ease',
          position:'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close (X) button */}
        <button
          onClick={handleClose}
          style={{
            position:'absolute', top:'10px', right:'10px', zIndex:10,
            width:'32px', height:'32px', borderRadius:'50%',
            background:'rgba(0,0,0,0.5)', border:'none',
            color:'#fff', fontSize:'15px', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            lineHeight:1,
          }}
        >✕</button>

        {/* Queue indicator */}
        {(queue.length > 0) && (
          <div style={{
            position:'absolute', top:'10px', left:'12px', zIndex:10,
            background:'rgba(0,0,0,0.4)', borderRadius:'20px',
            padding:'2px 8px', fontSize:'11px', color:'rgba(255,255,255,0.8)',
          }}>
            {/* e.g. "1 more after this" */}
            +{queue.length} more
          </div>
        )}

        {/* Banner image */}
        {current.image_url ? (
          <div style={{position:'relative'}}>
            <img
              src={current.image_url}
              alt={current.title || 'FIP Popup'}
              style={{width:'100%', display:'block', maxHeight:'400px', objectFit:'cover'}}
            />
            {/* CTA overlay */}
            {current.cta_label && (
              <div style={{
                position:'absolute', bottom:0, left:0, right:0,
                background:'linear-gradient(transparent,rgba(0,0,0,0.8))',
                padding:'28px 24px 20px',
              }}>
                {isExternal ? (
                  <a href={current.cta_link} target="_blank" rel="noopener noreferrer"
                    onClick={handleClose}
                    style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'15px',padding:'11px 28px',borderRadius:'8px',textDecoration:'none'}}>
                    {current.cta_label} →
                  </a>
                ) : (
                  <Link to={current.cta_link || '/events'} onClick={handleClose}
                    style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'15px',padding:'11px 28px',borderRadius:'8px',textDecoration:'none'}}>
                    {current.cta_label} →
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Text-only fallback */
          <div style={{
            background:'linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%)',
            padding:'40px 32px', textAlign:'center',
          }}>
            <div style={{fontSize:'10px',fontWeight:700,color:'rgba(255,208,155,0.7)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'10px'}}>
              FIP Presents
            </div>
            <h2 style={{fontSize:'24px',fontWeight:900,color:'#fff',marginBottom:'6px',lineHeight:1.2}}>
              {current.title}
            </h2>
            {current.subtitle && (
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.65)',marginBottom:'22px'}}>
                {current.subtitle}
              </p>
            )}
            {current.cta_label && (
              isExternal ? (
                <a href={current.cta_link} target="_blank" rel="noopener noreferrer"
                  onClick={handleClose}
                  style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'14px',padding:'12px 30px',borderRadius:'8px',textDecoration:'none'}}>
                  {current.cta_label} →
                </a>
              ) : (
                <Link to={current.cta_link || '/events'} onClick={handleClose}
                  style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'14px',padding:'12px 30px',borderRadius:'8px',textDecoration:'none'}}>
                  {current.cta_label} →
                </Link>
              )
            )}
            <div style={{marginTop:'14px',fontSize:'12px',color:'rgba(255,255,255,0.35)',cursor:'pointer'}}
              onClick={handleClose}>
              No thanks
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}