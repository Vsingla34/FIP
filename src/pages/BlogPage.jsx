import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BlogPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');

  const posts = [
    { slug:'blog1', thumb:'📋', thumbCls:'bt-blue', cat:'GST', title:'New GST Amnesty Scheme 2025 — What Practitioners Must Know', date:'Jun 2025', read:'5 min', badge:'badge-orange', badgeLabel:'GST' },
    { slug:'blog2', thumb:'⚖️', thumbCls:'bt-orange', cat:'Corporate Law', title:'NCLT Landmark Judgements in 2025 — Summary for CS Professionals', date:'May 2025', read:'8 min', badge:'badge-blue', badgeLabel:'Corp Law' },
    { slug:'blog3', thumb:'📊', thumbCls:'bt-green', cat:'Direct Tax', title:'Budget 2025 — Key Changes Affecting Your CA Practice', date:'Feb 2025', read:'10 min', badge:'badge-orange', badgeLabel:'Tax' },
    { slug:'blog4', thumb:'🌐', thumbCls:'bt-purple', cat:'FEMA & RBI', title:'New FEMA Reporting Requirements — A Compliance Checklist', date:'Jan 2025', read:'6 min', badge:'badge-blue', badgeLabel:'FEMA' },
  ];

  const filters = ['All','GST','Direct Tax','Corporate Law','FEMA & RBI'];
  const visible = filter === 'All' ? posts : posts.filter(p => p.cat === filter);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Blog</span></div>
          <h1>Insights &amp; Analysis</h1>
          <p>Expert perspectives on tax, law, compliance, and professional practice from FIP's community.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="filter-pills">
            {filters.map(f => (
              <div key={f} className={`fpill${filter===f?' active':''}`} onClick={() => setFilter(f)}>{f}</div>
            ))}
          </div>
          <div className="blog-grid">
            {visible.map((p,i) => (
              <div className="blog-card" key={i} onClick={() => navigate(`/blog/${p.slug}`)}>
                <div className={`blog-thumb ${p.thumbCls}`}>{p.thumb}</div>
                <div className="blog-body">
                  <div className="blog-cat">{p.cat}</div>
                  <div className="blog-title">{p.title}</div>
                  <div className="blog-meta">
                    <span>{p.date} · {p.read}</span>
                    <span className={`badge ${p.badge}`}>{p.badgeLabel}</span>
                  </div>
                  <div className="blog-readmore">Read Article <i className="fa-solid fa-arrow-right"></i></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}