import { useState, useRef, useCallback } from 'react';

/* A4-landscape point dimensions used server-side in generate-certificates.js.
   The editor canvas is FORCED to this exact aspect ratio and the background
   image is stretched to fill it (object-fit: fill) — not contain/cover — so
   that xPct/yPct saved here land in exactly the same spot when the backend
   draws the same stretched image at width=W,height=H. If editor and backend
   ever used different fit modes, positions would drift between preview and
   the actual PDF. */
const PAGE_W = 841.89;
const PAGE_H = 595.28;

const FIXED_KEYS = [
  { key: 'name',               label: 'Name',            type: 'text',  sample: 'John Doe',                         fontSize: 34, color: '#1A3C6E', bold: true  },
  { key: 'course',              label: 'Course title',    type: 'text',  sample: 'Sample Course Title',              fontSize: 20, color: '#F26122', bold: false },
  { key: 'date',                 label: 'Date',            type: 'text',  sample: '1 January 2026',                   fontSize: 13, color: '#666666', bold: false },
  { key: 'certificate_number',   label: 'Certificate no.', type: 'text',  sample: 'FIP-2026-00001',                   fontSize: 9,  color: '#999999', bold: false },
  { key: 'organisation',         label: 'Organisation',    type: 'text',  sample: 'Federation of Indian Professionals', fontSize: 12, color: '#1A3C6E', bold: true },
  { key: 'signature',            label: 'Signature',       type: 'image', sample: null,                                fontSize: null, color: null, bold: false },
];

const FONT_OPTIONS = [
  { v: 'Helvetica',            l: 'Sans' },
  { v: 'Helvetica-Bold',       l: 'Sans bold' },
  { v: 'Helvetica-Oblique',    l: 'Sans italic' },
  { v: 'Times-Roman',          l: 'Serif' },
  { v: 'Times-Bold',           l: 'Serif bold' },
  { v: 'Times-Italic',         l: 'Serif italic' },
];

let idCounter = 0;
const newId = () => `el_${Date.now()}_${idCounter++}`;

/* Renders a solid-design background as CSS that mirrors the shapes PDFKit
   draws server-side (doc.rect + strokeColor). Percent-based so it scales
   with the canvas exactly like the image path does. */
function SolidBackground({ bg }) {
  const outerW = bg.outerBorder?.width || 0;
  const innerInset = bg.innerBorder?.inset || 0;
  return (
    <div style={{ position:'absolute', inset:0, background: bg.bgColor || '#FFFFFF' }}>
      {bg.topBar && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:`${(bg.topBar.height/PAGE_H)*100}%`, background:bg.topBar.color }}/>
      )}
      {bg.bottomBar && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${(bg.bottomBar.height/PAGE_H)*100}%`, background:bg.bottomBar.color }}/>
      )}
      {bg.outerBorder && (
        <div style={{ position:'absolute', inset:`${(outerW/2/PAGE_H)*100}% ${(outerW/2/PAGE_W)*100}%`,
          border:`${Math.max(1,outerW)}px solid ${bg.outerBorder.color}` }}/>
      )}
      {bg.innerBorder && (
        <div style={{ position:'absolute', inset:`${(innerInset/PAGE_H)*100}% ${(innerInset/PAGE_W)*100}%`,
          border:`${Math.max(1,bg.innerBorder.width)}px solid ${bg.innerBorder.color}` }}/>
      )}
    </div>
  );
}

export default function CertificateTemplateEditor({ background, onBackgroundChange, layout, onChange, onUploadSignature, signatureUrl, onUploadImage }) {
  const [selectedId, setSelectedId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const canvasRef = useRef(null);

  const selected = layout.find(e => e.id === selectedId) || null;
  const usedKeys = new Set(layout.filter(e => e.key !== 'custom').map(e => e.key));

  const update = (id, patch) => onChange(layout.map(e => e.id === id ? { ...e, ...patch } : e));
  const remove = (id) => { onChange(layout.filter(e => e.id !== id)); if (selectedId === id) setSelectedId(null); };

  const addFixed = (def) => {
    if (usedKeys.has(def.key)) { setSelectedId(layout.find(e => e.key === def.key)?.id || null); return; }
    const el = def.type === 'image'
      ? { id: newId(), type: 'image', key: 'signature', xPct: 50, yPct: 78, imgWidthPct: 16, imgHeightPct: 8 }
      : { id: newId(), type: 'text', key: def.key, xPct: 50, yPct: 50, widthPct: 70,
          fontSize: def.fontSize, color: def.color, fontFamily: def.bold ? 'Helvetica-Bold' : 'Helvetica', align: 'center' };
    onChange([...layout, el]);
    setSelectedId(el.id);
  };

  const addCustom = () => {
    const el = { id: newId(), type: 'text', key: 'custom', text: 'Edit this text',
                 xPct: 50, yPct: 50, widthPct: 60, fontSize: 16, color: '#333333',
                 fontFamily: 'Helvetica', align: 'center' };
    onChange([...layout, el]);
    setSelectedId(el.id);
  };

  const pctFromPointer = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { xPct, yPct };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragId) return;
    const { xPct, yPct } = pctFromPointer(e.clientX, e.clientY);
    update(dragId, { xPct, yPct });
  }, [dragId, layout]);

  const onPointerUp = useCallback(() => setDragId(null), []);

  return (
    <div onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}>
      {/* Insert palette */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
        {FIXED_KEYS.map(def => (
          <button key={def.key} type="button"
            onClick={() => addFixed(def)}
            style={{
              fontSize:'12px', fontWeight:600, padding:'7px 12px', borderRadius:'20px', cursor:'pointer',
              border: usedKeys.has(def.key) ? '1px solid var(--orange)' : '1px solid var(--border)',
              background: usedKeys.has(def.key) ? 'rgba(242,97,34,0.1)' : 'var(--surface)',
              color: usedKeys.has(def.key) ? 'var(--orange)' : 'var(--blue)',
            }}>
            {def.type === 'image' ? <i className="fa-solid fa-signature" style={{marginRight:'5px'}}></i>
                                   : <i className="fa-solid fa-plus" style={{marginRight:'5px'}}></i>}
            {def.label}{usedKeys.has(def.key) ? ' ✓' : ''}
          </button>
        ))}
        <button type="button" onClick={addCustom}
          style={{fontSize:'12px',fontWeight:600,padding:'7px 12px',borderRadius:'20px',cursor:'pointer',
                  border:'1px dashed var(--border)',background:'var(--surface)',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-font" style={{marginRight:'5px'}}></i>Add custom text
        </button>
      </div>

      {/* Background swap / settings */}
      <div style={{display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap', marginBottom:'10px'}}>
        {background?.kind === 'image' ? (
          <label style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'var(--surface)', border:'1px solid var(--border)',
            padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:600, color:'var(--blue)'}}>
            <i className="fa-solid fa-image"></i>Replace image
            <input type="file" accept="image/png,image/jpeg" style={{display:'none'}}
              onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])}/>
          </label>
        ) : background ? (
          <div style={{display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', fontSize:'11px', color:'var(--text-muted)'}}>
            <span>Background</span>
            <input type="color" value={background.bgColor || '#ffffff'}
              onChange={e => onBackgroundChange({ ...background, bgColor: e.target.value })}
              style={{width:'28px', height:'26px', padding:0, border:'1px solid var(--border)', borderRadius:'5px', cursor:'pointer'}}/>
            {background.outerBorder && (
              <>
                <span>Border</span>
                <input type="color" value={background.outerBorder.color}
                  onChange={e => onBackgroundChange({ ...background, outerBorder: { ...background.outerBorder, color: e.target.value } })}
                  style={{width:'28px', height:'26px', padding:0, border:'1px solid var(--border)', borderRadius:'5px', cursor:'pointer'}}/>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Canvas */}
      <div ref={canvasRef}
        style={{
          position:'relative', width:'100%', aspectRatio: `${PAGE_W}/${PAGE_H}`,
          background:'#eee', borderRadius:'10px', overflow:'hidden',
          border:'1px solid var(--border)', userSelect: dragId ? 'none' : 'auto',
        }}
        onMouseDown={() => setSelectedId(null)}>
        {background?.kind === 'image' && background.url && (
          <img src={background.url} alt="" draggable={false}
            style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none'}}/>
        )}
        {background && background.kind !== 'image' && <SolidBackground bg={background}/>}
        {layout.map(el => {
          const isSel = el.id === selectedId;
          if (el.type === 'image') {
            return (
              <div key={el.id}
                onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); setDragId(el.id); }}
                style={{
                  position:'absolute', left:`${el.xPct}%`, top:`${el.yPct}%`,
                  width:`${el.imgWidthPct}%`, height:`${el.imgHeightPct}%`,
                  transform:'translate(-50%,-50%)', cursor:'grab',
                  border: isSel ? '2px dashed var(--orange)' : '1px dashed rgba(0,0,0,0.25)',
                  background: signatureUrl ? 'transparent' : 'rgba(255,255,255,0.6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                {signatureUrl
                  ? <img src={signatureUrl} alt="Signature" draggable={false} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',pointerEvents:'none'}}/>
                  : <span style={{fontSize:'10px',color:'#888'}}>Signature</span>}
              </div>
            );
          }
          const sample = FIXED_KEYS.find(f => f.key === el.key)?.sample;
          const previewText = el.key === 'custom' ? (el.text || '') : sample;
          return (
            <div key={el.id}
              onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); setDragId(el.id); }}
              style={{
                position:'absolute', left:`${el.xPct}%`, top:`${el.yPct}%`,
                width:`${el.widthPct}%`, transform:'translate(-50%,-50%)', cursor:'grab',
                textAlign: el.align || 'center',
                fontSize:`${el.fontSize}px`, color: el.color,
                fontWeight: (el.fontFamily||'').includes('Bold') ? 700 : 400,
                fontStyle: (el.fontFamily||'').includes('Oblique') || (el.fontFamily||'').includes('Italic') ? 'italic' : 'normal',
                fontFamily: (el.fontFamily||'').startsWith('Times') ? 'Georgia, serif' : 'Arial, sans-serif',
                padding:'2px 4px', border: isSel ? '2px dashed var(--orange)' : '1px dashed transparent',
                whiteSpace:'pre-wrap', lineHeight:1.15,
              }}>
              {previewText}
            </div>
          );
        })}
      </div>

      {/* Element inspector */}
      {selected ? (
        <div style={{marginTop:'12px', background:'var(--off-white)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <span style={{fontSize:'12px', fontWeight:700, color:'var(--blue)'}}>
              Editing: {selected.key === 'custom' ? 'Custom text' : FIXED_KEYS.find(f => f.key === selected.key)?.label}
            </span>
            <button type="button" onClick={() => remove(selected.id)}
              style={{fontSize:'11px', color:'#C0392B', background:'none', border:'none', cursor:'pointer'}}>
              <i className="fa-solid fa-trash" style={{marginRight:'4px'}}></i>Remove
            </button>
          </div>

          {selected.type === 'image' ? (
            <div style={{display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap'}}>
              <label style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'var(--blue)', color:'#fff',
                padding:'8px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:700}}>
                <i className="fa-solid fa-upload"></i>{signatureUrl ? 'Change signature image' : 'Upload signature image'}
                <input type="file" accept="image/png,image/jpeg" style={{display:'none'}}
                  onChange={(e) => e.target.files?.[0] && onUploadSignature(e.target.files[0])}/>
              </label>
              <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{fontSize:'11px', color:'var(--text-muted)'}}>Width %</span>
                <input type="number" min="4" max="60" value={selected.imgWidthPct}
                  onChange={e => update(selected.id, { imgWidthPct: Number(e.target.value) })}
                  className="form-input" style={{width:'64px', padding:'4px 6px', fontSize:'12px'}}/>
                <span style={{fontSize:'11px', color:'var(--text-muted)'}}>Height %</span>
                <input type="number" min="2" max="40" value={selected.imgHeightPct}
                  onChange={e => update(selected.id, { imgHeightPct: Number(e.target.value) })}
                  className="form-input" style={{width:'64px', padding:'4px 6px', fontSize:'12px'}}/>
              </div>
            </div>
          ) : (
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center'}}>
              {selected.key === 'custom' && (
                <input type="text" value={selected.text} placeholder="Text to show on every certificate"
                  onChange={e => update(selected.id, { text: e.target.value })}
                  className="form-input" style={{flex:'1 1 220px', minWidth:'180px', padding:'6px 10px', fontSize:'13px'}}/>
              )}
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                <span style={{fontSize:'11px', color:'var(--text-muted)'}}>Size</span>
                <input type="number" min="6" max="80" value={selected.fontSize}
                  onChange={e => update(selected.id, { fontSize: Number(e.target.value) })}
                  className="form-input" style={{width:'56px', padding:'4px 6px', fontSize:'12px'}}/>
              </div>
              <input type="color" value={selected.color}
                onChange={e => update(selected.id, { color: e.target.value })}
                style={{width:'34px', height:'30px', padding:0, border:'1px solid var(--border)', borderRadius:'6px', cursor:'pointer'}}/>
              <select className="form-select" style={{width:'130px', padding:'5px 8px', fontSize:'12px'}}
                value={selected.fontFamily} onChange={e => update(selected.id, { fontFamily: e.target.value })}>
                {FONT_OPTIONS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
              <div style={{display:'flex', border:'1px solid var(--border)', borderRadius:'6px', overflow:'hidden'}}>
                {['left','center','right'].map(a => (
                  <button key={a} type="button" onClick={() => update(selected.id, { align: a })}
                    style={{padding:'6px 9px', border:'none', cursor:'pointer',
                      background: selected.align === a ? 'var(--blue)' : 'var(--surface)',
                      color: selected.align === a ? '#fff' : 'var(--text-muted)'}}>
                    <i className={`fa-solid fa-align-${a}`}></i>
                  </button>
                ))}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                <span style={{fontSize:'11px', color:'var(--text-muted)'}}>Box width %</span>
                <input type="number" min="10" max="100" value={selected.widthPct}
                  onChange={e => update(selected.id, { widthPct: Number(e.target.value) })}
                  className="form-input" style={{width:'56px', padding:'4px 6px', fontSize:'12px'}}/>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{marginTop:'12px', fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic'}}>
          Click an element on the certificate to edit it, or drag it to reposition.
        </div>
      )}
    </div>
  );
}