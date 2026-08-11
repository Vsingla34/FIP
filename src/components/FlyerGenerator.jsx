// FlyerGenerator.jsx
// Template image background + user photo circle + name, positioned bottom-
// center to match a standard "I'm Attending" poster layout. Canvas now
// matches the template's own aspect ratio — a fixed 1200x630 (landscape)
// canvas used to force every uploaded template into that shape, which badly
// squashed portrait posters (2:3, Instagram-story style) instead of showing
// them correctly.
import { useEffect, useRef, useState } from 'react';

const DEFAULT_W = 1200, DEFAULT_H = 630; // used only when there is no template image
const GOLD = '#FFD09B';
const NAVY = '#0D1F3C';

/* ── Load image using fetch→blob to bypass CORS canvas restrictions ── */
async function loadImage(src) {
  try {
    const resp = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    if (!resp.ok) throw new Error('fetch failed');
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload  = () => { URL.revokeObjectURL(blobUrl); res(img); };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); rej(new Error('blob img fail')); };
      img.src = blobUrl;
    });
  } catch (_) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => rej(new Error('direct img fail: ' + src));
      img.src = src + (src.includes('?') ? '&' : '?') + '_t=' + Date.now();
    });
  }
}

/* ── Default FIP gradient background (used when no template set) ── */
function drawDefaultBg(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#060F22');
  g.addColorStop(0.5, '#1A3C6E');
  g.addColorStop(1, '#040C1A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle FIP branding on default bg
  ctx.save();
  ctx.fillStyle = 'rgba(242,101,34,0.08)';
  ctx.beginPath(); ctx.arc(W - 80, -80, 360, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(80, H + 60, 300, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // FIP text watermark
  ctx.save();
  ctx.font = `bold ${Math.round(H * 0.32)}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIP', W / 2, H / 2);
  ctx.restore();

  // Bottom orange bar
  const barH = Math.round(H * 0.067);
  ctx.fillStyle = '#F26522';
  ctx.fillRect(0, H - barH, W, barH);
  ctx.font = `bold ${Math.round(barH * 0.34)}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Federation of Indian Professionals  ·  www.fipin.org', W / 2, H - barH / 2);
}

/* ── Draw the name centered below the photo circle ── */
function drawNameLabel(ctx, name, cx, cy, r) {
  const label = String(name || '').trim();
  if (!label) return;

  const fontSize = Math.max(16, Math.round(r * 0.34));
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
  const textW = ctx.measureText(label).width;
  const padX = fontSize * 0.9, padY = fontSize * 0.55;
  const plateW = textW + padX * 2, plateH = fontSize + padY * 2;
  const plateY = cy + r + fontSize * 0.6;

  // White plate with a thin gold border, so the name stays legible
  // regardless of what's behind it on the template.
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  const rx = cx - plateW / 2, ry = plateY - plateH / 2, rr = plateH / 2;
  ctx.beginPath();
  ctx.moveTo(rx + rr, ry);
  ctx.arcTo(rx + plateW, ry, rx + plateW, ry + plateH, rr);
  ctx.arcTo(rx + plateW, ry + plateH, rx, ry + plateH, rr);
  ctx.arcTo(rx, ry + plateH, rx, ry, rr);
  ctx.arcTo(rx, ry, rx + plateW, ry, rr);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = NAVY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, plateY + 1);
  ctx.restore();
}

/* ── Draw photo circle at given position ── */
async function drawPhotoCircle(ctx, userPhoto, name, cx, cy, r) {
  // Outer glow
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(cx, cy, r + 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Gold ring
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  if (userPhoto) {
    try {
      const img = await loadImage(userPhoto);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } catch (_) { drawInitials(ctx, name, cx, cy, r); }
  } else {
    drawInitials(ctx, name, cx, cy, r);
  }
}

function drawInitials(ctx, name, x, y, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(26,60,110,0.85)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const initials = String(name || 'FP').split(' ').slice(0, 2)
    .map(w => (w[0] || '').toUpperCase()).join('');
  ctx.fillStyle = GOLD;
  ctx.font = `bold ${r * 0.6}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, x, y);
  ctx.restore();
}

/* ── Main draw: background + photo + name ── */
async function drawFlyer(canvas, { flyerTemplateUrl, userPhoto, name, photoXPct, photoYPct, photoRPct }) {
  const ctx = canvas.getContext('2d');

  let W = DEFAULT_W, H = DEFAULT_H, tpl = null;

  /* 1. Background: template image (sized to ITS OWN aspect ratio) OR default gradient */
  if (flyerTemplateUrl) {
    try {
      tpl = await loadImage(flyerTemplateUrl);
      W = tpl.naturalWidth  || tpl.width;
      H = tpl.naturalHeight || tpl.height;
    } catch (e) {
      console.warn('Template load failed:', e.message);
      tpl = null;
    }
  }

  canvas.width = W; canvas.height = H;

  if (tpl) ctx.drawImage(tpl, 0, 0, W, H);
  else     drawDefaultBg(ctx, W, H);

  /* 2. Photo circle + name — default position is bottom-center, matching the
     standard "I'm Attending" poster layout (placeholder circle sits above the
     tagline, below the Register Now button). Percent-based so it scales
     correctly regardless of the template's actual pixel dimensions. */
  const cx = W * (photoXPct ?? 0.5);
  const cy = H * (photoYPct ?? 0.695);
  const r  = H * (photoRPct ?? 0.065);
  await drawPhotoCircle(ctx, userPhoto, name, cx, cy, r);
  drawNameLabel(ctx, name, cx, cy, r);
}

/* ── React Component ── */
export default function FlyerGenerator({ name, flyerTemplateUrl, onClose }) {
  const canvasRef     = useRef(null);
  const canvasWrapRef = useRef(null);
  const fileInputRef  = useRef(null);
  const [rendering,   setRendering]   = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userPhoto,   setUserPhoto]   = useState(null);

  // User-adjustable photo position/size — null means "use the default
  // bottom-center fit" (matches drawFlyer's own ?? fallbacks). Every user
  // gets this control, not just admins: it's their own face they're placing.
  const [photoXPct, setPhotoXPct] = useState(null);
  const [photoYPct, setPhotoYPct] = useState(null);
  const [photoRPct, setPhotoRPct] = useState(null);
  const [dragging,  setDragging]  = useState(null); // 'move' | 'resize' | null

  const redraw = (photo, pos) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    drawFlyer(canvas, {
      flyerTemplateUrl, userPhoto: photo, name,
      photoXPct: (pos?.x ?? photoXPct) ?? undefined,
      photoYPct: (pos?.y ?? photoYPct) ?? undefined,
      photoRPct: (pos?.r ?? photoRPct) ?? undefined,
    }).finally(() => setRendering(false));
  };

  useEffect(() => { redraw(userPhoto); }, [flyerTemplateUrl, name]);
  useEffect(() => { redraw(userPhoto); }, [photoXPct, photoYPct, photoRPct]);

  // Effective values used both for drawing and for positioning the on-screen
  // drag handle — resolves to the same defaults drawFlyer itself uses.
  const effX = photoXPct ?? 0.5;
  const effY = photoYPct ?? 0.695;
  const effR = photoRPct ?? 0.065;

  const resetPosition = () => { setPhotoXPct(null); setPhotoYPct(null); setPhotoRPct(null); };

  /* ── Drag to move, drag the resize handle to scale ──
     Coordinates are read off the CANVAS's own rendered size (clientWidth/
     Height), not the page — so this works correctly regardless of how the
     modal scales the canvas down to fit the screen. */
  const pointToPct = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top)  / rect.height)),
    };
  };

  const onHandlePointerDown = (mode) => (e) => {
    e.preventDefault();
    setDragging(mode);
  };

  useEffect(() => {
    if (!dragging) return;
    const canvas = canvasRef.current;

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging === 'move') {
        const { x, y } = pointToPct(e.clientX, e.clientY);
        setPhotoXPct(x); setPhotoYPct(y);
      } else if (dragging === 'resize') {
        // Radius tracks the pointer's distance from the circle's current
        // center — dragging outward grows it, inward shrinks it.
        const cx = rect.left + effX * rect.width;
        const cy = rect.top  + effY * rect.height;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const rPct = Math.min(0.35, Math.max(0.02, dist / rect.height));
        setPhotoRPct(rPct);
      }
    };
    const onUp = () => setDragging(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, effX, effY]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUserPhoto(ev.target.result); redraw(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    setDownloading(true);
    canvasRef.current?.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `FIP_${String(name || 'Participant').replace(/\s+/g, '_')}_Flyer.png`;
      a.click();
      setDownloading(false);
    }, 'image/png');
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',backdropFilter:'blur(4px)'}}>
      <div style={{background:'#0D1F3C',borderRadius:'20px',overflow:'hidden',maxWidth:'720px',width:'100%',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',border:'1px solid rgba(255,255,255,0.08)'}}>

        {/* Header */}
        <div style={{padding:'18px 22px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
          <div>
            <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'3px'}}>🎉 Your FIP Flyer is Ready!</div>
            <div style={{fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>Download and share on LinkedIn · WhatsApp · Instagram</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',color:'#fff',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,flexShrink:0}}>✕</button>
        </div>

        {/* Photo upload */}
        <div style={{padding:'12px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:'14px',background:'rgba(0,0,0,0.25)',flexShrink:0}}>
          <div style={{width:'46px',height:'46px',borderRadius:'50%',border:'2.5px solid #FFD09B',overflow:'hidden',flexShrink:0,background:'rgba(26,60,110,0.8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {userPhoto
              ? <img src={userPhoto} alt="Your photo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{color:'#FFD09B',fontSize:'20px'}}>👤</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#fff',marginBottom:'2px'}}>
              {userPhoto ? '✓ Photo added!' : 'Add your photo to personalise the flyer'}
            </div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
              Your face appears in the circle on the flyer
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={handlePhotoChange}/>
          <button onClick={() => fileInputRef.current?.click()}
            style={{background:'rgba(255,208,155,0.12)',color:'#FFD09B',border:'1px solid rgba(255,208,155,0.3)',borderRadius:'8px',padding:'8px 16px',fontSize:'12px',fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
            {userPhoto ? '🔄 Change Photo' : '📷 Upload Photo'}
          </button>
        </div>

        {/* Canvas preview — only this region scrolls; portrait templates can be
            taller than the viewport, so the header/upload bar/buttons must stay
            reachable rather than the whole modal overflowing off-screen. */}
        <div style={{padding:'16px',background:'rgba(0,0,0,0.2)',position:'relative',overflowY:'auto',flex:'1 1 auto',minHeight:0}}>
          {rendering && (
            <div style={{position:'absolute',inset:'16px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',borderRadius:'8px',zIndex:2}}>
              <div style={{textAlign:'center',color:'#fff',fontSize:'13px',opacity:.7}}>Generating…</div>
            </div>
          )}
          <div ref={canvasWrapRef} style={{position:'relative',lineHeight:0}}>
            <canvas ref={canvasRef} style={{width:'100%',borderRadius:'8px',display:'block',border:'1px solid rgba(255,255,255,0.08)'}}/>

            {/* Drag handle — move the photo (and the name that follows it) */}
            <div
              onPointerDown={onHandlePointerDown('move')}
              title="Drag to reposition your photo"
              style={{
                position:'absolute', left:`${effX*100}%`, top:`${effY*100}%`,
                height:`${effR*200}%`, aspectRatio:'1/1', transform:'translate(-50%,-50%)',
                borderRadius:'50%', border:'2.5px dashed rgba(255,208,155,0.85)',
                cursor: dragging==='move' ? 'grabbing' : 'grab', touchAction:'none',
                boxShadow:'0 0 0 9999px rgba(0,0,0,0.15)',
              }}/>

            {/* Resize handle — drag outward/inward to scale */}
            <div
              onPointerDown={onHandlePointerDown('resize')}
              title="Drag to resize"
              style={{
                position:'absolute',
                left:`${effX*100}%`, top:`${(effY + effR)*100}%`,
                width:'26px', height:'26px', transform:'translate(-50%,-50%)',
                borderRadius:'50%', background:'#F26522', border:'2.5px solid #fff',
                cursor:'ns-resize', touchAction:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
              }}>
              <i className="fa-solid fa-up-down" style={{fontSize:'10px',color:'#fff'}}></i>
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'10px',flexWrap:'wrap',gap:'8px'}}>
            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
              <i className="fa-solid fa-hand-pointer" style={{marginRight:'5px'}}></i>
              Drag your photo to reposition · drag the orange handle to resize
            </span>
            {(photoXPct !== null || photoYPct !== null || photoRPct !== null) && (
              <button onClick={resetPosition}
                style={{background:'rgba(255,255,255,0.08)',border:'none',color:'rgba(255,255,255,0.7)',fontSize:'11px',fontWeight:600,padding:'5px 12px',borderRadius:'6px',cursor:'pointer'}}>
                <i className="fa-solid fa-rotate-left" style={{marginRight:'5px'}}></i>Reset position
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{padding:'14px 22px 18px',display:'flex',gap:'10px',flexShrink:0}}>
          <button onClick={handleDownload} disabled={rendering||downloading}
            style={{flex:1,background:'#F26522',color:'#fff',border:'none',borderRadius:'10px',padding:'13px',fontWeight:800,fontSize:'15px',cursor:rendering||downloading?'not-allowed':'pointer',opacity:rendering||downloading?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            {downloading ? '⏳ Preparing…' : '⬇️ Download Flyer (PNG)'}
          </button>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'13px 20px',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>
            Skip
          </button>
        </div>
        <div style={{textAlign:'center',fontSize:'11px',color:'rgba(255,255,255,0.25)',paddingBottom:'14px'}}>
          💡 People with a photo get 3× more shares on LinkedIn
        </div>
      </div>
    </div>
  );
}