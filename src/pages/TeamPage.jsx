import { useState, useEffect } from 'react';
import * as React from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

function getInitials(name) {
  return (name || '').split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const AV_COLORS = ['av-blue', 'av-blue2', 'av-purple', 'av-green'];

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

export default function TeamPage() {
  const [profileSlugs, setProfileSlugs] = React.useState({});
  const [profilePhotos, setProfilePhotos] = React.useState({});
  React.useEffect(() => {
    supabase.rpc('get_committee_members').then(({ data }) => {
      const slugs = {}, photos = {};
      (data||[]).forEach(m => {
        if (!m.full_name) return;
        const key = m.full_name.toLowerCase();
        if (m.profile_slug) slugs[key] = m.profile_slug;
        if (m.avatar_url)   photos[key] = m.avatar_url;
      });
      setProfileSlugs(slugs);
      setProfilePhotos(photos);
    });
  }, []);
  const getSlug  = (name) => profileSlugs[name.toLowerCase()]  || null;
  const getPhoto = (name) => profilePhotos[name.toLowerCase()] || null;
  const { showToast } = useApp();
  const [committees, setCommittees] = useState([]);

  useEffect(() => {
    supabase.from('committees').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => setCommittees((data || []).map(c => ({ ...c, desc: c.description }))));
  }, []);

  /* ── Founders: Executive Committee members ── */
  const execCommittee = committees.find(c => c.name === 'Executive Committee');
  const founders = (execCommittee?.members || []).map((m, i) => ({
    name: m.name,
    role: m.role,
    photoUrl: m.photo_url || null,
    linkedinUrl: m.linkedin_url || null,
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
          <p>At the Federation of Indian Professionals (FIP), our Committees are the foundation of our growth, innovation, and community engagement. Each committee focuses on a key area of professional development and is led by dedicated Chairman and Co-Chairman who work collaboratively to create impactful programs, foster meaningful connections, and deliver value to our members. Together, these committees transform ideas into action, strengthen our professional network, and help shape the future of the FIP community.</p>
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
                <div className={`team-av ${t.cls}`} style={{overflow:'hidden', padding:0}}>
                  {(t.photoUrl || getPhoto(t.name))
                    ? <img src={t.photoUrl || getPhoto(t.name)} alt={t.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',borderRadius:'50%'}}/>
                    : t.initials}
                </div>
                {getSlug(t.name) ? (
                  <Link to={`/member/${getSlug(t.name)}`} className="team-name" style={{textDecoration:'none',color:'inherit',display:'block'}}>
                    {t.name} <i className="fa-solid fa-arrow-up-right-from-square" style={{fontSize:'8px',opacity:0.3,color:'var(--orange)',marginLeft:'4px'}}></i>
                  </Link>
                ) : (
                  <div className="team-name">{t.name}</div>
                )}
                {(() => {
                  const r = (t.role||'').toLowerCase();
                  const isTop = r.includes('chairman') || r.includes('chairperson') || r.includes('president') || r === 'vice chairman' || r === 'vice chairperson' || r.startsWith('co-chair');
                  return (
                    <div className={'team-role' + (isTop ? ' cm-role-chairman' : '')}
                      style={isTop ? {fontSize:'11px',marginTop:'3px'} : {}}>
                      {t.role}
                    </div>
                  );
                })()}
                <div className="team-qual">{t.role} of Federation of Indian Professionals</div>
                <div className="team-socials">
                  <div className="team-sb" onClick={() => {
                    if (!t.linkedinUrl) { showToast('LinkedIn not linked for this member yet.'); return; }
                    const url = /^https?:\/\//i.test(t.linkedinUrl) ? t.linkedinUrl : `https://${t.linkedinUrl}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}><i className="fa-brands fa-linkedin-in"></i></div>
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
            <p className="section-sub">On clicking the committee, You will be able to see all the members of the committee along with their photos and LinkedIn IDs.</p>
          </div>

          {committeeLeaders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
              No committee leaders assigned yet.
            </div>
          ) : (
            <div className="leaders-list">
              {committeeLeaders.map((group, gi) => (
                <div className="leaders-group" key={gi}>
                  {/* Clicking the header navigates to /committees — which shows all members */}
                  <Link
                    to={`/committees?committee=${encodeURIComponent(group.committee.name)}`}
                    style={{textDecoration:'none',color:'inherit',display:'block'}}
                    title={`View all members of ${group.committee.name}`}
                  >
                    <div className="leaders-group-header" style={{cursor:'pointer',transition:'background .15s'}}
                      onMouseOver={e => e.currentTarget.style.background='var(--blue-pale)'}
                      onMouseOut={e  => e.currentTarget.style.background=''}>
                      <div className="leaders-group-icon"><i className={group.committee.icon}></i></div>
                      <div style={{flex:1}}>
                        <div className="leaders-group-name">{group.committee.name}</div>
                        <div className="leaders-group-abbr">{group.committee.abbr || group.committee.category}</div>
                      </div>
                      <div style={{marginLeft:'auto',fontSize:'12px',color:'var(--orange)',fontWeight:700,display:'flex',alignItems:'center',gap:'4px'}}>
                        View All Members <i className="fa-solid fa-arrow-right" style={{fontSize:'10px'}}></i>
                      </div>
                    </div>
                  </Link>
                  <div className="leaders-cards">
                    {group.leaders.map((m, i) => (
                      <div className="leader-card" key={i}>
                        <div className="leader-av" style={{overflow:'hidden', padding:0}}>
                          {getPhoto(m.name)
                            ? <img src={getPhoto(m.name)} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',borderRadius:'50%'}}/>
                            : getInitials(m.name)}
                        </div>
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