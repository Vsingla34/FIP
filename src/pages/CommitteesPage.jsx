import { useState, useEffect } from 'react';
import { committees as defaultCommittees } from '../data/index.js';

const STORAGE_KEY = 'fip_committees';

function loadCommittees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultCommittees;
  } catch { return defaultCommittees; }
}

export default function CommitteesPage() {
  const [committees, setCommittees] = useState(loadCommittees);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('All');

  /* sync when admin makes changes */
  useEffect(() => {
    const sync = () => setCommittees(loadCommittees());
    window.addEventListener('committees-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('committees-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const categories = ['All', ...new Set(committees.map(c => c.category))];
  const filtered   = committees.filter(c =>
    (filter === 'All' || c.category === filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     (c.desc||'').toLowerCase().includes(search.toLowerCase()))
  );

  const getRoleStyle = (role) => {
    const r = role.toLowerCase();
    if (r.includes('president')||r.includes('chairman')||r.includes('chairperson'))
      return { avCls:'cm-av-chair', roleCls:'cm-role-chair' };
    if (r.includes('vice')||r.includes('co-chair')||r.includes('secretary')||r.includes('treasurer'))
      return { avCls:'cm-av-vice', roleCls:'cm-role-vice' };
    return { avCls:'cm-av-member', roleCls:'cm-role-member' };
  };

  const getInitials = (name) =>
    name.split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Committees</span></div>
          <h1>Our Committees</h1>
          <p>Specialist groups driving policy, practice excellence, and professional advocacy across FIP.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="committee-filter-bar">
            <div className="search-wrap" style={{marginBottom:0}}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" placeholder="Search committees…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="filter-pills" style={{marginBottom:0}}>
              {categories.map(c=>(
                <div key={c} className={`fpill${filter===c?' active':''}`} onClick={()=>setFilter(c)}>{c}</div>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-people-group" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
              No committees match your search.
            </div>
          ) : (
            <div className="committee-grid">
              {filtered.map(c=>(
                <div className="committee-card" key={c.id}>
                  <div className="committee-header">
                    <div className="committee-icon"><i className={c.icon}></i></div>
                    <div className="committee-name">{c.name}</div>
                    <div className="committee-abbr">{c.abbr||c.category}</div>
                  </div>
                  <div className="committee-members">
                    {c.members.length === 0 ? (
                      <p style={{fontSize:'13px',color:'var(--text-light)',padding:'8px 0'}}>No members assigned yet.</p>
                    ) : c.members.map((m,i)=>{
                      const { avCls, roleCls } = getRoleStyle(m.role);
                      return (
                        <div className="cm-row" key={i}>
                          <div className={`cm-av ${avCls}`}>{getInitials(m.name)}</div>
                          <div>
                            <div className="cm-name">{m.name}</div>
                            <div className={`cm-role ${roleCls}`}>{m.role.toUpperCase()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}