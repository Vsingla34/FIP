import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function MembershipPage() {
  const { startCheckout } = useApp();
  const navigate = useNavigate();

  const plans = [
    {
      tier:'Standard', name:'Standard', price:'₹500', period:'/year', desc:'For new members', featured:false,
      features:['Access to member directory','Event RSVP & reminders','1 Committee membership','Monthly newsletter','CPE webinar access','Digital membership certificate'],
      btn:'Get Started', btnCls:'mem-btn-out',
      onClick: () => { startCheckout('FIP Standard Membership', 500); navigate('/payment'); }
    },
    {
      tier:'Renewal', name:'Renewal', price:'₹200', period:'/year', desc:'For renewing members', featured:true,
      features:['All Standard benefits','Priority event registration','2 Committee memberships','Mentorship programme access','Resource library full access','Annual conference pass'],
      btn:'Renew Now', btnCls:'mem-btn-solid',
      onClick: () => { startCheckout('FIP Renewal Membership', 200); navigate('/payment'); }
    },
    {
      tier:'Firm', name:'Firm Partner', price:'Custom', period:'', desc:'For firms & organisations', featured:false,
      features:['Up to 10 member seats','Firm branding on FIP','Unlimited committee access','Dedicated account manager','Custom CPE programmes','Partnership opportunities'],
      btn:'Contact Sales', btnCls:'mem-btn-out',
      onClick: () => navigate('/contact')
    },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span></div>
          <h1>Join the FIP Family</h1>
          <p>One membership. Unlimited professional growth. 3,000+ professionals trust FIP.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Membership Plans</span>
            <h2 className="section-heading">Choose Your <span>Plan</span></h2>
            <p className="section-sub">Transparent pricing. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="mem-grid">
            {plans.map((p,i) => (
              <div key={i} className={`mem-card${p.featured?' featured':''}`}>
                {p.featured && <div className="mem-badge-wrap"><span className="mem-badge">Most Popular</span></div>}
                <div className="mem-tier">{p.tier}</div>
                <div className="mem-name">{p.name}</div>
                <div className="mem-price">{p.price}<span>{p.period}</span></div>
                <div className="mem-period">{p.desc}</div>
                <div className="mem-divider"></div>
                <div className="mem-features">
                  {p.features.map((f,j) => (
                    <div className="mem-feat" key={j}><i className="fa-solid fa-check"></i>{f}</div>
                  ))}
                </div>
                <button className={p.btnCls} onClick={p.onClick}>{p.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}