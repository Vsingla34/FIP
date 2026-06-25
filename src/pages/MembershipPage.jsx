import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function MembershipPage() {
  const { openModal, showToast } = useApp();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const isActiveMember = profile?.membership_status === 'Active';
  const role = isActiveMember ? 'member' : (user ? 'student' : 'visitor');

  const handlePlan = (planKey) => {
    if (!user) { openModal('register', { defaultType: 'member' }); return; }
    if (planKey === 'firm') { navigate('/contact'); return; }
    showToast('Redirecting to payment… (coming soon)');
  };

  const allPlans = [
    {
      tier:'Standard', name:'Standard', price:'₹500', period:'/year',
      desc:'For new members', featured:false, key:'standard',
      btnLabel:'Get Started', btnCls:'mem-btn-out',
      showFor:['visitor','student'],
      features:['Access to member directory','Event RSVP & reminders','1 Committee membership','Monthly newsletter','CPE webinar access','Digital membership certificate'],
    },
    {
      tier:'Renewal', name:'Renewal', price:'₹200', period:'/year',
      desc:'For renewing members', featured:true, key:'renewal',
      btnLabel:'Renew Now', btnCls:'mem-btn-solid',
      showFor:['member'],
      features:['All Standard benefits','Priority event registration','2 Committee memberships','Mentorship programme access','Resource library full access','Annual conference pass'],
    },
    {
      tier:'Firm', name:'Firm Partner', price:'Custom', period:'',
      desc:'For firms & organisations', featured:false, key:'firm',
      btnLabel:'Contact Sales', btnCls:'mem-btn-out',
      showFor:['visitor','student','member'],
      features:['Up to 10 member seats','Firm branding on FIP','Unlimited committee access','Dedicated account manager','Custom CPE programmes','Partnership opportunities'],
    },
  ];

  const visiblePlans = allPlans.filter(p => p.showFor.includes(role));

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span></div>
          <h1>{isActiveMember ? 'Your FIP Membership' : 'Join the FIP Family'}</h1>
          <p>{isActiveMember
            ? `Welcome back, ${profile?.full_name?.split(' ')[0] || 'Member'}! Manage your membership below.`
            : 'One membership. Unlimited professional growth. 3,000+ professionals trust FIP.'
          }</p>
        </div>
      </div>

      {isActiveMember && (
        <div style={{background:'var(--green)',padding:'14px 0'}}>
          <div className="container" style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <i className="fa-solid fa-circle-check" style={{color:'#fff',fontSize:'20px'}}></i>
            <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Active Member</span>
            {profile?.membership_end && (
              <span style={{color:'rgba(255,255,255,0.8)',fontSize:'13px'}}>
                · Valid until {new Date(profile.membership_end).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
              </span>
            )}
            <button className="btn btn-sm" style={{marginLeft:'auto',background:'#fff',color:'var(--green)',border:'none',fontWeight:700}}
              onClick={() => navigate('/dashboard')}>Go to Dashboard →</button>
          </div>
        </div>
      )}

      {!isActiveMember && user && (
        <div style={{background:'var(--blue-pale)',borderBottom:'1px solid var(--border)',padding:'12px 0'}}>
          <div className="container" style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <i className="fa-solid fa-graduation-cap" style={{color:'var(--blue)'}}></i>
            <span style={{color:'var(--blue)',fontWeight:600,fontSize:'13px'}}>
              You're on a Student account — upgrade to full membership to unlock all FIP benefits.
            </span>
          </div>
        </div>
      )}

      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <span className="eyebrow">Membership Plans</span>
            <h2 className="section-heading">Choose Your <span>Plan</span></h2>
            <p className="section-sub">Transparent pricing. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="mem-grid" style={visiblePlans.length === 2 ? {gridTemplateColumns:'repeat(2,1fr)',maxWidth:'680px',margin:'0 auto'} : {}}>
            {visiblePlans.map((plan, i) => (
              <div key={i} className={`mem-card${plan.featured ? ' featured' : ''}`}>
                {plan.featured && (
                  <div className="mem-badge-wrap">
                    <span className="mem-badge">Most Popular</span>
                  </div>
                )}
                <div className="mem-tier">{plan.tier}</div>
                <div className="mem-name">{plan.name}</div>
                <div className="mem-price">
                  {plan.price}
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <div className="mem-period">{plan.desc}</div>
                <div className="mem-divider"></div>
                <ul className="mem-features">
                  {plan.features.map((f, j) => (
                    <li key={j} className="mem-feat">
                      <i className="fa-solid fa-check"></i> {f}
                    </li>
                  ))}
                </ul>
                <button className={plan.btnCls} onClick={() => handlePlan(plan.key)}>
                  {plan.key !== 'firm' && !user
                    ? <><i className="fa-solid fa-lock-open"></i> Sign Up to Continue</>
                    : plan.btnLabel
                  }
                </button>
                {!user && plan.key !== 'firm' && (
                  <p style={{textAlign:'center',fontSize:'12px',color:plan.featured?'rgba(255,255,255,0.4)':'var(--text-light)',marginTop:'10px'}}>
                    Already a member?{' '}
                    <span style={{color:plan.featured?'#FFD09B':'var(--orange)',cursor:'pointer',fontWeight:600}}
                      onClick={e => { e.stopPropagation(); openModal('login'); }}>Sign In</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}