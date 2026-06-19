import { useState, useEffect } from 'react';
import { committees as defaultCommittees } from '../data/index.js';

const STORAGE_KEY = 'fip_committees';

function loadCommittees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultCommittees;
  } catch { return defaultCommittees; }
}

/* ── role tier helper — determines which level of the tree a member sits on ── */
function getTier(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('president') || r.includes('chairman') || r.includes('chairperson')) return 1;
  if (r.includes('vice') || r.includes('co-chair') || r.includes('secretary') || r.includes('treasurer')) return 2;
  return 3;
}

function getRoleStyle(role) {
  const tier = getTier(role);
  if (tier === 1) return { avCls: 'tree-av-chair', roleCls: 'tree-role-chair' };
  if (tier === 2) return { avCls: 'tree-av-vice',  roleCls: 'tree-role-vice'  };
  return { avCls: 'tree-av-member', roleCls: 'tree-role-member' };
}

function getInitials(name) {
  return (name || '').split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/* ── A single node card in the tree ── */
function TreeNode({ member, tier }) {
  const { avCls, roleCls } = getRoleStyle(member.role);
  return (
    <div className={`tree-node tier-${tier}`}>
      <div className={`tree-av ${avCls}`}>{getInitials(member.name)}</div>
      <div className="tree-name">{member.name}</div>
      <div className={`tree-role ${roleCls}`}>{member.role}</div>
    </div>
  );
}

/* ── Renders the full org-chart tree for one committee ── */
function CommitteeTree({ committee }) {
  const members = committee.members || [];

  const tier1 = members.filter(m => getTier(m.role) === 1); // President / Chairman
  const tier2 = members.filter(m => getTier(m.role) === 2); // Vice / Co- / Secretary / Treasurer
  const tier3 = members.filter(m => getTier(m.role) === 3); // Members

  if (members.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-light)', fontSize: '13px' }}>
        No members assigned yet.
      </div>
    );
  }

  return (
    <div className="tree-wrap">

      {/* ── Tier 1: Chair/President ── */}
      {tier1.length > 0 && (
        <div className="tree-tier tree-tier-1">
          {tier1.map((m, i) => <TreeNode key={i} member={m} tier={1} />)}
        </div>
      )}

      {/* connector from tier 1 down to tier 2 */}
      {tier1.length > 0 && tier2.length > 0 && <div className="tree-connector tree-connector-1-2" />}

      {/* ── Tier 2: Vice / Co-Chair / Secretary / Treasurer ── */}
      {tier2.length > 0 && (
        <div className="tree-tier tree-tier-2">
          {tier2.map((m, i) => <TreeNode key={i} member={m} tier={2} />)}
        </div>
      )}

      {/* connector from tier 2 (or tier 1 if no tier 2) down to tier 3 */}
      {tier3.length > 0 && (tier1.length > 0 || tier2.length > 0) && (
        <div className="tree-connector tree-connector-2-3" />
      )}

      {/* ── Tier 3: Members — wraps in a row ── */}
      {tier3.length > 0 && (
        <div className="tree-tier tree-tier-3">
          {tier3.map((m, i) => <TreeNode key={i} member={m} tier={3} />)}
        </div>
      )}
    </div>
  );
}

export default function CommitteesPage() {
  const [committees, setCommittees] = useState(loadCommittees);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('All');
  const [expanded, setExpanded]     = useState(null); // committee id currently shown full-screen-ish, or null = all collapsed grid

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
  const filtered = committees.filter(c =>
    (filter === 'All' || c.category === filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     (c.desc || '').toLowerCase().includes(search.toLowerCase()))
  );

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
            <div className="search-wrap" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" placeholder="Search committees…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-pills" style={{ marginBottom: 0 }}>
              {categories.map(c => (
                <div key={c} className={`fpill${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</div>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-people-group" style={{ fontSize: '36px', display: 'block', marginBottom: '12px', opacity: .3 }}></i>
              No committees match your search.
            </div>
          ) : (
            <div className="tree-committee-list">
              {filtered.map(c => (
                <div className="tree-committee-card" key={c.id}>

                  {/* ── Committee header ── */}
                  <div className="tree-committee-header">
                    <div className="tree-committee-icon"><i className={c.icon}></i></div>
                    <div style={{ flex: 1 }}>
                      <div className="tree-committee-name">{c.name}</div>
                      <div className="tree-committee-abbr">{c.abbr || c.category}</div>
                    </div>
                    {c.members?.length > 0 && (
                      <div className="tree-committee-count">
                        <i className="fa-solid fa-users"></i> {c.members.length}
                      </div>
                    )}
                  </div>

                  {c.desc && <p className="tree-committee-desc">{c.desc}</p>}

                  {/* ── Tree visualization ── */}
                  <CommitteeTree committee={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}