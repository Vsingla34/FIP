// src/components/PromoPopup.jsx
// Shows a promotional popup on first visit (once per session)
// Admin can configure: image, title, link, which pages to show on

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ── CONFIGURE YOUR POPUP HERE ─────────────────────────────────
// To update the popup: edit the PROMO object below and redeploy
// To disable: set enabled: false
const PROMO = {
  enabled:   true,
  title:     'ITR FILING MASTERY',
  subtitle:  'Live Webinar — Free Registration',
  // Use an image URL — upload your poster to Supabase storage or any CDN
  // and paste the URL here. Leave empty to show text-only popup.
  imageUrl:  '', // e.g. 'https://vygsubtfelavhmaaphul.supabase.co/storage/v1/object/public/assets/itr-webinar.jpg'
  ctaLabel:  'Register Free Now',
  ctaLink:   '/events',        // internal link
  ctaExternal: false,          // set true + ctaHref for external URL
  ctaHref:   '',               // e.g. 'https://forms.google.com/...'
  // Show after this many ms on page load
  delay:     1500,
  // Session storage key — change this string to force popup to show again
  sessionKey: 'fip_promo_itr_2026',
};
// ────────────────────────────────────────────────────────────────

export default function PromoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!PROMO.enabled) return;
    // Only show once per session
    if (sessionStorage.getItem(PROMO.sessionKey)) return;

    const t = setTimeout(() => setOpen(true), PROMO.delay);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(PROMO.sessionKey, '1');
    setOpen(false);
  };

  if (!open) return null;

  const ctaProps = PROMO.ctaExternal
    ? { as:'a', href: PROMO.ctaHref, target:'_blank', rel:'noopener noreferrer' }
    : { as: Link, to: PROMO.ctaLink };

  return (
    <div
      style={{
        position:'fixed',inset:0,
        background:'rgba(0,0,0,0.65)',
        zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',
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
          maxWidth:'560px',
          width:'100%',
          boxShadow:'0 24px 80px rgba(0,0,0,0.4)',
          animation:'slideUp 0.35s ease',
          position:'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position:'absolute',top:'10px',right:'10px',zIndex:10,
            width:'30px',height:'30px',borderRadius:'50%',
            background:'rgba(0,0,0,0.45)',border:'none',
            color:'#fff',fontSize:'14px',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            transition:'background 0.2s',
          }}
          onMouseEnter={e=>e.target.style.background='rgba(0,0,0,0.7)'}
          onMouseLeave={e=>e.target.style.background='rgba(0,0,0,0.45)'}
        >
          ✕
        </button>

        {/* Poster image */}
        {PROMO.imageUrl ? (
          <div style={{position:'relative'}}>
            <img
              src={PROMO.imageUrl}
              alt={PROMO.title}
              style={{width:'100%',display:'block',maxHeight:'420px',objectFit:'cover'}}
            />
            {/* CTA over image */}
            <div style={{
              position:'absolute',bottom:0,left:0,right:0,
              background:'linear-gradient(transparent,rgba(0,0,0,0.8))',
              padding:'32px 24px 20px',
            }}>
              {PROMO.ctaExternal
                ? <a href={PROMO.ctaHref} target="_blank" rel="noopener noreferrer"
                    onClick={handleClose}
                    style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'15px',padding:'12px 32px',borderRadius:'8px',textDecoration:'none',boxShadow:'0 4px 16px rgba(242,101,34,0.45)'}}>
                    {PROMO.ctaLabel} →
                  </a>
                : <Link to={PROMO.ctaLink} onClick={handleClose}
                    style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'15px',padding:'12px 32px',borderRadius:'8px',textDecoration:'none',boxShadow:'0 4px 16px rgba(242,101,34,0.45)'}}>
                    {PROMO.ctaLabel} →
                  </Link>
              }
            </div>
          </div>
        ) : (
          /* Text-only fallback if no image */
          <div style={{
            background:'linear-gradient(135deg,#1A3C6E 0%,#1B4A9E 100%)',
            padding:'40px 32px',textAlign:'center',
          }}>
            <div style={{fontSize:'11px',fontWeight:700,color:'rgba(255,208,155,0.7)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'10px'}}>
              FIP Presents
            </div>
            <h2 style={{fontSize:'26px',fontWeight:900,color:'#fff',marginBottom:'6px',fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>
              {PROMO.title}
            </h2>
            <p style={{fontSize:'14px',color:'rgba(255,255,255,0.65)',marginBottom:'24px'}}>
              {PROMO.subtitle}
            </p>
            {PROMO.ctaExternal
              ? <a href={PROMO.ctaHref} target="_blank" rel="noopener noreferrer"
                  onClick={handleClose}
                  style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'14px',padding:'13px 32px',borderRadius:'9px',textDecoration:'none',boxShadow:'0 4px 20px rgba(242,101,34,0.4)'}}>
                  {PROMO.ctaLabel} →
                </a>
              : <Link to={PROMO.ctaLink} onClick={handleClose}
                  style={{display:'inline-block',background:'var(--orange)',color:'#fff',fontWeight:700,fontSize:'14px',padding:'13px 32px',borderRadius:'9px',textDecoration:'none',boxShadow:'0 4px 20px rgba(242,101,34,0.4)'}}>
                  {PROMO.ctaLabel} →
                </Link>
            }
            <div style={{marginTop:'14px',fontSize:'12px',color:'rgba(255,255,255,0.35)',cursor:'pointer'}} onClick={handleClose}>
              No thanks, close
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}