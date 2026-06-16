import { useApp } from '../context/AppContext.jsx';

export default function TeamPage() {
  const { showToast } = useApp();
  const team = [
    { initials:'GA', cls:'av-blue', name:'CA Gaurav Aggarwal', role:'Founder & President', qual:'Chartered Accountant · Delhi' },
    { initials:'SS', cls:'av-blue2', name:'CA Sadhna Sharma', role:'Core Team Member', qual:'CA · MBA (IIMA)' },
    { initials:'GG', cls:'av-blue2', name:'Adv. Gaurav Gupta', role:'Legal Advisor', qual:'Advocate · High Court of Delhi' },
    { initials:'RP', cls:'av-purple', name:'CA Rajesh Patel', role:'Programme Head', qual:'Chartered Accountant' },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Team</span></div>
          <h1>Our Team</h1>
          <p>Professionals leading a community of professionals.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Leadership</span>
            <h2 className="section-heading">Founders &amp; <span>Core Team</span></h2>
            <p className="section-sub">The professionals who built FIP from the ground up and continue to drive its mission every day.</p>
          </div>
          <div className="team-grid">
            {team.map((t,i) => (
              <div className="team-card" key={i}>
                <div className={`team-av ${t.cls}`}>{t.initials}</div>
                <div className="team-name">{t.name}</div>
                <div className="team-role">{t.role}</div>
                <div className="team-qual">{t.qual}</div>
                <div className="team-socials">
                  <div className="team-sb" onClick={() => showToast('Opening LinkedIn…')}><i className="fa-brands fa-linkedin-in"></i></div>
                  <div className="team-sb" onClick={() => showToast('Opening WhatsApp…')}><i className="fa-brands fa-whatsapp"></i></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}