import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRazorpay } from '../hooks/useRazorpay.js';

export default function MembershipPage() {
  const { openModal, showToast } = useApp();
  const { user, profile } = useAuth();
  const { pay } = useRazorpay();
  const navigate = useNavigate();
  const [prices, setPrices] = useState({ standard_price: 500, renewal_price: 200 });

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key','membership').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          const std = Number(v.standard_price);
          const ren = Number(v.renewal_price);
          setPrices({
            standard_price: std > 0 ? std : 500,
            renewal_price:  ren > 0 ? ren : 200,
          });
        }
      });
  }, []);

  const isActiveMember = profile?.membership_status === 'Active';
  const role = isActiveMember ? 'member' : (user ? 'student' : 'visitor');

  const handlePlan = async (planKey) => {
    if (!user) { openModal('register', { defaultType: 'member' }); return; }
    if (planKey === 'firm') { navigate('/contact'); return; }

    // Trigger real Razorpay payment
    const planName = planKey === 'renewal' ? 'Renewal' : 'Standard';
    const planPrice = planKey === 'renewal' ? prices.renewal_price : prices.standard_price;
    await pay({
      purchaseType: 'membership',
      planName,
      planPrice,
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const allPlans = [
    {
      tier:'Standard', name:'Standard',
      price: `₹${prices.standard_price}`, period:'/year',
      desc:'For new members', featured:false, key:'standard',
      btnLabel:`Get Started — ₹${prices.standard_price}`, btnCls:'mem-btn-out',
      showFor:['visitor','student'],
      features:['Priority Registration for events with limited seating','Exclusive Members-Only Events with industry leaders','Special Member Pricing on conferences, workshops & seminars','Exclusive Discounts on publications, learning programs & partner offerings','Leadership Opportunities through FIP committees & initiatives','Access to a Trusted Professional Network for collaboration & referrals','Continuous Learning through expert sessions, webinars & industry updates'],
    },
    {
      tier:'Renewal', name:'Renewal',
      price: `₹${prices.renewal_price}`, period:'/year',
      desc:'For renewing members', featured:true, key:'renewal',
      btnLabel:`Renew Now — ₹${prices.renewal_price}`, btnCls:'mem-btn-solid',
      showFor:['member'],
      features:['All Standard membership benefits','Continue uninterrupted access to exclusive member benefits','Priority event registration & discounted participation','Members-only programs & professional networking','Leadership opportunities & committee participation','Stay connected with a community that supports your continued growth'],
    },
    {
      tier:'Firm', name:'Firm Partner', price:'Custom', period:'',
      desc:'For firms & organisations', featured:false, key:'firm',
      btnLabel:'Contact Sales', btnCls:'mem-btn-out',
      showFor:['visitor','student','member'],
      features:['Multiple partners under a single membership (5+ partners)','Priority event access for all firm members','Exclusive networking opportunities for your team','Leadership participation across FIP committees','Member pricing for all firm partners','Enhanced visibility within FIP\'s professional community'],
    },
  ];

  const visiblePlans = allPlans.filter(p => p.showFor.includes(role));

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span></div>
          <h1>{isActiveMember ? 'Your FIP Membership' : 'Become a Part of FIP'}</h1>
          <p>{isActiveMember
            ? `Welcome back, ${profile?.full_name?.split(' ')[0] || 'Member'}! Manage your membership below.`
            : 'Become a part of the Federation of Indian Professionals (FIP) and join a vibrant community of accomplished professionals committed to learning, leadership, collaboration, and excellence. FIP membership provides access to exclusive networking opportunities, professional development programs, industry insights, leadership platforms, and a trusted network of peers.'
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
            <p className="section-sub">Whether you are an individual professional or part of a growing firm, FIP offers the right membership to support your journey.</p>
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