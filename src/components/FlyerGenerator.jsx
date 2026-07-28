// FlyerGenerator.jsx
// Simple: Template image background + user photo circle. Nothing else.
// Admin designs the full flyer as an image — we just add the user's face.
import { useEffect, useRef, useState } from 'react';

const W = 1200, H = 630;
const GOLD = '#FFD09B';

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
function drawDefaultBg(ctx) {
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
  ctx.font = 'bold 200px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIP', W / 2, H / 2);
  ctx.restore();

  // Bottom orange bar
  ctx.fillStyle = '#F26522';
  ctx.fillRect(0, H - 42, W, 42);
  ctx.font = 'bold 14px Inter, Arial, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Federation of Indian Professionals  ·  www.fipin.org', W / 2, H - 21);
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

/* ── Main draw: just background + photo ── */
async function drawFlyer(canvas, { flyerTemplateUrl, userPhoto, name, photoX, photoY, photoR }) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  /* 1. Background: template image OR default gradient */
  if (flyerTemplateUrl) {
    try {
      const tpl = await loadImage(flyerTemplateUrl);
      ctx.drawImage(tpl, 0, 0, W, H);
    } catch (e) {
      console.warn('Template load failed:', e.message);
      drawDefaultBg(ctx);
    }
  } else {
    drawDefaultBg(ctx);
  }

  /* 2. Photo circle at specified position (default: right side center) */
  const cx = photoX || W * 0.78;
  const cy = photoY || (H - 42) / 2;
  const r  = photoR || 120;
  await drawPhotoCircle(ctx, userPhoto, name, cx, cy, r);
}

/* ── React Component ── */
export default function FlyerGenerator({ name, flyerTemplateUrl, onClose }) {
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const [rendering,   setRendering]   = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userPhoto,   setUserPhoto]   = useState(null);

  const redraw = (photo) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    drawFlyer(canvas, { flyerTemplateUrl, userPhoto: photo, name })
      .finally(() => setRendering(false));
  };

  useEffect(() => { redraw(userPhoto); }, [flyerTemplateUrl, name]);

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
      <div style={{background:'#0D1F3C',borderRadius:'20px',overflow:'hidden',maxWidth:'720px',width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',border:'1px solid rgba(255,255,255,0.08)'}}>

        {/* Header */}
        <div style={{padding:'18px 22px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div>
            <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'3px'}}>🎉 Your FIP Flyer is Ready!</div>
            <div style={{fontSize:'12px',color:'rgba(255,255,255,0.45)'}}>Download and share on LinkedIn · WhatsApp · Instagram</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',color:'#fff',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>✕</button>
        </div>

        {/* Photo upload */}
        <div style={{padding:'12px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:'14px',background:'rgba(0,0,0,0.25)'}}>
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

        {/* Canvas preview */}
        <div style={{padding:'16px',background:'rgba(0,0,0,0.2)',position:'relative'}}>
          {rendering && (
            <div style={{position:'absolute',inset:'16px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',borderRadius:'8px',zIndex:2}}>
              <div style={{textAlign:'center',color:'#fff',fontSize:'13px',opacity:.7}}>Generating…</div>
            </div>
          )}
          <canvas ref={canvasRef} style={{width:'100%',borderRadius:'8px',display:'block',border:'1px solid rgba(255,255,255,0.08)'}}/>
        </div>

        {/* Actions */}
        <div style={{padding:'14px 22px 18px',display:'flex',gap:'10px'}}>
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