// FlyerGenerator.jsx — LinkedIn/WhatsApp professional flyer
// Canvas-based, no external libs. 1200×630px (LinkedIn optimal).
import { useEffect, useRef, useState } from 'react';

/* ── Design tokens ─────────────────────────────────── */
const W = 1200, H = 630;
const BLUE_DARK  = '#0D1F3C';
const BLUE_MID   = '#1A3C6E';
const ORANGE     = '#F26522';
const GOLD       = '#FFD09B';
const WHITE      = '#FFFFFF';
const WHITE_70   = 'rgba(255,255,255,0.70)';
const WHITE_30   = 'rgba(255,255,255,0.18)';

/* ── Helpers ─────────────────────────────────────────*/
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/* ── Main draw function ──────────────────────────────*/
async function drawFlyer(canvas, { name, courseTitle, eventDate, flyerTemplateUrl, logoUrl }) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  // ── 1. Background ─────────────────────────────────
  if (flyerTemplateUrl) {
    try {
      const templateImg = await loadImage(flyerTemplateUrl);
      ctx.drawImage(templateImg, 0, 0, W, H);
      // Dark overlay so text is always readable
      ctx.fillStyle = 'rgba(10,20,45,0.62)';
      ctx.fillRect(0, 0, W, H);
    } catch {
      drawGradientBg(ctx);
    }
  } else {
    drawGradientBg(ctx);
  }

  // ── 2. Decorative elements ────────────────────────
  // Top-right circle accent
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = ORANGE;
  ctx.beginPath(); ctx.arc(W - 60, -60, 280, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(80, H + 30, 260, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Left vertical accent bar
  ctx.save();
  const bar = ctx.createLinearGradient(0, 0, 0, H);
  bar.addColorStop(0, ORANGE);
  bar.addColorStop(1, '#FF8C42');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, 6, H);
  ctx.restore();

  // ── 3. FIP Logo / brand top-left ──────────────────
  ctx.save();
  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      ctx.drawImage(logo, 36, 32, 56, 56);
    } catch { drawFipText(ctx, 36, 52); }
  } else {
    drawFipText(ctx, 36, 52);
  }
  ctx.restore();

  // FIP name
  ctx.font = 'bold 18px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.fillText('Federation of Indian Professionals', 102, 50);
  ctx.font = '13px Inter, Arial, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('www.fipin.org', 102, 70);

  // ── 4. "Sharing something exciting!" tag ──────────
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  roundRect(ctx, 36, 110, 280, 34, 8);
  ctx.fill();
  ctx.font = 'bold 13px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.fillText('🎓  PROFESSIONAL DEVELOPMENT', 52, 132);
  ctx.restore();

  // ── 5. Main headline ─────────────────────────────
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = WHITE_70;
  ctx.font = '500 22px Inter, Arial, sans-serif';
  ctx.fillText("I'm excited to share that", 36, 190);

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 64px Inter, Arial, sans-serif';
  const displayName = name || 'Your Name';
  // Scale font if name is long
  const nameMetrics = ctx.measureText(displayName);
  if (nameMetrics.width > W - 72) {
    const scale = (W - 72) / nameMetrics.width;
    ctx.font = `bold ${Math.floor(64 * scale)}px Inter, Arial, sans-serif`;
  }
  ctx.fillText(displayName, 36, 270);
  ctx.restore();

  // ── 6. Course info ────────────────────────────────
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = WHITE_70;
  ctx.font = '500 22px Inter, Arial, sans-serif';
  ctx.fillText('successfully participated in', 36, 315);

  ctx.fillStyle = WHITE;
  ctx.font = 'bold 34px Inter, Arial, sans-serif';
  const lines = wrapTextLines(ctx, courseTitle || 'FIP Professional Course', W - 72, 34);
  lines.forEach((line, i) => ctx.fillText(line, 36, 360 + i * 42));
  ctx.restore();

  // ── 7. Date badge ─────────────────────────────────
  const dateY = 360 + Math.max(1, lines.length) * 42 + 20;
  if (eventDate) {
    ctx.save();
    ctx.fillStyle = WHITE_30;
    ctx.beginPath(); roundRect(ctx, 36, dateY, 220, 38, 8); ctx.fill();
    ctx.font = '600 16px Inter, Arial, sans-serif';
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'left';
    ctx.fillText('📅  ' + new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 52, dateY + 25);
    ctx.restore();
  }

  // ── 8. Bottom bar ─────────────────────────────────
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, H - 58, W, 58);
  ctx.font = 'bold 20px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('Proudly organised by Federation of Indian Professionals  ·  www.fipin.org', W / 2, H - 24);
  ctx.restore();

  // ── 9. Hashtag bottom-right ───────────────────────
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = '600 13px Inter, Arial, sans-serif';
  ctx.fillStyle = WHITE_70;
  ctx.fillText('#FIPMember  #ProfessionalDevelopment  #ConnectCollaborateConquer', W - 36, H - 75);
  ctx.restore();
}

/* ── BG helper ───────────────────────────────────── */
function drawGradientBg(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0A1628');
  g.addColorStop(0.5, BLUE_MID);
  g.addColorStop(1, '#071020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawFipText(ctx, x, y) {
  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'left';
  ctx.fillText('FIP', x, y + 20);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextLines(ctx, text, maxW, _lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ── React Component ─────────────────────────────── */
export default function FlyerGenerator({ name, courseTitle, eventDate, flyerTemplateUrl, logoUrl, onClose }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    drawFlyer(canvas, { name, courseTitle, eventDate, flyerTemplateUrl, logoUrl })
      .finally(() => setRendering(false));
  }, [name, courseTitle, eventDate, flyerTemplateUrl, logoUrl]);

  const handleDownload = () => {
    setDownloading(true);
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `FIP_${(name || 'Participant').replace(/\s+/g, '_')}_Flyer.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 'image/png');
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
      padding:'16px', backdropFilter:'blur(6px)',
    }}>
      <div style={{
        background:'#0D1F3C', borderRadius:'20px', overflow:'hidden',
        maxWidth:'700px', width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
        border:'1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Header */}
        <div style={{padding:'20px 24px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <div>
            <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'3px'}}>
              🎉 Your Shareable Flyer is Ready!
            </div>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.55)'}}>
              Share on LinkedIn, WhatsApp, or Instagram to celebrate your achievement
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',color:'#fff',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Canvas preview */}
        <div style={{padding:'20px',position:'relative',background:'rgba(0,0,0,0.3)'}}>
          {rendering && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)',borderRadius:'8px',zIndex:2}}>
              <div style={{textAlign:'center',color:'#fff'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',display:'block',marginBottom:'10px',color:'#FFD09B'}}></i>
                <div style={{fontSize:'13px',opacity:.7}}>Generating your flyer…</div>
              </div>
            </div>
          )}
          <canvas ref={canvasRef}
            style={{width:'100%',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.1)',display:'block'}}/>
        </div>

        {/* Actions */}
        <div style={{padding:'16px 20px 20px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
          <button onClick={handleDownload} disabled={rendering || downloading}
            style={{flex:1,background:'#F26522',color:'#fff',border:'none',borderRadius:'10px',padding:'13px 20px',fontWeight:800,fontSize:'15px',cursor:rendering||downloading?'not-allowed':'pointer',opacity:rendering||downloading?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            {downloading ? <><i className="fa-solid fa-spinner fa-spin"></i> Preparing…</> : <><i className="fa-solid fa-download"></i> Download Flyer (PNG)</>}
          </button>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'13px 20px',fontWeight:600,fontSize:'14px',cursor:'pointer',minWidth:'120px'}}>
            Skip for now
          </button>
        </div>

        {/* Share tip */}
        <div style={{padding:'0 20px 18px',fontSize:'12px',color:'rgba(255,255,255,0.35)',textAlign:'center'}}>
          💡 Tip: Download and share on LinkedIn to grow your professional network. Tag @FIP and use <strong style={{color:'rgba(255,208,155,0.6)'}}>#FIPMember</strong>
        </div>
      </div>
    </div>
  );
}