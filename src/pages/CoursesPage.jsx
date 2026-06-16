import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function CoursesPage() {
  const { openModal } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const allCourses = [
    { bg:'ct-blue', emoji:'📑', tag:'tag-hot', tagLabel:'Hot', cat:'GST & Indirect Tax', title:'Mastering GST Litigation — Sankalp 2026', instr:'CA Gaurav Aggarwal', sessions:'6 Sessions', level:'Intermediate', price:'₹999', free:false, category:'gst' },
    { bg:'ct-teal', emoji:'🏛', tag:'tag-free', tagLabel:'Free for Members', cat:'Corporate Law', title:'NCLT & Corporate Insolvency Practice', instr:'Expert Panel', sessions:'4 Sessions', level:'Advanced', price:'Members Free', free:true, category:'corp free' },
    { bg:'ct-orange', emoji:'📊', tag:null, tagLabel:null, cat:'Direct Tax', title:'Income Tax Search & Seizure — Practical Guide', instr:'Senior Practitioners', sessions:'5 Sessions', level:'Advanced', price:'₹1,499', free:false, category:'tax' },
    { bg:'ct-purple', emoji:'⚖️', tag:'tag-free', tagLabel:'Free for Members', cat:'Company Law', title:'FEMA & RBI Compliance for CS Professionals', instr:'CS Expert Panel', sessions:'3 Sessions', level:'Intermediate', price:'Members Free', free:true, category:'corp free' },
    { bg:'ct-green', emoji:'📈', tag:null, tagLabel:null, cat:'Finance & Valuation', title:'Business Valuation Under SEBI & IBC', instr:'IBBI Registered Valuers', sessions:'4 Sessions', level:'Advanced', price:'₹1,999', free:false, category:'corp' },
    { bg:'ct-red', emoji:'🔍', tag:null, tagLabel:null, cat:'Audit & Assurance', title:'Forensic Audit & Fraud Detection in Practice', instr:'CFE Practitioners', sessions:'5 Sessions', level:'Advanced', price:'₹1,299', free:false, category:'audit' },
  ];

  const filtered = allCourses.filter(c => {
    const matchCat = filter === 'all' || c.category.includes(filter);
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.cat.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Courses</span></div>
          <h1>Courses &amp; Programmes</h1>
          <p>Expert-led, CPE-eligible courses for CAs, CSs, CMAs and legal professionals.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="Search — GST, NCLT, Income Tax, Company Law…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-pills">
            {[['all','All Courses'],['gst','GST & Indirect Tax'],['tax','Direct Tax'],['corp','Corporate Law'],['audit','Audit & Assurance'],['free','Free for Members']].map(([val,label]) => (
              <div key={val} className={`fpill${filter===val?' active':''}`} onClick={() => setFilter(val)}>{label}</div>
            ))}
          </div>
          <div className="course-grid">
            {filtered.map((c,i) => (
              <div className="course-card" key={i} onClick={() => openModal('enroll')}>
                <div className={`course-thumb ${c.bg}`}>
                  <span>{c.emoji}</span>
                  {c.tag && <span className={`course-tag ${c.tag}`}>{c.tagLabel}</span>}
                </div>
                <div className="course-body">
                  <div className="course-cat">{c.cat}</div>
                  <div className="course-title">{c.title}</div>
                  <div className="course-instr"><i className="fa-solid fa-user-tie" style={{fontSize:'10px',color:'var(--text-light)'}}></i> {c.instr}</div>
                  <div className="course-meta"><span><i className="fa-regular fa-clock"></i> {c.sessions}</span><span><i className="fa-solid fa-signal"></i> {c.level}</span></div>
                  <div className="course-footer">
                    {c.free ? <span className="course-price-free">{c.price}</span> : <span className="course-price">{c.price}</span>}
                    <button className="c-enroll-btn" onClick={e => { e.stopPropagation(); openModal('enroll'); }}>Enroll Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p style={{textAlign:'center',color:'var(--text-muted)',padding:'40px'}}>No courses match your search.</p>}
        </div>
      </section>
    </>
  );
}