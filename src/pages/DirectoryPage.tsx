import { useState, useEffect } from 'react';
import { members as hardcodedMembers } from '../data/index.js';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function DirectoryPage() {
  const { showToast } = useApp();
  const [search,     setSearch]     = useState('');
  const [profFilter, setProfFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [liveMembers, setLiveMembers] = useState([]);

  // Load committee members from Supabase to highlight them
  useEffect(() => {
    supabase.rpc('get_committee_members').then(({ data }) => {
      setLiveMembers(data || []);
    });
  }, []);

  // Merge: mark hardcoded members who are also committee members
  const committeeNames = new Set(liveMembers.map(m => m.full_name?.toLowerCase()));

  const filtered = hardcodedMembers.filter(m => {
    const matchProf   = profFilter === 'all' || m.profession === profFilter;
    const matchCity   = cityFilter === 'all' || m.city === cityFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.speciality.toLowerCase().includes(search.toLowerCase());
    return matchProf && matchCity && matchSearch;
  });

  // Committee members first
  const sorted = [...filtered].sort((a, b) => {
    const aGold = committeeNames.has(a.name.toLowerCase());
    const bGold = committeeNames.has(b.name.toLowerCase());
    return bGold - aGold;
  });

  const getCommitteeInfo = (name) =>
    liveMembers.find(m => m.full_name?.toLowerCase() === name.toLowerCase());

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

          {/* Legend */}
          {liveMembers.length > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'16px',flexWrap:'wrap'}}>
              <p style={{fontSize:'13px',color:'var(--text-muted)',margin:0}}>Showing {sorted.length} members</p>
              <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'#8B6000',background:'rgba(184,134,11,0.08)',padding:'4px 12px',borderRadius:'20px',border:'1px solid rgba(184,134,11,0.2)'}}>
                <i className="fa-solid fa-crown" style={{fontSize:'10px'}}></i>
                Committee Members highlighted
              </div>
            </div>
          )}

          <div className="dir-grid">
            {sorted.map(m => {
              const initials     = m.name.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2);
              const committeeInfo = getCommitteeInfo(m.name);
              const isGold       = !!committeeInfo;

              return (
                <div className={`dir-card${isGold ? ' gold-member-card' : ''}`} key={m.id}>
                  {/* Gold crown top-right */}
                  {isGold && (
                    <div style={{position:'absolute',top:'12px',right:'12px',display:'flex',alignItems:'center',gap:'4px'}}>
                      <span className="gold-badge"><i className="fa-solid fa-crown"></i> Committee</span>
                    </div>
                  )}

                  {/* Avatar with gold ring for committee members */}
                  {isGold ? (
                    <div className="gold-avatar-ring" style={{flexShrink:0}}>
                      <div className="dir-av" style={{border:'none',background:'linear-gradient(135deg,#B8860B,#DAA520)',color:'#3D2B00'}}>
                        {initials}
                      </div>
                    </div>
                  ) : (
                    <div className="dir-av">{initials}</div>
                  )}

                  <div style={{flex:1,minWidth:0}}>
                    <div className="dir-name" style={isGold ? {color:'#3D2B00'} : {}}>
                      {m.name}
                    </div>
                    <div className="dir-desg">{m.designation}</div>
                    {isGold && committeeInfo && (
                      <div style={{fontSize:'11px',color:'#8B6000',fontWeight:600,marginBottom:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                        <i className="fa-solid fa-users" style={{fontSize:'9px'}}></i>
                        {committeeInfo.committee_role} · {committeeInfo.committee_name?.replace(' Committee','')}
                      </div>
                    )}
                    <div className="dir-city">
                      <i className="fa-solid fa-location-dot" style={{color:'var(--orange)',fontSize:'10px',marginRight:'4px'}}></i>
                      {m.city}
                    </div>
                    <div className="dir-tags">
                      <span className="dir-tag">{m.profession}</span>
                      <span className="dir-tag">{m.speciality}</span>
                    </div>
                    <button className="dir-connect-btn" onClick={() => showToast(`Connection request sent to ${m.name}!`)}>
                      Connect
                    </button>
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