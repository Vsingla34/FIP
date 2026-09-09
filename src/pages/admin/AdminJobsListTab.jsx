import * as React from 'react';

export default function AdminJobsListTab({
  jobs, setJobs, openNewJob, jobSearch, setJobSearch, jobTypeFilter, setJobTypeFilter,
  jobsLoading, supabase, showToast, appCounts, viewApplications, openEditJob, toggleJobStatus, deleteJob,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
        <span>Job Postings <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({jobs.length})</span></span>
        <button className="btn btn-primary btn-sm" onClick={openNewJob}>
          <i className="fa-solid fa-plus"></i> Post New Job
        </button>
      </div>
      <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
        <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="search" placeholder="Search by title, company, location…"
            value={jobSearch} onChange={e=>setJobSearch(e.target.value)}/>
        </div>
        <select className="form-select" style={{width:'150px'}} value={jobTypeFilter} onChange={e=>setJobTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          <option>Full-time</option><option>Part-time</option>
          <option>Contract</option><option>Internship</option><option>Freelance</option>
        </select>
      </div>

      {/* ── Member submissions pending approval ── */}
      {jobs.filter(j => j.approval_status === 'pending').length > 0 && (
        <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:'var(--radius-md)',padding:'14px 18px',marginBottom:'20px'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'#92400E',marginBottom:'10px',display:'flex',alignItems:'center',gap:'7px'}}>
            <i className="fa-solid fa-clock" style={{color:'#D97706'}}></i>
            {jobs.filter(j=>j.approval_status==='pending').length} Member Job Post{jobs.filter(j=>j.approval_status==='pending').length>1?'s':''} Awaiting Approval
          </div>
          {jobs.filter(j => j.approval_status === 'pending').map(job => (
            <div key={job.id} style={{background:'#fff',border:'1px solid #FCD34D',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:'200px'}}>
                <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)',marginBottom:'3px'}}>{job.title}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'4px'}}>
                  {job.company} · {job.location} · {job.job_type}
                </div>
                {(job.poster_name || job.poster_email) && (
                  <div style={{fontSize:'12px',color:'#92400E',fontWeight:600}}>
                    <i className="fa-solid fa-user" style={{marginRight:'4px'}}></i>
                    Posted by: {job.poster_name || job.poster_email}
                  </div>
                )}
                {job.description && (
                  <p style={{fontSize:'12px',color:'var(--text-muted)',margin:'6px 0 0',lineHeight:1.6}}>
                    {job.description.slice(0,150)}{job.description.length>150?'…':''}
                  </p>
                )}
              </div>
              <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap'}}>
                <button className="admin-btn" style={{background:'var(--green)',color:'#fff',border:'none'}}
                  onClick={async () => {
                    const { error } = await supabase.rpc('admin_approve_job', { p_job_id: job.id });
                    if (!error) setJobs(prev => prev.map(j => j.id===job.id ? {...j,approval_status:'approved',status:'active'} : j));
                    else showToast('Error: '+error.message, true);
                  }}>
                  <i className="fa-solid fa-check"></i> Approve
                </button>
                <button className="admin-btn" style={{background:'#FFF0EE',color:'#C0392B',border:'1px solid #F5BDBA'}}
                  onClick={async () => {
                    const note = window.prompt('Reason for rejection (shown to member):');
                    if (note === null) return;
                    const { error } = await supabase.rpc('admin_reject_job', { p_job_id: job.id, p_note: note });
                    if (!error) setJobs(prev => prev.map(j => j.id===job.id ? {...j,approval_status:'rejected',rejection_note:note} : j));
                  }}>
                  <i className="fa-solid fa-xmark"></i> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {jobsLoading ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
        </div>
      ) : jobs.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-briefcase" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
          No jobs posted yet.
          <div style={{marginTop:'16px'}}>
            <button className="btn btn-primary btn-sm" onClick={openNewJob}><i className="fa-solid fa-plus"></i> Post Your First Job</button>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {jobs.map(job => (
            <div key={job.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:'220px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{job.title}</span>
                    <span className={`status-pill ${job.status==='active'?'sp-active':'sp-pending'}`}>
                      {job.status.charAt(0).toUpperCase()+job.status.slice(1)}
                    </span>
                  </div>
                  <div style={{fontSize:'13px',color:'var(--text-muted)'}}>
                    <i className="fa-solid fa-building" style={{marginRight:'5px',color:'var(--orange)'}}></i>{job.company}
                    <span style={{margin:'0 8px',color:'var(--border-dark)'}}>·</span>
                    <i className="fa-solid fa-location-dot" style={{marginRight:'5px',color:'var(--orange)'}}></i>{job.location}
                    <span style={{margin:'0 8px',color:'var(--border-dark)'}}>·</span>
                    {job.job_type}
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <button className="admin-btn admin-btn-orange" onClick={() => viewApplications(job.id)}>
                    <i className="fa-solid fa-users"></i> {appCounts[job.id] || 0} Applications
                  </button>
                  <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openEditJob(job)}>
                    <i className="fa-solid fa-pen"></i> Edit
                  </button>
                  <button className="admin-btn" style={{background: job.status==='active'?'var(--off-white)':'var(--green-pale)', color: job.status==='active'?'var(--text-muted)':'var(--green)', border:'1px solid var(--border)'}} onClick={() => toggleJobStatus(job)}>
                    {job.status==='active' ? <><i className="fa-solid fa-pause"></i> Close</> : <><i className="fa-solid fa-play"></i> Reopen</>}
                  </button>
                  <button className="admin-btn admin-btn-danger" onClick={() => deleteJob(job.id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}