import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { committees as defaultCommittees } from '../data/index.js';

const STORAGE_KEY = 'fip_committees';

function loadCommittees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultCommittees;
  } catch { return defaultCommittees; }
}

function getInitials(name) {
  return (name || '').split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const AV_COLORS = ['av-blue', 'av-blue2', 'av-purple', 'av-green'];

export default function TeamPage() {
  const { showToast } = useApp();
  const [committees, setCommittees] = useState(loadCommittees);

  useEffect(() => {
    const sync = () => setCommittees(loadCommittees());
    window.addEventListener('committees-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('committees-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  /* ── Founders: Executive Committee members ── */
  const execCommittee = committees.find(c => c.name === 'Executive Committee');
  const founders = (execCommittee?.members || []).map((m, i) => ({
    name: m.name,
    role: m.role,
    initials: getInitials(m.name),
    cls: AV_COLORS[i % AV_COLORS.length],
  }));

  /* ── Committee leaders: Chairman/Chairperson + Co-Chairman/Vice from every OTHER committee ── */
  const committeeLeaders = committees
    .filter(c => c.name !== 'Executive Committee')
    .map(c => {
      const leaders = (c.members || []).filter(m => {
        const r = m.role.toLowerCase();
        return r.includes('chairman') || r.includes('chairperson') || r.includes('vice') || r.includes('co-chair');
      });
      return { committee: c, leaders };
    })
    .filter(g => g.leaders.length > 0);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Team</span></div>
          <h1>Our Team</h1>
          <p>Professionals leading a community of professionals.</p>
        </div>
      </div>

      {/* ── Founders / Executive Committee ── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Leadership</span>
            <h2 className="section-heading">Founders &amp; <span>Executive Committee</span></h2>
            <p className="section-sub">The professionals who built FIP from the ground up and continue to drive its mission every day.</p>
          </div>
          <div className="team-grid">
            {founders.map((t, i) => (
              <div className="team-card" key={i}>
                <div className={`team-av ${t.cls}`}>{t.initials}</div>
                <div className="team-name">{t.name}</div>
                <div className="team-role">{t.role}</div>
                <div className="team-qual">FIP Executive Committee</div>
                <div className="team-socials">
                  <div className="team-sb" onClick={() => showToast('Opening LinkedIn…')}><i className="fa-brands fa-linkedin-in"></i></div>
                  <div className="team-sb" onClick={() => showToast('Opening WhatsApp…')}><i className="fa-brands fa-whatsapp"></i></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Committee Chairpersons ── */}
      <section className="section">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Committee Leadership</span>
            <h2 className="section-heading">Chairpersons &amp; <span>Co-Chairs</span></h2>
            <p className="section-sub">Leading FIP's specialist committees across policy, practice excellence, and member development.</p>
          </div>

          {committeeLeaders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
              No committee leaders assigned yet.
            </div>
          ) : (
            <div className="leaders-list">
              {committeeLeaders.map((group, gi) => (
                <div className="leaders-group" key={gi}>
                  <div className="leaders-group-header">
                    <div className="leaders-group-icon"><i className={group.committee.icon}></i></div>
                    <div>
                      <div className="leaders-group-name">{group.committee.name}</div>
                      <div className="leaders-group-abbr">{group.committee.abbr || group.committee.category}</div>
                    </div>
                  </div>
                  <div className="leaders-cards">
                    {group.leaders.map((m, i) => (
                      <div className="leader-card" key={i}>
                        <div className="leader-av">{getInitials(m.name)}</div>
                        <div>
                          <div className="leader-name">{m.name}</div>
                          <div className="leader-role">{m.role}</div>
                        </div>
                      </div>
                    ))}
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