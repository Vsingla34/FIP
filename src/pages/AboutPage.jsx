import { Link, useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>About Us</span></div>
          <h1>About FIP</h1>
          <p>The Federation of Indian Professionals (FIP) is a premier professional network dedicated to bringing together Chartered Accountants, Company Secretaries, Cost Accountants, Advocates, Tax Professionals, and other finance and legal professionals on a common platform for growth, learning, and collaboration.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <span className="eyebrow">Our Story</span>
              <h2 className="section-heading">A Platform Born <span>From The Profession</span></h2>
              <p>Guided by the philosophy of Connect • Collaborate • Conquer, FIP empowers professionals through knowledge-sharing, networking, leadership opportunities, industry-focused events, professional courses, and meaningful partnerships. Our mission is to create an ecosystem where professionals not only excel individually but also grow collectively by sharing knowledge, building trusted relationships, and creating lasting value for the profession and society.</p>
              <p>Federation of Indian Professionals (FIP) is a non-profit organisation established in 2020 under the visionary leadership of <strong>CA Gaurav Aggarwal</strong>, created by members of the professional fraternity, for the professional fraternity.</p>
              <p>With a thriving membership of over <strong>3,000 seasoned experts and emerging practitioners</strong> across Chartered Accountancy, Company Secretaryship, Cost Accounting, and Law, FIP creates a collaborative environment where professionals connect, learn, and grow.</p>
              <p>At FIP, we bridge individual excellence with collective success, fostering an environment where shared knowledge and trusted relationships drive lasting value for our profession and society.</p>
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
                  { icon:'fa-network-wired', cls:'ci-blue',   title:'Connect',    desc:'At FIP, every meaningful opportunity begins with a connection. We bring together professionals from diverse fields through conferences, seminars, networking meets, learning programs, and digital platforms, enabling members to build trusted relationships, exchange ideas, and expand their professional network.' },
                  { icon:'fa-people-group',  cls:'ci-orange', title:'Collaborate', desc:'True success comes from working together. FIP encourages professionals to collaborate through committees, knowledge forums, business referrals, joint initiatives, publications, research, mentorship, and community-driven projects. By leveraging collective expertise, members create innovative solutions and unlock new opportunities.' },
                  { icon:'fa-trophy',        cls:'ci-green',  title:'Conquer',     desc:"When professionals connect and collaborate, they are empowered to conquer new milestones. FIP helps members stay ahead through continuous learning, leadership opportunities, industry insights, skill development, and professional recognition." },
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