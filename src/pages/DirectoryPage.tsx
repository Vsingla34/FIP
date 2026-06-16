import { useState } from 'react';
import { members } from '../data/index.js';
import { useApp } from '../context/AppContext.jsx';

export default function DirectoryPage() {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [profFilter, setProfFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const filtered = members.filter(m => {
    const matchProf = profFilter === 'all' || m.profession === profFilter;
    const matchCity = cityFilter === 'all' || m.city === cityFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.speciality.toLowerCase().includes(search.toLowerCase());
    return matchProf && matchCity && matchSearch;
  });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Member Directory</span></div>
          <h1>Member Directory</h1>
          <p>Connect with 3,000+ professionals across CA, CS, CMA and Law practices.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}}>
            <div className="search-wrap" style={{flex:1,minWidth:'260px',marginBottom:0}}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" placeholder="Search by name, firm or specialisation…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{width:'180px'}} value={profFilter} onChange={e => setProfFilter(e.target.value)}>
              <option value="all">All Professions</option>
              <option value="CA">Chartered Accountants</option>
              <option value="CS">Company Secretaries</option>
              <option value="CMA">Cost Accountants</option>
              <option value="Advocate">Advocates</option>
            </select>
            <select className="form-select" style={{width:'160px'}} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="all">All Cities</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Showing {filtered.length} members</p>
          <div className="dir-grid">
            {filtered.map(m => {
              const initials = m.name.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2);
              return (
                <div className="dir-card" key={m.id}>
                  <div className="dir-av">{initials}</div>
                  <div>
                    <div className="dir-name">{m.name}</div>
                    <div className="dir-desg">{m.designation}</div>
                    <div className="dir-city"><i className="fa-solid fa-location-dot" style={{color:'var(--orange)',fontSize:'10px',marginRight:'4px'}}></i>{m.city}</div>
                    <div className="dir-tags">
                      <span className="dir-tag">{m.profession}</span>
                      <span className="dir-tag">{m.speciality}</span>
                    </div>
                    <button className="dir-connect-btn" onClick={() => showToast(`Connection request sent to ${m.name}!`)}>Connect</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}