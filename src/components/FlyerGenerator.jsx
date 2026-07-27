// FlyerGenerator.jsx
// Professional LinkedIn/WhatsApp shareable flyer
// 1200×630px — canvas-based, no external libs
import { useEffect, useRef, useState } from 'react';

const W = 1200, H = 630;
const BLUE_DARK = '#0A1628';
const BLUE_MID  = '#1A3C6E';
const ORANGE    = '#F26522';
const GOLD      = '#FFD09B';
const WHITE     = '#FFFFFF';
const WHITE_60  = 'rgba(255,255,255,0.60)';
const WHITE_20  = 'rgba(255,255,255,0.20)';
const WHITE_10  = 'rgba(255,255,255,0.10)';

/* ── helpers ── */
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('img fail'));
    img.src = src;
  });
}

function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Main draw ── */
async function drawFlyer(canvas, { name, courseTitle, whatYouLearn, eventDate, flyerTemplateUrl, logoUrl, userPhoto }) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  /* ── 1. Background ── */
  if (flyerTemplateUrl) {
    try {
      const img = await loadImage(flyerTemplateUrl);
      ctx.drawImage(img, 0, 0, W, H);
      ctx.fillStyle = 'rgba(8,16,36,0.72)';
      ctx.fillRect(0, 0, W, H);
    } catch { drawBg(ctx); }
  } else {
    drawBg(ctx);
  }

  /* ── 2. Decorative elements ── */
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = ORANGE;
  ctx.beginPath(); ctx.arc(W - 100, -100, 340, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(60, H + 60, 300, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  /* ── 3. Orange left accent bar ── */
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, 7, H);

  /* ── 4. Header bar ── */
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 0, W, 76);

  // FIP brand mark — drawn as text (logo image often fails CORS on canvas)
  // Orange badge
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.beginPath(); roundRect(ctx, 20, 16, 56, 44, 8); ctx.fill();
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIP', 48, 38);
  ctx.restore();

  // Try logo image over the badge
  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      ctx.save();
      ctx.beginPath(); roundRect(ctx, 20, 16, 56, 44, 8); ctx.clip();
      ctx.drawImage(logo, 20, 16, 56, 44);
      ctx.restore();
    } catch (_) { /* keep drawn badge */ }
  }

  // Org name
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 22px Inter, Arial, sans-serif';
  ctx.fillText('Federation of Indian Professionals', 88, 42);
  ctx.fillStyle = GOLD;
  ctx.font = '13px Inter, Arial, sans-serif';
  ctx.fillText('www.fipin.org  ·  India\'s Premier Finance & Legal Network', 88, 62);
  ctx.restore();

  /* ── 5. Layout zones ── */
  const LEFT_W  = 660;   // left content
  const RIGHT_X = 690;   // right photo zone start
  const PAD     = 24;
  const CONTENT_TOP = 96;

  /* ── 6. LEFT — "Professional Development" tag ── */
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.beginPath(); roundRect(ctx, PAD, CONTENT_TOP, 250, 28, 6); ctx.fill();
  ctx.font = 'bold 11px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎓  PROFESSIONAL DEVELOPMENT', PAD + 12, CONTENT_TOP + 14);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  /* ── 7. LEFT — Course title (full, gold) ── */
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  let titleSize = 36;
  ctx.font = `bold ${titleSize}px Inter, Arial, sans-serif`;
  let titleLines = wrapLines(ctx, courseTitle || 'FIP Professional Course', LEFT_W - PAD * 2);
  // Scale down if too many lines
  while (titleLines.length > 3 && titleSize > 22) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px Inter, Arial, sans-serif`;
    titleLines = wrapLines(ctx, courseTitle || 'FIP Professional Course', LEFT_W - PAD * 2);
  }
  const titleLineH = titleSize + 8;
  titleLines.forEach((line, i) => ctx.fillText(line, PAD, CONTENT_TOP + 82 + i * titleLineH));
  ctx.restore();
  const titleEndY = CONTENT_TOP + 82 + titleLines.length * titleLineH;

  /* ── 8. LEFT — "What You'll Learn" section ── */
  const learnItems = Array.isArray(whatYouLearn)
    ? whatYouLearn.filter(Boolean)
    : String(whatYouLearn || '').split('\n').filter(Boolean);

  if (learnItems.length > 0) {
    ctx.save();
    ctx.textAlign = 'left';

    // Section label
    ctx.fillStyle = WHITE_60;
    ctx.font = 'bold 12px Inter, Arial, sans-serif';
    ctx.fillText('WHAT YOU\'LL LEARN:', PAD, titleEndY + 16);

    ctx.fillStyle = WHITE;
    ctx.font = '14px Inter, Arial, sans-serif';
    let y = titleEndY + 34;
    const maxItems = 5;
    learnItems.slice(0, maxItems).forEach((item, i) => {
      // Check-mark in orange
      ctx.fillStyle = ORANGE;
      ctx.font = 'bold 14px Inter, Arial, sans-serif';
      ctx.fillText('✓', PAD, y + i * 22);
      // Item text
      ctx.fillStyle = WHITE;
      ctx.font = '14px Inter, Arial, sans-serif';
      const txt = String(item).trim();
      const avail = LEFT_W - PAD * 2 - 24;
      const linesTxt = wrapLines(ctx, txt, avail);
      ctx.fillText(linesTxt[0] + (linesTxt.length > 1 ? '…' : ''), PAD + 24, y + i * 26);
    });
    ctx.restore();
  }

  /* ── 9. LEFT — Participant name box ── */
  const nameBoxY = H - 152;
  ctx.save();
  ctx.fillStyle = WHITE_10;
  ctx.strokeStyle = WHITE_20;
  ctx.lineWidth = 1;
  ctx.beginPath(); roundRect(ctx, PAD, nameBoxY, LEFT_W - PAD * 2, 60, 8);
  ctx.fill(); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = WHITE_60;
  ctx.font = 'bold 10px Inter, Arial, sans-serif';
  ctx.fillText('PARTICIPANT', PAD + 14, nameBoxY + 16);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 24px Inter, Arial, sans-serif';
  const displayName = String(name || 'Participant');
  const maxNW = LEFT_W - PAD * 2 - 28;
  if (ctx.measureText(displayName).width > maxNW) {
    const scale = maxNW / ctx.measureText(displayName).width;
    ctx.font = `bold ${Math.floor(24 * scale)}px Inter, Arial, sans-serif`;
  }
  ctx.fillText(displayName, PAD + 14, nameBoxY + 44);
  ctx.restore();

  /* ── 10. LEFT — Date ── */
  if (eventDate) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD;
    ctx.font = '600 13px Inter, Arial, sans-serif';
    const dateStr = new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText('📅  ' + dateStr, PAD, H - 54);
    ctx.restore();
  }

  /* ── 11. RIGHT — Photo circle (large, prominent) ── */
  const PR  = 130;  // radius — big and prominent
  const PX  = RIGHT_X + (W - RIGHT_X) / 2;
  const PY  = (H - 80) / 2 + 4;

  // Outer soft glow
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(PX, PY, PR + 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Gold ring
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(PX, PY, PR + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Draw photo or initials
  if (userPhoto) {
    try {
      const img = await loadImage(userPhoto);
      ctx.save();
      ctx.beginPath(); ctx.arc(PX, PY, PR, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, PX - PR, PY - PR, PR * 2, PR * 2);
      ctx.restore();
    } catch (_) { drawInitials(ctx, name, PX, PY, PR); }
  } else {
    drawInitials(ctx, name, PX, PY, PR);
  }

  // Name + FIP Member below circle
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 18px Inter, Arial, sans-serif';
  ctx.fillText(displayName, PX, PY + PR + 28);
  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 12px Inter, Arial, sans-serif';
  ctx.fillText('FIP Member', PX, PY + PR + 48);
  ctx.restore();

  /* ── 12. Bottom bar ── */
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, H - 42, W, 42);
  ctx.font = 'bold 14px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'Federation of Indian Professionals  ·  www.fipin.org  ·  #FIPMember  ·  #ConnectCollaborateConquer',
    W / 2, H - 21
  );
  ctx.restore();
}

/* ── BG ── */
function drawBg(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#060F22');
  g.addColorStop(0.5, BLUE_MID);
  g.addColorStop(1, '#040C1A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ── Initials fallback ── */
function drawInitials(ctx, name, x, y, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(26,60,110,0.8)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const initials = String(name || 'FP').split(' ').slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
  ctx.fillStyle = GOLD;
  ctx.font = `bold ${r * 0.65}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, x, y);
  ctx.restore();
}

/* ── React Component ── */
export default function FlyerGenerator({ name, courseTitle, whatYouLearn, eventDate, flyerTemplateUrl, logoUrl, onClose }) {
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const [rendering,   setRendering]   = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userPhoto,   setUserPhoto]   = useState(null);

  const redraw = (photo) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    drawFlyer(canvas, { name, courseTitle, whatYouLearn, eventDate, flyerTemplateUrl, logoUrl, userPhoto: photo })
      .finally(() => setRendering(false));
  };

  useEffect(() => { redraw(userPhoto); }, [name, courseTitle, whatYouLearn, eventDate, flyerTemplateUrl, logoUrl]);

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
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',color:'#fff',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Photo upload strip */}
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
              Shown in a large circle — people are more likely to share with a face!
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={handlePhotoChange}/>
          <button onClick={() => fileInputRef.current?.click()}
            style={{background:'rgba(255,208,155,0.12)',color:'#FFD09B',border:'1px solid rgba(255,208,155,0.3)',borderRadius:'8px',padding:'8px 16px',fontSize:'12px',fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
            {userPhoto ? '🔄 Change Photo' : '📷 Upload Photo'}
          </button>
        </div>

        {/* Canvas */}
        <div style={{padding:'16px',background:'rgba(0,0,0,0.2)',position:'relative'}}>
          {rendering && (
            <div style={{position:'absolute',inset:'16px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',borderRadius:'8px',zIndex:2}}>
              <div style={{textAlign:'center',color:'#fff'}}>
                <div style={{fontSize:'24px',marginBottom:'8px',animation:'spin 1s linear infinite'}}>⏳</div>
                <div style={{fontSize:'12px',opacity:.6}}>Generating flyer…</div>
              </div>
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
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'13px 20px',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>
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