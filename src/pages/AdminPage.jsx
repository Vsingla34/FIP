import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');

  const navItems = [
    { id:'dashboard', icon:'fa-chart-line', label:'Dashboard' },
    { id:'members', icon:'fa-users', label:'Members' },
    { id:'courses', icon:'fa-book', label:'Courses' },
    { id:'events', icon:'fa-calendar', label:'Events' },
    { id:'settings', icon:'fa-gear', label:'Settings' },
  ];

  const mockMembers = [
    { name:'CA Gaurav Aggarwal', profession:'CA', plan:'Standard', joined:'2020', status:'Active' },
    { name:'CA Sadhna Sharma', profession:'CA', plan:'Standard', joined:'2021', status:'Active' },
    { name:'Adv. Gaurav Gupta', profession:'Advocate', plan:'Standard', joined:'2021', status:'Active' },
    { name:'CA Rajesh Patel', profession:'CA', plan:'Renewal', joined:'2022', status:'Active' },
    { name:'CS Meera Krishnan', profession:'CS', plan:'Standard', joined:'2023', status:'Pending' },
  ];

  return (
    <div id="page-admin">
      <div style={{background:'var(--blue)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',color:'#fff',fontSize:'14px',fontWeight:700}}>
          <i className="fa-solid fa-shield-halved" style={{color:'#FFD09B'}}></i> FIP Admin Panel
        </div>
        <Link to="/" style={{color:'rgba(255,255,255,0.6)',fontSize:'13px'}}>← Back to Site</Link>
      </div>
      <div className="admin-layout">
        <div className="admin-sidebar-panel">
          <div className="admin-nav-section">Main</div>
          {navItems.map(n => (
            <button key={n.id} className={`admin-nav-item${tab===n.id?' active':''}`} onClick={() => setTab(n.id)}>
              <i className={`fa-solid ${n.icon}`}></i> {n.label}
            </button>
          ))}
        </div>
        <div className="admin-content-panel">
          {tab === 'dashboard' && (
            <div className="admin-stats-row">
              {[
                { icon:'fa-users', cls:'fi-blue', val:'3,000+', lbl:'Total Members', delta:'+120 this month' },
                { icon:'fa-book', cls:'fi-orange', val:'6', lbl:'Active Courses', delta:'+2 this quarter' },
                { icon:'fa-calendar', cls:'fi-green', val:'3', lbl:'Upcoming Events', delta:'Next: Jan 11' },
                { icon:'fa-indian-rupee-sign', cls:'fi-purple', val:'₹10L+', lbl:'Sponsorship MTD', delta:'↑ 22% vs last' },
              ].map((s,i) => (
                <div className="admin-stat-card" key={i}>
                  <div className={`asc-icon ${s.cls}`}><i className={`fa-solid ${s.icon}`}></i></div>
                  <div>
                    <div className="asc-val">{s.val}</div>
                    <div className="asc-lbl">{s.lbl}</div>
                    <div className="asc-delta delta-up"><i className="fa-solid fa-arrow-up"></i>{s.delta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'members' && (
            <div className="admin-form-card">
              <div className="admin-form-title">Member Management</div>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Profession</th><th>Plan</th><th>Joined</th><th>Status</th></tr></thead>
                <tbody>
                  {mockMembers.map((m,i) => (
                    <tr key={i}>
                      <td><strong>{m.name}</strong></td><td>{m.profession}</td><td>{m.plan}</td><td>{m.joined}</td>
                      <td><span className={`status-pill ${m.status==='Active'?'sp-active':'sp-pending'}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(tab === 'courses' || tab === 'events') && (
            <div className="admin-form-card" style={{textAlign:'center',padding:'60px 24px',color:'var(--text-muted)'}}>
              <i className={`fa-solid ${tab==='courses'?'fa-book':'fa-calendar'}`} style={{fontSize:'32px',marginBottom:'12px',display:'block',color:'var(--border-dark)'}}></i>
              <p>Content management for {tab} coming soon.</p>
            </div>
          )}
          {tab === 'settings' && (
            <div className="admin-form-card">
              <div className="admin-form-title">General Settings</div>
              <div className="form-group"><label className="form-label">Organisation Name</label><input className="form-input" type="text" defaultValue="Federation of Indian Professionals" /></div>
              <div className="form-group"><label className="form-label">Admin Email</label><input className="form-input" type="email" defaultValue="fippresidentoffice@gmail.com" /></div>
              <button className="admin-btn admin-btn-primary">Save Settings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}