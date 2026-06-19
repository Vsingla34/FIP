import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function JobsPage() {
  const { user, profile } = useAuth();
  const { openModal, showToast } = useApp();
  const navigate = useNavigate();

  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const [applyJob, setApplyJob]   = useState(null); // job currently in apply modal
  const [coverNote, setCoverNote] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState([]); // job_ids already applied to

  const canApply = profile?.account_type === 'member' && profile?.membership_status === 'Active';

  /* ── load active jobs ── */
  useEffect(() => {
    supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setJobs(data || []); setLoading(false); });
  }, []);

  /* ── load my existing applications so we can show "Applied" state ── */
  useEffect(() => {
    if (!user) { setMyApplications([]); return; }
    supabase
      .from('job_applications')
      .select('job_id')
      .eq('user_id', user.id)
      .then(({ data }) => setMyApplications((data || []).map(a => a.job_id)));
  }, [user]);

  const typeOptions = ['All', ...new Set(jobs.map(j => j.job_type))];
  const filtered = jobs.filter(j =>
    (typeFilter === 'All' || j.job_type === typeFilter) &&
    (!search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      (j.category || '').toLowerCase().includes(search.toLowerCase()))
  );

  /* ── open apply modal ── */
  const handleApplyClick = (job) => {
    if (!user) {
      showToast('Please log in to apply.', true);
      openModal('login');
      return;
    }
    if (!canApply) {
      showToast('Job applications are available to active FIP Members only.', true);
      return;
    }
    setApplyJob(job);
    setCoverNote('');
    setResumeUrl('');
  };

  /* ── submit application ── */
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!coverNote.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id:     applyJob.id,
          user_id:    user.id,
          cover_note: coverNote.trim(),
          resume_url: resumeUrl.trim() || null,
        });
      if (error) throw error;
      setMyApplications(prev => [...prev, applyJob.id]);
      setApplyJob(null);
      showToast('Application submitted! The admin team will review it shortly.');
    } catch (err) {
      console.error('Apply error:', err);
      if (err.code === '23505') {
        showToast('You have already applied to this job.', true);
      } else {
        showToast('Failed to submit application. Please try again.', true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatSalary = (job) => {
    if (!job.salary_min && !job.salary_max) return null;
    const period = job.salary_period === 'monthly' ? '/mo' : '/yr';
    const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
    if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}${period}`;
    return `${fmt(job.salary_min || job.salary_max)}${period}`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Jobs</span></div>
          <h1>Job &amp; Opportunity Board</h1>
          <p>Exclusive listings from FIP member firms — open to all active FIP Members.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="container">

          {!canApply && user && (
            <div className="jobs-member-banner">
              <i className="fa-solid fa-circle-info"></i>
              <span>Job applications are available to <strong>Active FIP Members</strong> only.{' '}
                {profile?.account_type === 'student'
                  ? <span style={{cursor:'pointer',color:'var(--orange)',fontWeight:700}} onClick={() => navigate('/membership')}>Upgrade to Membership →</span>
                  : <span style={{cursor:'pointer',color:'var(--orange)',fontWeight:700}} onClick={() => navigate('/membership')}>Activate your membership →</span>
                }
              </span>
            </div>
          )}

          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="Search by title, firm, or category…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-pills">
            {typeOptions.map(t => (
              <div key={t} className={`fpill${typeFilter===t?' active':''}`} onClick={() => setTypeFilter(t)}>{t}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize:'24px', display:'block', marginBottom:'8px' }}></i>
              Loading jobs…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>
              <i className="fa-solid fa-briefcase" style={{ fontSize:'36px', display:'block', marginBottom:'12px', opacity:.3 }}></i>
              {jobs.length === 0 ? 'No job openings right now. Check back soon.' : 'No jobs match your search.'}
            </div>
          ) : (
            <div className="jobs-list">
              {filtered.map(job => {
                const applied = myApplications.includes(job.id);
                const salary = formatSalary(job);
                return (
                  <div className="job-card" key={job.id}>
                    <div className="job-card-main">
                      <div className="job-card-top">
                        <span className="job-type-pill">{job.job_type}</span>
                        {job.category && <span className="job-cat-pill">{job.category}</span>}
                      </div>
                      <h3 className="job-title">{job.title}</h3>
                      <div className="job-company">
                        <i className="fa-solid fa-building"></i> {job.company}
                        <span className="job-dot">·</span>
                        <i className="fa-solid fa-location-dot"></i> {job.location}
                      </div>
                      <p className="job-desc">{job.description}</p>
                      {job.requirements && (
                        <div className="job-requirements">
                          <strong>Requirements:</strong> {job.requirements}
                        </div>
                      )}
                      <div className="job-meta-row">
                        {salary && <span className="job-salary"><i className="fa-solid fa-indian-rupee-sign"></i> {salary}</span>}
                        <span className="job-posted">Posted {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="job-card-action">
                      {applied ? (
                        <button className="btn btn-outline-blue btn-sm" disabled style={{ opacity: .7, cursor:'default' }}>
                          <i className="fa-solid fa-check"></i> Applied
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => handleApplyClick(job)}>
                          Apply Now <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Apply Modal ── */}
      {applyJob && (
        <div className="modal-overlay" onClick={() => setApplyJob(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setApplyJob(null)}>&#x2715;</button>
            <div className="modal-title">Apply for {applyJob.title}</div>
            <div className="modal-sub">{applyJob.company} · {applyJob.location}</div>

            <form onSubmit={handleSubmitApplication}>
              <div className="form-group">
                <label className="form-label">Cover Note *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Briefly explain why you're a great fit for this role…"
                  value={coverNote}
                  onChange={e => setCoverNote(e.target.value)}
                  required
                  style={{ minHeight: '120px' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resume / Portfolio URL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://drive.google.com/your-resume"
                  value={resumeUrl}
                  onChange={e => setResumeUrl(e.target.value)}
                />
              </div>
              <div style={{ background:'var(--blue-pale)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:'16px', fontSize:'12px', color:'var(--text-muted)', display:'flex', gap:'8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color:'var(--green)', marginTop:'2px', flexShrink:0 }}></i>
                Your profile details (name, email, phone, profession) will be shared with the employer automatically.
              </div>
              <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={submitting}>
                {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit Application</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}