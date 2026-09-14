import * as React from 'react';

export default function AdminCoursesListTab({
  adminCourses, openCourseModal, courseSearch, setCourseSearch,
  courseStatusFilter, setCourseStatusFilter, adminCoursesLoading,
  setAdminCourseView, loadCourseEnrollments, deleteAdminCourse,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
        <span>Courses <span style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:400}}>({adminCourses.length})</span></span>
        <button className="btn btn-primary btn-sm" onClick={() => openCourseModal('new')}>
          <i className="fa-solid fa-plus"></i> Add Course
        </button>
      </div>
      <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
        <div className="search-wrap" style={{flex:1,minWidth:'200px',marginBottom:0}}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="search" placeholder="Search by title, category, instructor…"
            value={courseSearch} onChange={e=>setCourseSearch(e.target.value)}/>
        </div>
        <select className="form-select" style={{width:'140px'}} value={courseStatusFilter} onChange={e=>setCourseStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="published">Published</option><option value="draft">Draft</option>
        </select>
      </div>
      {adminCoursesLoading ? (
        <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading courses…
        </div>
      ) : adminCourses.length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-book-open" style={{fontSize:'32px',display:'block',marginBottom:'12px',opacity:.3}}></i>
          <p>No courses yet.</p>
          <button className="btn btn-primary btn-sm" style={{marginTop:'16px'}} onClick={() => openCourseModal('new')}><i className="fa-solid fa-plus"></i> Create First Course</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {adminCourses.map(c => (
            <div key={c.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:'200px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{c.title}</span>
                  <span className={`status-pill ${c.status==='published'?'sp-active':'sp-pending'}`}>{c.status}</span>
                </div>
                <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  {c.category} · {c.level}
                  {c.price > 0 ? ` · ₹${c.price}` : ' · Free'}
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button className="admin-btn admin-btn-orange" onClick={() => { setAdminCourseView(c); loadCourseEnrollments(c); }}>
                  <i className="fa-solid fa-users"></i> Enrollments
                </button>
                <button className="admin-btn" style={{background:'var(--blue-tint)',color:'var(--blue)',border:'1px solid #C0CDE8'}} onClick={() => openCourseModal(c)}>
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => deleteAdminCourse(c.id)}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}