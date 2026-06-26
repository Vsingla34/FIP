import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

const JOB_TYPES = ['Full-time','Part-time','Contract','Internship','Freelance'];
const CATEGORIES = ['Tax','Audit','Corporate Law','FEMA','Finance','Accounting','Legal','Other'];

export default function JobsPage() {
  const { user, profile } = useAuth();
  const { openModal, showToast } = useApp();

  const [view,       setView]       = useState('list'); // 'list' | 'post' | 'mine'
  const [jobs,       setJobs]       = useState([]);
  const [myJobs,     setMyJobs]     = useState([]);
  const [myApps,     setMyApps]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Apply modal
  const [applyJob,   setApplyJob]   = useState(null);
  const [coverNote,  setCoverNote]  = useState('');
  const [resumeUrl,  setResumeUrl]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Post job form
  const [saving, setSaving] = useState(false);
  const [jobForm, setJobForm] = useState({
    title:'', company:'', location:'', job_type:'Full-time', category:'',
    description:'', requirements:'', salary_min:'', salary_max:'',
    salary_period:'yearly', contact_email:'',
  });

  const isActiveMember = profile?.membership_status === 'Active';
  const canApply       = profile?.account_type === 'member' && isActiveMember;

  /* ── Load approved jobs ── */
  useEffect(() => {
    supabase.from('jobs').select('*')
      .eq('status','active').eq('approval_status','approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setJobs(data || []); setLoading(false); });
  }, []);

  /* ── Load my applications (to show Applied state) ── */
  useEffect(() => {
    if (!user) return;
    supabase.from('job_applications').select('job_id').eq('user_id', user.id)
      .then(({ data }) => setMyApps((data || []).map(a => a.job_id)));
  }, [user]);

  /* ── Load my posted jobs ── */
  const loadMyJobs = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('get_my_jobs');
    setMyJobs(data || []);
  };
  useEffect(() => { if (view === 'mine') loadMyJobs(); }, [view, user]);

  const typeOptions = ['All', ...new Set(jobs.map(j => j.job_type))];
  const filtered    = jobs.filter(j =>
    (typeFilter === 'All' || j.job_type === typeFilter) &&
    (!search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      (j.category||'').toLowerCase().includes(search.toLowerCase()))
  );

  /* ── Apply to job ── */
  const handleApply = async (e) => {
    e.preventDefault();
    if (!coverNote.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('job_applications').insert({
      job_id: applyJob.id, user_id: user.id,
      cover_note: coverNote.trim(), resume_url: resumeUrl.trim()||null,
    });
    setSubmitting(false);
    if (error?.code === '23505') { showToast('You have already applied!', true); }
    else if (error) { showToast('Failed to apply. Please try again.', true); }
    else {
      setMyApps(prev => [...prev, applyJob.id]);
      setApplyJob(null); setCoverNote(''); setResumeUrl('');
      showToast('Application submitted! The poster will contact you.');
    }
  };

  /* ── Submit job for approval ── */
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.company.trim() || !jobForm.description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('jobs').insert({
      ...jobForm,
      salary_min:      jobForm.salary_min    ? Number(jobForm.salary_min)  : null,
      salary_max:      jobForm.salary_max    ? Number(jobForm.salary_max)  : null,
      posted_by:       user.id,
      posted_by_member:true,
      status:          'active',
      approval_status: 'pending',
    });
    setSaving(false);
    if (error) { showToast('Failed to submit. ' + error.message, true); return; }
    showToast('Job submitted for admin review! It will go live once approved.');
    setJobForm({ title:'', company:'', location:'', job_type:'Full-time', category:'', description:'', requirements:'', salary_min:'', salary_max:'', salary_period:'yearly', contact_email:'' });
    setView('mine');
  };

  const deleteMyJob = async (id) => {
    if (!window.confirm('Delete this job post?')) return;
    await supabase.from('jobs').delete().eq('id', id);
    setMyJobs(prev => prev.filter(j => j.id !== id));
    showToast('Job post deleted.');
  };

  const formatSalary = (job) => {
    if (!job.salary_min && !job.salary_max) return null;
    const period = job.salary_period === 'monthly' ? '/mo' : '/yr';
    if (job.salary_min && job.salary_max)
      return `₹${Number(job.salary_min).toLocaleString('en-IN')} – ₹${Number(job.salary_max).toLocaleString('en-IN')}${period}`;
    return `₹${Number(job.salary_min || job.salary_max).toLocaleString('en-IN')}${period}`;
  };

  const statusColor = { pending:'#F59E0B', approved:'var(--green)', rejected:'#EF4444', active:'var(--green)' };

  // Visitors see a locked screen
  if (!user) return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Jobs</span></div>
          <h1>Job & Opportunity Board</h1>
          <p>Exclusive listings from FIP member firms — jobs, freelance briefs, and collaboration opportunities.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container" style={{maxWidth:'520px',margin:'0 auto',textAlign:'center',padding:'60px 20px'}}>
          <div style={{width:'72px',height:'72px',borderRadius:'50%',background:'var(--blue-pale)',border:'2px solid var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'28px'}}>
            <i className="fa-solid fa-lock" style={{color:'var(--blue)'}}></i>
          </div>
          <h2 style={{fontSize:'22px',fontWeight:700,color:'var(--blue)',marginBottom:'8px',fontFamily:"'Playfair Display',serif"}}>Members Only</h2>
          <p style={{fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'28px'}}>
            The FIP Job Board is exclusively for registered members and students.
            Create a free account or log in to browse opportunities.
          </p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={() => openModal('register', { defaultType:'student' })}>
              <i className="fa-solid fa-user-plus"></i> Create Free Account
            </button>
            <button className="btn btn-outline-blue" onClick={() => openModal('login')}>
              <i className="fa-solid fa-sign-in-alt"></i> Log In
            </button>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Jobs</span></div>
          <h1>Job & Opportunity Board</h1>
          <p>Exclusive listings from FIP member firms — jobs, freelance briefs, and collaboration opportunities.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">

          {/* ── Tab bar ── */}
          <div className="blog-tabs" style={{marginBottom:'20px'}}>
            <button className={`blog-tab${view==='list'?' active':''}`} onClick={() => setView('list')}>
              <i className="fa-solid fa-briefcase"></i> All Jobs
            </button>
            {user && (
              <>
                <button className={`blog-tab${view==='mine'?' active':''}`} onClick={() => setView('mine')}>
                  <i className="fa-solid fa-user-pen"></i> My Posts
                </button>
                {isActiveMember && (
                  <button className={`blog-tab${view==='post'?' active':''}`} onClick={() => setView('post')}>
                    <i className="fa-solid fa-plus"></i> Post a Job
                  </button>
                )}
              </>
            )}
          </div>

          {/* ════════════ JOB LIST ════════════ */}
          {view === 'list' && (
            <>
              {/* Member banner */}
              {!canApply && (
                <div className="jobs-member-banner" style={{marginBottom:'20px'}}>
                  <div className="jmb-icon"><i className="fa-solid fa-lock"></i></div>
                  <div>
                    <div className="jmb-title">Active Members Only</div>
                    <div className="jmb-sub">
                      {!user
                        ? <><span onClick={() => openModal('register')} style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}>Create an account</span> or <span onClick={() => openModal('login')} style={{color:'var(--orange)',cursor:'pointer',fontWeight:600}}>sign in</span> to apply for jobs.</>
                        : 'Upgrade to Active Membership to apply for jobs and post opportunities.'
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Search + filter */}
              <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}}>
                <div className="search-wrap" style={{flex:1,minWidth:'240px',marginBottom:0}}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="search" placeholder="Search jobs, companies, categories…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <select className="form-select" style={{width:'160px'}} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                  {typeOptions.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {loading ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'28px',display:'block',marginBottom:'12px',color:'var(--orange)'}}></i>
                  Loading jobs…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-briefcase" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  {jobs.length === 0 ? 'No job openings right now. Check back soon.' : 'No jobs match your search.'}
                  {isActiveMember && <><br/><button className="btn btn-primary btn-sm" style={{marginTop:'16px'}} onClick={()=>setView('post')}><i className="fa-solid fa-plus"></i> Post a Job</button></>}
                </div>
              ) : (
                <div className="jobs-list">
                  {filtered.map(job => {
                    const applied   = myApps.includes(job.id);
                    const salary    = formatSalary(job);
                    const daysAgo   = Math.floor((Date.now() - new Date(job.created_at)) / 86400000);
                    return (
                      <div className="job-card" key={job.id}>
                        <div className="job-card-main">
                          <div className="job-header">
                            <div>
                              <div className="job-title">{job.title}</div>
                              <div className="job-company">
                                <i className="fa-solid fa-building" style={{fontSize:'11px',color:'var(--text-light)',marginRight:'5px'}}></i>
                                {job.company}
                                <span className="job-location">
                                  <i className="fa-solid fa-location-dot" style={{fontSize:'10px',marginRight:'3px'}}></i>
                                  {job.location}
                                </span>
                              </div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px',flexShrink:0}}>
                              <span className="job-type-badge">{job.job_type}</span>
                              {daysAgo === 0 ? <span style={{fontSize:'10px',color:'var(--green)',fontWeight:700}}>New</span>
                                : daysAgo <= 3 ? <span style={{fontSize:'10px',color:'var(--orange)',fontWeight:600}}>{daysAgo}d ago</span>
                                : <span style={{fontSize:'10px',color:'var(--text-light)'}}>{daysAgo}d ago</span>
                              }
                            </div>
                          </div>

                          {(salary || job.category) && (
                            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',margin:'10px 0',fontSize:'13px'}}>
                              {salary && <span style={{color:'var(--green)',fontWeight:700}}>{salary}</span>}
                              {job.category && <span style={{color:'var(--text-muted)'}}><i className="fa-solid fa-tag" style={{marginRight:'4px',fontSize:'10px'}}></i>{job.category}</span>}
                            </div>
                          )}

                          {job.description && (
                            <p className="job-desc">{job.description.slice(0, 180)}{job.description.length > 180 ? '…' : ''}</p>
                          )}
                        </div>

                        <div className="job-card-footer">
                          {canApply ? (
                            applied ? (
                              <span style={{fontSize:'13px',fontWeight:700,color:'var(--green)',display:'flex',alignItems:'center',gap:'5px'}}>
                                <i className="fa-solid fa-check-circle"></i> Applied
                              </span>
                            ) : (
                              <button className="btn btn-primary btn-sm" onClick={() => { setApplyJob(job); setCoverNote(''); setResumeUrl(''); }}>
                                <i className="fa-solid fa-paper-plane"></i> Apply Now
                              </button>
                            )
                          ) : (
                            <button className="btn btn-outline-blue btn-sm" onClick={() => openModal(user ? 'login' : 'register')}>
                              <i className="fa-solid fa-lock"></i> {user ? 'Upgrade to Apply' : 'Sign In to Apply'}
                            </button>
                          )}
                          {job.contact_email && (
                            <a href={`mailto:${job.contact_email}`} style={{fontSize:'12px',color:'var(--text-light)',textDecoration:'none',display:'flex',alignItems:'center',gap:'4px'}}>
                              <i className="fa-solid fa-envelope" style={{color:'var(--orange)'}}></i> {job.contact_email}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ POST A JOB ════════════ */}
          {view === 'post' && (
            <div style={{maxWidth:'700px'}}>
              <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)',padding:'12px 16px',marginBottom:'20px',fontSize:'13px',color:'var(--blue)',display:'flex',gap:'8px'}}>
                <i className="fa-solid fa-circle-info" style={{marginTop:'1px',flexShrink:0}}></i>
                Your job post will be reviewed by our admin team before going live. We usually approve within 24 hours.
              </div>

              <form onSubmit={handlePostJob} className="blog-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input className="form-input" placeholder="e.g. Senior CA – Tax" value={jobForm.title} onChange={e=>setJobForm(f=>({...f,title:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company / Firm *</label>
                    <input className="form-input" placeholder="Your firm or company name" value={jobForm.company} onChange={e=>setJobForm(f=>({...f,company:e.target.value}))} required/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input className="form-input" placeholder="e.g. New Delhi / Remote" value={jobForm.location} onChange={e=>setJobForm(f=>({...f,location:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Type</label>
                    <select className="form-select" value={jobForm.job_type} onChange={e=>setJobForm(f=>({...f,job_type:e.target.value}))}>
                      {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={jobForm.category} onChange={e=>setJobForm(f=>({...f,category:e.target.value}))}>
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input className="form-input" type="email" placeholder="Applications to this email" value={jobForm.contact_email} onChange={e=>setJobForm(f=>({...f,contact_email:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Salary (₹)</label>
                    <input className="form-input" type="number" placeholder="e.g. 600000" value={jobForm.salary_min} onChange={e=>setJobForm(f=>({...f,salary_min:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Salary (₹)</label>
                    <input className="form-input" type="number" placeholder="e.g. 1200000" value={jobForm.salary_max} onChange={e=>setJobForm(f=>({...f,salary_max:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period</label>
                    <select className="form-select" value={jobForm.salary_period} onChange={e=>setJobForm(f=>({...f,salary_period:e.target.value}))}>
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Job Description *</label>
                  <textarea className="form-textarea" placeholder="Role overview, responsibilities, what you're looking for…" value={jobForm.description} onChange={e=>setJobForm(f=>({...f,description:e.target.value}))} required style={{minHeight:'130px'}}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Requirements <span style={{fontWeight:400,color:'var(--text-light)'}}>— optional</span></label>
                  <textarea className="form-textarea" placeholder="Qualifications, experience, skills required…" value={jobForm.requirements} onChange={e=>setJobForm(f=>({...f,requirements:e.target.value}))} style={{minHeight:'80px'}}></textarea>
                </div>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  <button type="submit" className="btn btn-primary" disabled={saving||!jobForm.title.trim()||!jobForm.company.trim()||!jobForm.description.trim()}>
                    {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit for Review</>}
                  </button>
                  <button type="button" className="btn btn-outline-blue" onClick={() => setView('list')}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* ════════════ MY POSTS ════════════ */}
          {view === 'mine' && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
                <h2 style={{fontSize:'18px',fontWeight:700,color:'var(--blue)'}}>My Job Posts ({myJobs.length})</h2>
                {isActiveMember && (
                  <button className="btn btn-primary btn-sm" onClick={() => setView('post')}>
                    <i className="fa-solid fa-plus"></i> Post Another Job
                  </button>
                )}
              </div>

              {myJobs.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
                  <i className="fa-solid fa-briefcase" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
                  <p>You haven't posted any jobs yet.</p>
                  {isActiveMember && (
                    <button className="btn btn-primary btn-sm" style={{marginTop:'14px'}} onClick={() => setView('post')}>
                      <i className="fa-solid fa-plus"></i> Post a Job
                    </button>
                  )}
                </div>
              ) : myJobs.map(job => (
                <div key={job.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'18px 20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:'200px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{job.title}</span>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'20px',
                        background:`${statusColor[job.approval_status]}15`,
                        color:statusColor[job.approval_status],
                        border:`1px solid ${statusColor[job.approval_status]}40`,
                      }}>
                        {job.approval_status === 'approved' ? '✓ Live' : job.approval_status === 'pending' ? '⏳ Under Review' : '✕ Rejected'}
                      </span>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                      <span>{job.company}</span>
                      <span>{job.location}</span>
                      <span>{job.job_type}</span>
                      <span>{new Date(job.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    {job.approval_status === 'rejected' && job.rejection_note && (
                      <div style={{marginTop:'8px',background:'#FFF0EE',border:'1px solid #F5BDBA',borderRadius:'6px',padding:'8px 12px',fontSize:'12px',color:'#C0392B'}}>
                        <i className="fa-solid fa-circle-info" style={{marginRight:'5px'}}></i>
                        Admin note: {job.rejection_note}
                      </div>
                    )}
                    {job.approval_status === 'pending' && (
                      <div style={{marginTop:'6px',fontSize:'12px',color:'#F59E0B'}}>
                        <i className="fa-solid fa-clock" style={{marginRight:'4px'}}></i>
                        Awaiting admin review — usually within 24 hours
                      </div>
                    )}
                  </div>
                  {(job.approval_status === 'pending' || job.approval_status === 'rejected') && (
                    <button className="admin-btn admin-btn-danger" onClick={() => deleteMyJob(job.id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════ APPLY MODAL ════════════ */}
      {applyJob && (
        <div className="modal-overlay" onClick={() => setApplyJob(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:'500px'}}>
            <button className="modal-close" onClick={() => setApplyJob(null)}>&#x2715;</button>
            <div style={{background:'var(--blue-pale)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',marginBottom:'16px'}}>
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--blue)',marginBottom:'2px'}}>{applyJob.title}</div>
              <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{applyJob.company} · {applyJob.location} · {applyJob.job_type}</div>
            </div>
            <div className="modal-title">Apply for this Role</div>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label className="form-label">Cover Note * <span style={{fontWeight:400,color:'var(--text-light)'}}>— why are you a good fit?</span></label>
                <textarea className="form-textarea" placeholder="Briefly introduce yourself and explain why you're applying for this role…" value={coverNote} onChange={e=>setCoverNote(e.target.value)} required style={{minHeight:'120px'}}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Resume / Portfolio URL <span style={{fontWeight:400,color:'var(--text-light)'}}>— optional</span></label>
                <input className="form-input" type="url" placeholder="https://linkedin.com/in/yourname or Google Drive link" value={resumeUrl} onChange={e=>setResumeUrl(e.target.value)}/>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={submitting||!coverNote.trim()}>
                {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit Application</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}