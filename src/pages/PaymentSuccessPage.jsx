import { useNavigate } from 'react-router-dom';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const txnId = 'FIP-2026-' + String(Math.floor(Math.random()*90000)+10000);
  return (
    <section className="section section-alt">
      <div className="container" style={{maxWidth:'560px',textAlign:'center',paddingTop:'80px',paddingBottom:'80px'}}>
        <div style={{width:'80px',height:'80px',background:'var(--green-pale)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',border:'3px solid var(--green)'}}>
          <i className="fa-solid fa-check" style={{fontSize:'32px',color:'var(--green)'}}></i>
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'32px',fontWeight:800,color:'var(--blue)',marginBottom:'10px'}}>Payment Successful!</h1>
        <p style={{fontSize:'16px',color:'var(--text-muted)',marginBottom:'8px'}}>Welcome to the FIP family!</p>
        <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'24px',margin:'28px 0',textAlign:'left'}}>
          {[
            {label:'Transaction ID', val:txnId},
            {label:'Plan', val:'FIP Standard Membership'},
            {label:'Amount Paid', val:'₹500', green:true},
            {label:'Valid Until', val:'31 March 2026'},
          ].map((r,i,a) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'13px',padding:'8px 0',borderBottom:i<a.length-1?'1px solid var(--border)':'none'}}>
              <span style={{color:'var(--text-muted)'}}>{r.label}</span>
              <span style={{fontWeight:700,color:r.green?'var(--green)':'var(--blue)'}}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-circle-user"></i> Go to My Dashboard</button>
          <button className="btn btn-outline-blue" onClick={() => navigate('/')}><i className="fa-solid fa-house"></i> Back to Home</button>
        </div>
      </div>
    </section>
  );
}