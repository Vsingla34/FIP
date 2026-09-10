import * as React from 'react';

export default function AdminJobApplicationsTab({
  viewingJobId, setViewingJobId, jobs, appsLoading, applications, reviewApplication,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title" style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={() => setViewingJobId(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--blue)',fontSize:'16px'}}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span>Applications for <strong>{jobs.find(j=>j.id===viewingJobId)?.title}</strong></span>
      </div>

      {appsLoading ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
        </div>
      ) : applications.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-inbox" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
          No applications yet for this job.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {applications.map(app => {
            const initials = (app.applicant_name||'').split(' ').filter(w=>w.length>1).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
            return (
              <div key={app.application_id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px 20px'}}>
                <div style={{display:'flex',gap:'14px',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',color:'#FFD09B',fontWeight:700,fontSize:'13px',flexShrink:0}}>
                    {initials}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:'var(--blue)',fontSize:'14px'}}>{app.applicant_name}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>
                      {app.applicant_profession} {app.applicant_city ? `· ${app.applicant_city}` : ''}
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-light)',marginTop:'2px'}}>
                      <i className="fa-solid fa-envelope" style={{marginRight:'4px'}}></i>{app.applicant_email}
                      {app.applicant_phone && <span style={{marginLeft:'12px'}}><i className="fa-solid fa-phone" style={{marginRight:'4px'}}></i>{app.applicant_phone}</span>}
                    </div>
                  </div>
                  <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                    background:app.status==='shortlisted'?'var(--green-pale)':app.status==='rejected'?'#FFF0EE':app.status==='reviewed'?'var(--blue-tint)':'var(--orange-pale)',
                    color:app.status==='shortlisted'?'var(--green)':app.status==='rejected'?'#C0392B':app.status==='reviewed'?'var(--blue-mid)':'var(--orange-dark)'}}>
                    {app.status.charAt(0).toUpperCase()+app.status.slice(1)}
                  </span>
                </div>
                <p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.65,borderLeft:'3px solid var(--orange)',paddingLeft:'12px',margin:'0 0 12px'}}>
                  {app.cover_note}
                </p>
                {app.resume_url && (
                  <a href={app.resume_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'var(--orange)',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'5px',marginBottom:'12px'}}>
                    <i className="fa-solid fa-file-lines"></i> View Resume/Portfolio
                  </a>
                )}
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {app.status !== 'shortlisted' && (
                    <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={() => reviewApplication(app.application_id, 'shortlisted')}>
                      <i className="fa-solid fa-star"></i> Shortlist
                    </button>
                  )}
                  {app.status === 'submitted' && (
                    <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => reviewApplication(app.application_id, 'reviewed')}>
                      <i className="fa-solid fa-eye"></i> Mark Reviewed
                    </button>
                  )}
                  {app.status !== 'rejected' && (
                    <button className="admin-btn admin-btn-danger" onClick={() => reviewApplication(app.application_id, 'rejected')}>
                      <i className="fa-solid fa-xmark"></i> Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}