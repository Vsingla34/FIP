import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function PaymentPage() {
  const { checkoutPlan, showToast } = useApp();
  const navigate = useNavigate();
  const [payMethod, setPayMethod] = useState('upi');
  const gst = Math.round(checkoutPlan.amount * 0.18);
  const total = checkoutPlan.amount + gst;

  const handlePay = e => {
    e.preventDefault();
    showToast('Payment successful! Welcome to FIP.');
    setTimeout(() => navigate('/payment-success'), 600);
  };

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Membership</span> <i className="fa-solid fa-chevron-right"></i> <span>Checkout</span></div>
          <h1>Secure Checkout</h1>
          <p>Complete your payment to activate your FIP membership.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container" style={{maxWidth:'720px'}}>
          <div className="checkout-steps">
            <div className="cs-step done"><div className="cs-num"><i className="fa-solid fa-check" style={{fontSize:'10px'}}></i></div><span>Plan Selected</span></div>
            <div className="cs-line done"></div>
            <div className="cs-step active"><div className="cs-num">2</div><span>Payment</span></div>
            <div className="cs-line"></div>
            <div className="cs-step"><div className="cs-num">3</div><span>Confirmation</span></div>
          </div>
          <div className="order-summary">
            <div style={{fontSize:'12px',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px'}}>Order Summary</div>
            <div className="os-row"><span>Plan</span><span>{checkoutPlan.name}</span></div>
            <div className="os-row"><span>Validity</span><span>Apr 2025 – Mar 2026</span></div>
            <div className="os-row"><span>GST (18%)</span><span>₹{gst}</span></div>
            <div className="os-row os-total"><span>Total</span><span>₹{total}</span></div>
          </div>
          <form onSubmit={handlePay}>
            <div className="admin-form-card">
              <div className="admin-form-title"><i className="fa-solid fa-user" style={{color:'var(--orange)'}}></i>&nbsp; Member Details</div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" type="text" placeholder="As per ICAI / ICSI records" required /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" placeholder="you@example.com" required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Mobile *</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" required /></div>
                <div className="form-group"><label className="form-label">Profession</label>
                  <select className="form-select">
                    <option>Chartered Accountant</option><option>Company Secretary</option>
                    <option>Cost Accountant</option><option>Advocate</option><option>Other</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="payment-card">
              <div className="payment-card-title"><i className="fa-solid fa-lock" style={{color:'var(--green)'}}></i>&nbsp; Choose Payment Method</div>
              {[
                { id:'upi', icon:'📱', label:'UPI', desc:'GPay, PhonePe, Paytm, BHIM & all UPI apps' },
                { id:'card', icon:'💳', label:'Credit / Debit Card', desc:'Visa, Mastercard, RuPay' },
                { id:'netbanking', icon:'🏦', label:'Net Banking', desc:'All major Indian banks supported' },
              ].map(pm => (
                <div key={pm.id}>
                  <div className={`pay-option${payMethod===pm.id?' selected':''}`} onClick={() => setPayMethod(pm.id)}>
                    <div className="pay-radio"></div>
                    <div className="pay-icon">{pm.icon}</div>
                    <div><div className="pay-label">{pm.label}</div><div className="pay-desc">{pm.desc}</div></div>
                  </div>
                  {payMethod==='upi' && pm.id==='upi' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <div className="upi-input-wrap"><i className="fa-solid fa-at" style={{color:'var(--text-light)',fontSize:'13px'}}></i><input type="text" placeholder="yourname@upi" style={{fontSize:'14px'}}/></div>
                    </div>
                  )}
                  {payMethod==='card' && pm.id==='card' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <div className="form-group"><label className="form-label">Card Number</label><input className="form-input" type="text" placeholder="1234 5678 9012 3456" maxLength={19}/></div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Expiry</label><input className="form-input" type="text" placeholder="MM / YY" maxLength={7}/></div>
                        <div className="form-group"><label className="form-label">CVV</label><input className="form-input" type="password" placeholder="•••" maxLength={3}/></div>
                      </div>
                    </div>
                  )}
                  {payMethod==='netbanking' && pm.id==='netbanking' && (
                    <div style={{padding:'12px 0 4px'}}>
                      <select className="form-select"><option value="">Select your bank</option><option>SBI</option><option>HDFC</option><option>ICICI</option><option>Axis</option><option>Kotak</option></select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center'}}>
              <i className="fa-solid fa-lock"></i> Pay ₹{total} Securely
            </button>
          </form>
        </div>
      </section>
    </>
  );
}