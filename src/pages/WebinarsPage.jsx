import { useState } from 'react';

export default function WebinarsPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  const videos = [
    { title:'GST Masterclass — Sankalp 2026', speaker:'CA Gaurav Aggarwal', duration:'1:28:00', date:'Dec 2025', desc:'A comprehensive walkthrough of recent GST amendments, litigation strategies, and appeal procedures for practising tax professionals.' },
    { title:'NCLT Procedure & Insolvency Practice', speaker:'Adv. Gaurav Gupta', duration:'1:12:00', date:'Nov 2025', desc:'End-to-end guidance on CIRP filings, timeline management, and navigating NCLT benches.' },
    { title:'Income Tax Search & Seizure', speaker:'Senior Practitioners Panel', duration:'58:00', date:'Oct 2025', desc:'Real-world case studies and practical tips on handling IT raids and post-search compliance.' },
    { title:'FEMA Compliance for CS Professionals', speaker:'CS Expert Panel', duration:'45:00', date:'Sep 2025', desc:'Key FEMA reporting obligations, ODI/FDI norms, and RBI compliance checklists for Company Secretaries.' },
    { title:'Business Valuation Under IBC', speaker:'IBBI Registered Valuers', duration:'1:05:00', date:'Aug 2025', desc:'Valuation methodologies applicable in insolvency resolution and their practical application.' },
  ];

  const active = videos[activeIdx];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Webinars</span></div>
          <h1>Webinars &amp; Recordings</h1>
          <p>On-demand access to 200+ expert sessions. New webinars added every week.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="video-grid">
            <div>
              <div className="video-player-wrap">
                <div className="video-placeholder">
                  <div className="vp-play"><i className="fa-solid fa-play"></i></div>
                  <div className="vp-title">{active.title}</div>
                  <div className="vp-meta">{active.speaker} · {active.duration}</div>
                </div>
              </div>
              <div className="video-info-panel" style={{marginTop:'20px'}}>
                <div className="video-info-title">{active.title}</div>
                <div className="video-tags">
                  <span className="badge badge-blue">{active.speaker}</span>
                  <span className="badge badge-gray">{active.duration}</span>
                  <span className="badge badge-orange">{active.date}</span>
                </div>
                <div className="video-desc">{active.desc}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>All Recordings</div>
              {videos.map((v,i) => (
                <div className="video-list-item" key={i} onClick={() => setActiveIdx(i)} style={{opacity: i===activeIdx ? 1 : 0.75}}>
                  <div className="vli-thumb">
                    <i className="fa-solid fa-play" style={{fontSize:'12px'}}></i>
                    <span className="vli-dur">{v.duration}</span>
                  </div>
                  <div>
                    <div className="vli-title">{v.title}</div>
                    <div className="vli-meta">{v.speaker} · {v.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}