import { Link, useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>About Us</span></div>
          <h1>About FIP</h1>
          <p>Founded in 2020. Built by the professional fraternity, for the professional fraternity.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <span className="eyebrow">Our Story</span>
              <h2 className="section-heading">A Platform Born <span>From The Profession</span></h2>
              <p>Federation of Indian Professionals (FIP) is a non-profit organisation established in 2020 under the visionary leadership of <strong>CA Gaurav Aggarwal</strong>, created by members of the professional fraternity, for the professional fraternity.</p>
              <p>With a thriving membership of over <strong>3,000 seasoned experts and emerging practitioners</strong> across Chartered Accountancy, Company Secretaryship, Cost Accounting, and Law, FIP creates a collaborative environment where professionals connect, learn, and grow.</p>
              <p>At FIP, we go beyond webinars. From parliamentary visits and heritage walks to CSR initiatives at national monuments and five-star GST Conclaves — FIP shapes professionals who are socially conscious, continuously learning, and nationally engaged.</p>
              <div style={{marginTop:'28px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                <button className="btn btn-secondary" onClick={() => navigate('/membership')}><i className="fa-solid fa-user-plus"></i> Join FIP Today</button>
                <Link to="/team" className="btn btn-outline-blue">Meet the Team</Link>
              </div>
            </div>
            <div>
              <div className="about-card">
                <div className="about-card-lbl"><i className="fa-solid fa-bullseye"></i>&nbsp; Mission</div>
                <p>To create a collaborative platform empowering CAs, CSs, CMAs, Advocates and MBAs through knowledge sharing, professional growth, and continuous learning in the financial and legal sectors.</p>
              </div>
              <div className="about-card dark-card">
                <div className="about-card-lbl"><i className="fa-solid fa-eye"></i>&nbsp; Vision</div>
                <p>To be the leading network of finance professionals, driving excellence, innovation, and ethical practices while nurturing a national community committed to advancing the profession.</p>
              </div>
              <div className="about-card" style={{marginTop:'16px'}}>
                <div className="about-card-lbl"><i className="fa-solid fa-heart"></i>&nbsp; Core Philosophy — The 3 C's</div>
                {[
                  { icon:'fa-network-wired', cls:'ci-blue', title:'Connect', desc:'Build meaningful relationships with peers and industry leaders across finance disciplines.' },
                  { icon:'fa-people-group', cls:'ci-orange', title:'Collaborate', desc:'Work together, share knowledge, and develop solutions that drive the profession forward.' },
                  { icon:'fa-trophy', cls:'ci-green', title:'Conquer', desc:"Leverage FIP's resources, courses, and events to excel in your practice and career." },
                ].map((p,i) => (
                  <div className="phi-item" key={i}>
                    <div className={`phi-icon ${p.cls}`}><i className={`fa-solid ${p.icon}`}></i></div>
                    <div><div className="phi-title">{p.title}</div><div className="phi-desc">{p.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}