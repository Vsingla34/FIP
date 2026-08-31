import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

const ROLE_STYLES = {
  president:          { avCls:'cm-av-chairman', roleCls:'cm-role-chairman' },
  chairman:           { avCls:'cm-av-chairman', roleCls:'cm-role-chairman' },
  chairperson:        { avCls:'cm-av-chairman', roleCls:'cm-role-chairman' },
  'vice president':   { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  'co-chairman':      { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  'co-chairperson':   { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  'vice chairman':    { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  'vice chairperson': { avCls:'cm-av-co',       roleCls:'cm-role-co'       },
  secretary:          { avCls:'cm-av-member',   roleCls:'cm-role-member'   },
  treasurer:          { avCls:'cm-av-member',   roleCls:'cm-role-member'   },
  member:             { avCls:'cm-av-member',   roleCls:'cm-role-member'   },
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusCommittee = searchParams.get('committee'); // from Team page link
  const committeeRefs  = useRef({});

  const [filter,    setFilter]    = useState('All');
  const [committees, setCommittees] = useState([]);
  const [committeesLoading, setCommitteesLoading] = useState(true);
  const [dbSlugs,   setDbSlugs]   = useState({});
  const [avatarMap, setAvatarMap] = useState({});

  // Auto-scroll to the focused committee when arriving from Team page
  useEffect(() => {
    if (!focusCommittee) return;
    const tryScroll = () => {
      const el = committeeRefs.current[focusCommittee];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.style.outline = '2px solid var(--orange)';
        el.style.borderRadius = '12px';
        setTimeout(() => { el.style.outline = ''; }, 2000);
      }
    };
    // Give the page time to render
    setTimeout(tryScroll, 300);
  }, [focusCommittee]);

  // The real roster, straight from the database — replaces the old
  // hardcoded-array + "extra live members merged in by name-matching"
  // approach, which is what produced a confusing duplicate entry whenever a
  // linked account's real name didn't exactly match the hardcoded string.
  useEffect(() => {
    setCommitteesLoading(true);
    supabase.from('committees').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => {
        setCommittees((data || []).map(c => ({ ...c, desc: c.description })));
        setCommitteesLoading(false);
      });
  }, []);

  // Still needed for photos and profile-page links — this RPC now only
  // supplies avatar_url/profile_slug per name, it no longer decides who's
  // "extra".
  useEffect(() => {
    supabase.rpc('get_committee_members').then(({ data }) => {
      const slugMap = {};
      const avatars = {};
      (data || []).forEach(m => {
        if (m.profile_slug) slugMap[m.profile_slug] = m;
        if (m.full_name && m.avatar_url) avatars[m.full_name.toLowerCase().trim()] = m.avatar_url;
      });
      setDbSlugs(slugMap);
      setAvatarMap(avatars);
    });
  }, []);

  const categories = ['All', ...new Set(committees.map(c => c.category))];
  const filtered   = filter === 'All' ? committees : committees.filter(c => c.category === filter);

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
            {committeesLoading ? (
              <div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px',color:'var(--text-light)'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'10px'}}></i>
                Loading committees…
              </div>
            ) : filtered.map(c => (
              <div
                className="committee-card"
                key={c.id}
                ref={el => { committeeRefs.current[c.name] = el; }}
                style={{ scrollMarginTop: '90px' }}
              >
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
                      <div
                        key={i}
                        className="cm-row"
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',cursor:'pointer',transition:'background 0.15s'}}
                        onClick={() => navigate(`/member/${slug}`)}
                        onMouseEnter={e => e.currentTarget.style.background='var(--blue-pale)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <div className={`cm-av ${avCls}`} style={(m.photo_url || avatarMap[m.name.toLowerCase().trim()]) ? {overflow:'hidden', padding:0} : undefined}>
                          {(m.photo_url || avatarMap[m.name.toLowerCase().trim()])
                            ? <img src={m.photo_url || avatarMap[m.name.toLowerCase().trim()]} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                            : getInitials(m.name)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="cm-name">{m.name}</div>
                          <div className={`cm-role ${roleCls}`}>{m.role.toUpperCase()}</div>
                        </div>
                        {/* LinkedIn icon */}
                        <a
                          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(m.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            width:'28px',height:'28px',borderRadius:'6px',
                            background:'#0077B5',color:'#fff',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            flexShrink:0,textDecoration:'none',fontSize:'13px',
                            opacity:0.85,transition:'opacity 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity='1'}
                          onMouseLeave={e => e.currentTarget.style.opacity='0.85'}
                          title={`${m.name} on LinkedIn`}
                        >
                          <i className="fa-brands fa-linkedin-in"></i>
                        </a>
                      </div>
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