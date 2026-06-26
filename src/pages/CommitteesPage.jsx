import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';
import { committees as localCommittees } from '../data/index.js';

const ROLE_STYLES = {
  chairman:         { avCls:'cm-av-chairman', roleCls:'cm-role-chairman' },
  'co-chairman':    { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  chairperson:      { avCls:'cm-av-chairman', roleCls:'cm-role-chairman' },
  'co-chairperson': { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  secretary:        { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  member:           { avCls:'cm-av-member',   roleCls:'cm-role-member'   },
};

function getRoleStyle(role = '') {
  return ROLE_STYLES[role.toLowerCase()] || ROLE_STYLES.member;
}

function getInitials(name = '') {
  return name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Generate slug from name — same formula used in SQL
function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function CommitteesPage() {
  const { showToast } = useApp();
  const [filter,    setFilter]    = useState('All');
  const [dbSlugs,   setDbSlugs]   = useState({}); // profile_slug -> true (for members registered in system)
  const [liveExtra, setLiveExtra] = useState([]); // newly assigned members from DB

  useEffect(() => {
    supabase.rpc('get_committee_members').then(({ data }) => {
      const slugMap = {};
      (data || []).forEach(m => {
        if (m.profile_slug) slugMap[m.profile_slug] = m;
      });
      setDbSlugs(slugMap);

      // Extra members not in hardcoded list
      const hardcodedNames = new Set(
        localCommittees.flatMap(c => c.members.map(m => m.name.toLowerCase().trim()))
      );
      setLiveExtra((data || []).filter(m =>
        !hardcodedNames.has((m.full_name || '').toLowerCase().trim())
      ));
    });
  }, []);

  const categories = ['All', ...new Set(localCommittees.map(c => c.category))];
  const filtered   = filter === 'All' ? localCommittees : localCommittees.filter(c => c.category === filter);

  // Merge extra live members into their committee
  const mergedFiltered = filtered.map(committee => {
    const extra = liveExtra
      .filter(m => m.committee_name === committee.name)
      .map(m => ({ name: m.full_name, role: m.committee_role || 'Member', isLive: true }));
    return { ...committee, members: [...committee.members, ...extra] };
  });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Committees</span></div>
          <h1>Our Committees</h1>
          <p>FIP's specialised committees drive knowledge, networking and professional growth.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">
          <div className="filter-pills">
            {categories.map(c => (
              <div key={c} className={`fpill${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</div>
            ))}
          </div>

          <div className="committee-grid">
            {mergedFiltered.map(c => (
              <div className="committee-card" key={c.id}>
                <div className="committee-header">
                  <div className="committee-icon"><i className={c.icon}></i></div>
                  <div className="committee-name">{c.name}</div>
                  <div className="committee-abbr">{c.abbr || c.category}</div>
                </div>
                <div className="committee-members">
                  {c.members.length === 0 ? (
                    <p style={{fontSize:'13px',color:'var(--text-light)',padding:'8px 0'}}>No members assigned yet.</p>
                  ) : c.members.map((m, i) => {
                    const { avCls, roleCls } = getRoleStyle(m.role);
                    const slug = nameToSlug(m.name);

                    return (
                      <Link
                        key={i}
                        to={`/member/${slug}`}
                        className="cm-row"
                        style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',transition:'background 0.15s',
                          ...(m.isLive ? {background:'rgba(255,215,0,0.05)'} : {})
                        }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--blue-pale)'}
                        onMouseLeave={e => e.currentTarget.style.background = m.isLive ? 'rgba(255,215,0,0.05)' : 'transparent'}
                      >
                        <div className={`cm-av ${avCls}`}>{getInitials(m.name)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="cm-name" style={{display:'flex',alignItems:'center',gap:'5px'}}>
                            {m.name}
                            <i className="fa-solid fa-arrow-up-right-from-square" style={{fontSize:'8px',color:'var(--orange)',opacity:0.5,flexShrink:0}}></i>
                          </div>
                          <div className={`cm-role ${roleCls}`}>{m.role.toUpperCase()}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}