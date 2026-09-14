import * as React from 'react';

export default function AdminDashboardTab({
  dashLoading, dashStats, fipMembers, recentRegistrations, formatRelativeDate, recentPayments,
}) {
  return (
    <>
      <h2 className="admin-page-title">Dashboard Overview {dashLoading && <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'14px',color:'var(--text-light)',marginLeft:'8px'}}></i>}</h2>

      {/* Stat cards row — matches reference exactly */}
      <div className="dboard-stats-row">
        <div className="dboard-stat-card">
          <div className="dboard-stat-icon dsi-blue"><i className="fa-solid fa-users"></i></div>
          <div className="dboard-stat-val">{dashStats.totalMembers ?? fipMembers.length}</div>
          <div className="dboard-stat-lbl">FIP Members</div>
          <div className="dboard-stat-trend trend-up">
            <i className="fa-solid fa-arrow-up"></i> {dashStats.activeMembers ?? 0} active
            {dashStats.guestUsers > 0 && <span style={{color:'var(--text-muted)',fontWeight:400,marginLeft:'6px'}}>· {dashStats.guestUsers} guests</span>}
          </div>
        </div>

        <div className="dboard-stat-card">
          <div className="dboard-stat-icon dsi-orange"><i className="fa-solid fa-indian-rupee-sign"></i></div>
          <div className="dboard-stat-val">{dashStats.revenue >= 100000 ? `₹${(dashStats.revenue/100000).toFixed(1)}L` : `₹${(dashStats.revenue||0).toLocaleString('en-IN')}`}</div>
          <div className="dboard-stat-lbl">Revenue This Year</div>
          <div className="dboard-stat-trend trend-up" style={{flexDirection:'column',alignItems:'flex-start',gap:'3px',lineHeight:1.5}}>
            {dashStats.membershipRev > 0 && <span>🎫 Membership ₹{dashStats.membershipRev.toLocaleString('en-IN')}</span>}
            {dashStats.courseRev     > 0 && <span>📚 Courses ₹{dashStats.courseRev.toLocaleString('en-IN')}</span>}
            {dashStats.eventRev      > 0 && <span>📅 Events ₹{dashStats.eventRev.toLocaleString('en-IN')}</span>}
          </div>
        </div>

        <div className="dboard-stat-card">
          <div className="dboard-stat-icon dsi-green"><i className="fa-solid fa-calendar-check"></i></div>
          <div className="dboard-stat-val">{dashStats.events}</div>
          <div className="dboard-stat-lbl">Active Events</div>
          <div className="dboard-stat-trend trend-up">
            <i className="fa-solid fa-arrow-up"></i> Upcoming & ongoing
          </div>
        </div>

        <div className="dboard-stat-card">
          <div className="dboard-stat-icon dsi-purple"><i className="fa-solid fa-graduation-cap"></i></div>
          <div className="dboard-stat-val">{dashStats.enrollments}</div>
          <div className="dboard-stat-lbl">Course Registrations</div>
          <div className="dboard-stat-trend trend-up">
            <i className="fa-solid fa-arrow-up"></i> All time
          </div>
        </div>
      </div>

      {/* Recent activity — two column layout matching reference */}
      <div className="dboard-activity-grid">

        {/* Recent Member Registrations */}
        <div className="dboard-activity-card">
          <div className="dboard-activity-title">Recent Member Registrations</div>
          <div className="dboard-table-wrap">
            <table className="dboard-table">
              <thead>
                <tr><th>Name</th><th>Profession</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentRegistrations.length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}>No registrations yet</td></tr>
                ) : recentRegistrations.map((m,i) => (
                  <tr key={i}>
                    <td>
                      <div className="dboard-table-name">{m.full_name || '—'}</div>
                      <div className="dboard-table-sub">{m.city || ''}</div>
                    </td>
                    <td className="dboard-table-muted" style={{fontSize:'12px'}}>{m.profession || '—'}</td>
                    <td className="dboard-table-muted">{formatRelativeDate(m.created_at)}</td>
                    <td>
                      <span className={`dboard-pill ${m.membership_status==='Active'?'pill-green':'pill-orange'}`}>
                        {m.membership_status === 'Active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="dboard-activity-card">
          <div className="dboard-activity-title">Recent Payments</div>
          <div className="dboard-table-wrap">
            <table className="dboard-table">
              <thead>
                <tr><th>Member</th><th>Plan</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {dashLoading ? (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}><i className="fa-solid fa-spinner fa-spin"></i></td></tr>
                ) : recentPayments.length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--text-light)'}}>No payments yet</td></tr>
                ) : recentPayments.map((p,i) => (
                  <tr key={i}>
                    <td>
                      <div className="dboard-table-name">{p.profiles?.full_name || '—'}</div>
                    </td>
                    <td className="dboard-table-muted" style={{fontSize:'11px',maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.item_name}</td>
                    <td>
                      <span style={{color:'var(--orange)',fontWeight:700}}>₹{p.total_amount}</span>
                    </td>
                    <td>
                      <span className={`dboard-pill ${p.status==='Paid'?'pill-green':'pill-orange'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ DASHBOARD-OLD-PERMISSIONS (kept, renamed) ═══ — dead code, always false, moved here as-is since it has zero external dependencies */}
      {false && (
        <>
          <div className="admin-form-card" style={{marginTop:'24px'}}>
            <div className="admin-form-title">Role Permissions Matrix</div>
            <table className="admin-table">
              <thead><tr><th>Permission</th><th style={{textAlign:'center'}}>Member</th><th style={{textAlign:'center'}}>Admin</th></tr></thead>
              <tbody>
                {[
                  ['View own dashboard',        true,  true ],
                  ['Enroll in courses',          true,  true ],
                  ['RSVP to events',             true,  true ],
                  ['Upload profile picture',     true,  true ],
                  ['View member directory',      true,  true ],
                  ['Access admin panel',         false, true ],
                  ['Manage committee members',   false, true ],
                  ['Add / remove committees',    false, true ],
                  ['Change member roles',        false, true ],
                  ['Activate membership',        false, true ],
                ].map(([p,m,a],i) => (
                  <tr key={i}>
                    <td style={{fontSize:'13px'}}>{p}</td>
                    <td style={{textAlign:'center'}}>{m ? <i className="fa-solid fa-check" style={{color:'var(--green)'}}></i> : <i className="fa-solid fa-xmark" style={{color:'#C0392B'}}></i>}</td>
                    <td style={{textAlign:'center'}}>{a ? <i className="fa-solid fa-check" style={{color:'var(--green)'}}></i> : <i className="fa-solid fa-xmark" style={{color:'#C0392B'}}></i>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}