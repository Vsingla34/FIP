import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function PromoPopup() {
  const [popups,  setPopups]  = useState([]);
  const [current, setCurrent] = useState(0);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    // Load active popups from DB
    supabase.from('popups')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!data?.length) return;
        // Show once per session per popup set
        const key = 'fip_popups_' + data.map(p=>p.id).join('_').slice(0,20);
        if (sessionStorage.getItem(key)) return;
        setPopups(data);
        setTimeout(() => setOpen(true), 1500);
      });
  }, []);

  const handleClose = () => {
    const key = 'fip_popups_' + popups.map(p=>p.id).join('_').slice(0,20);
    sessionStorage.setItem(key, '1');
    setOpen(false);
  };

  const handleNext = () => {
    if (current < popups.length - 1) setCurrent(c => c + 1);
    else handleClose();
  };

  const handlePrev = () => setCurrent(c => Math.max(0, c - 1));

  if (!open || !popups.length) return null;

  const popup = popups[current];

  return (
    <div style={{
      position:'fixed',inset:0,
      background:'rgba(0,0,0,0.7)',
      zIndex:9999,
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:'16px',
      backdropFilter:'blur(4px)',
      animation:'fadeIn 0.3s ease',
    }} onClick={handleClose}>
      <div style={{
        background:'#fff',
        borderRadius:'16px',
        overflow:'hidden',
        maxWidth:'540px',
        width:'100%',
        boxShadow:'0 24px 80px rgba(0,0,0,0.45)',
        animation:'slideUp 0.35s ease',
        position:'relative',
      }} onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={handleClose} style={{
          position:'absolute',top:'10px',right:'10px',zIndex:10,
          width:'30px',height:'30px',borderRadius:'50%',
          background:'rgba(0,0,0,0.5)',border:'none',
          color:'#fff',fontSize:'14px',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>✕</button>

        {/* Multiple popup indicator */}
        {popups.length > 1 && (
          <div style={{
            position:'absolute',top:'10px',left:'50%',transform:'translateX(-50%)',
            display:'flex',gap:'5px',zIndex:10,
          }}>
            {popups.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)} style={{
                width: i===current ? '18px' : '6px',
                height:'6px',borderRadius:'3px',
                background: i===current ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor:'pointer',transition:'all 0.3s',
              }}/>
            ))}
          </div>
        )}

        {/* Image */}
        <div style={{position:'relative'}}>
          <img src={popup.image_url} alt={popup.title}
            style={{width:'100%',display:'block',maxHeight:'440px',objectFit:'cover'}}/>

          {/* Gradient overlay at bottom */}
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            background:'linear-gradient(transparent,rgba(0,0,0,0.75))',
            padding:'40px 24px 20px',
          }}>
            {popup.title && (
              <div style={{color:'#fff',fontSize:'16px',fontWeight:700,marginBottom:'12px',textShadow:'0 1px 3px rgba(0,0,0,0.5)'}}>{popup.title}</div>
            )}
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
              {popup.cta_link?.startsWith('http') ? (
                <a href={popup.cta_link} target="_blank" rel="noopener noreferrer" onClick={handleClose}
                  style={{background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'13px',padding:'10px 24px',borderRadius:'8px',textDecoration:'none',boxShadow:'0 4px 16px rgba(242,101,34,0.4)'}}>
                  {popup.cta_label || 'Register Now'} →
                </a>
              ) : (
                <Link to={popup.cta_link || '/courses'} onClick={handleClose}
                  style={{background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'13px',padding:'10px 24px',borderRadius:'8px',textDecoration:'none',boxShadow:'0 4px 16px rgba(242,101,34,0.4)'}}>
                  {popup.cta_label || 'Register Now'} →
                </Link>
              )}
              {popups.length > 1 && current < popups.length - 1 && (
                <button onClick={handleNext} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'10px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}