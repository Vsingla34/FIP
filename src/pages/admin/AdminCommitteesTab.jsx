import * as React from 'react';

export default function AdminCommitteesTab({
  openAddCommittee, committeesLoading, committees, openEditCommittee, setConfirmDelete,
  openAddMember, getRoleStyle, committeeAvatarMap, getInitials, moveMember, openEditMember,
}) {
  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{fontSize:'20px',fontWeight:700,color:'var(--blue)',marginBottom:'4px'}}>Committee Management</h2>
          <p style={{fontSize:'13px',color:'var(--text-muted)'}}>Add, edit, or remove committees and manage their members.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddCommittee}>
          <i className="fa-solid fa-plus"></i> Add Committee
        </button>
      </div>

      {committeesLoading ? (
        <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'10px'}}></i>
          Loading committees…
        </div>
      ) : committees.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px',background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-people-group" style={{fontSize:'36px',display:'block',marginBottom:'12px',opacity:.3}}></i>
          <p style={{marginBottom:'16px'}}>No committees yet.</p>
          <button className="btn btn-primary btn-sm" onClick={openAddCommittee}><i className="fa-solid fa-plus"></i> Add First Committee</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
          {committees.map(c => (
            <div key={c.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>

              {/* Committee header */}
              <div style={{background:'linear-gradient(135deg,var(--blue),var(--blue-mid))',padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                  <div style={{width:'42px',height:'42px',background:'rgba(255,255,255,0.12)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',color:'#FFD09B'}}>
                    <i className={c.icon}></i>
                  </div>
                  <div>
                    <div style={{fontSize:'15px',fontWeight:700,color:'#fff'}}>{c.name}</div>
                    <div style={{fontSize:'10px',color:'rgba(255,255,255,0.45)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:'2px'}}>{c.abbr} · {c.category}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button
                    onClick={() => openEditCommittee(c)}
                    style={{padding:'6px 14px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                    <i className="fa-solid fa-pen"></i> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type:'committee', committeeId: c.id })}
                    style={{padding:'6px 14px',background:'rgba(220,53,69,0.25)',border:'1px solid rgba(220,53,69,0.4)',color:'#FFB3B3',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                    <i className="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>

              {/* Description */}
              {c.desc && (
                <div style={{padding:'12px 20px',background:'var(--blue-pale)',borderBottom:'1px solid var(--border)',fontSize:'13px',color:'var(--text-muted)'}}>
                  {c.desc}
                </div>
              )}

              {/* Members list */}
              <div style={{padding:'16px 20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                  <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px'}}>
                    Members ({c.members.length})
                  </span>
                  <button
                    onClick={() => openAddMember(c.id)}
                    style={{padding:'5px 12px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
                    <i className="fa-solid fa-plus"></i> Add Member
                  </button>
                </div>

                {c.members.length === 0 ? (
                  <div style={{textAlign:'center',padding:'24px',color:'var(--text-light)',fontSize:'13px',background:'var(--off-white)',borderRadius:'var(--radius-md)'}}>
                    No members yet. Click "Add Member" to get started.
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                    {c.members.map((m, idx) => {
                      const rs = getRoleStyle(m.role);
                      return (
                        <div key={idx} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'var(--radius-md)',background: idx%2===0?'var(--off-white)':'transparent',transition:'background 0.15s'}}>
                          {/* Avatar */}
                          <div style={{
                            width:'36px',height:'36px',borderRadius:'50%',flexShrink:0,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:'12px',fontWeight:700, overflow:'hidden',
                            background: (m.photo_url || committeeAvatarMap[m.name.toLowerCase().trim()]) ? 'transparent' :
                                        m.role.toLowerCase().includes('president')||m.role.toLowerCase().includes('chairman')||m.role.toLowerCase().includes('chairperson') ? 'var(--orange)' :
                                        m.role.toLowerCase().includes('vice')||m.role.toLowerCase().includes('co-')||m.role.toLowerCase().includes('secretary')||m.role.toLowerCase().includes('treasurer') ? 'var(--blue-mid)' : 'var(--blue-pale)',
                            color: m.role.toLowerCase().includes('president')||m.role.toLowerCase().includes('chairman')||m.role.toLowerCase().includes('chairperson') ? '#fff' :
                                   m.role.toLowerCase().includes('vice')||m.role.toLowerCase().includes('co-')||m.role.toLowerCase().includes('secretary')||m.role.toLowerCase().includes('treasurer') ? '#fff' : 'var(--blue)',
                            border: '1.5px solid var(--border)',
                          }}>
                            {(m.photo_url || committeeAvatarMap[m.name.toLowerCase().trim()])
                              ? <img src={m.photo_url || committeeAvatarMap[m.name.toLowerCase().trim()]} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%'}}/>
                              : getInitials(m.name)}
                          </div>

                          {/* Name & Role */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.name}</div>
                            <div style={{display:'inline-flex',alignItems:'center',padding:'1px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',marginTop:'2px',...rs}}>
                              {m.role}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                            {/* Move up */}
                            <button
                              disabled={idx===0}
                              onClick={() => moveMember(c.id, idx, -1)}
                              title="Move up"
                              style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color: idx===0?'var(--border-dark)':'var(--blue)',cursor:idx===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                              <i className="fa-solid fa-chevron-up"></i>
                            </button>
                            {/* Move down */}
                            <button
                              disabled={idx===c.members.length-1}
                              onClick={() => moveMember(c.id, idx, 1)}
                              title="Move down"
                              style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color:idx===c.members.length-1?'var(--border-dark)':'var(--blue)',cursor:idx===c.members.length-1?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                              <i className="fa-solid fa-chevron-down"></i>
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEditMember(c.id, idx, m)}
                              title="Edit member"
                              style={{width:'28px',height:'28px',borderRadius:'6px',background:'var(--blue-pale)',border:'1px solid var(--border)',color:'var(--blue)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setConfirmDelete({ type:'member', committeeId: c.id, memberIdx: idx, memberName: m.name })}
                              title="Remove member"
                              style={{width:'28px',height:'28px',borderRadius:'6px',background:'#FFF0EE',border:'1px solid #F5BDBA',color:'#C0392B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}