import * as React from 'react';

export default function AdminMembershipSettingsTab({
  memSettingsLoading, memForm, setMemForm, saveMembershipSettings, memSaving,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title">Membership Plan Settings</div>
      <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>
        Configure membership pricing, validity period and membership dates. These values are used across the site.
      </p>

      {memSettingsLoading ? (
        <div style={{textAlign:'center',padding:'40px'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',color:'var(--orange)'}}></i></div>
      ) : (
        <>
          {/* Pricing section */}
          <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'20px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
              <i className="fa-solid fa-indian-rupee-sign"></i> Pricing
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Standard Membership Price (₹) *</label>
                <input className="form-input" type="number" min="0" placeholder="500"
                  value={memForm.standard_price}
                  onChange={e=>setMemForm(f=>({...f,standard_price:Number(e.target.value)}))}/>
                <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>For new members joining FIP</div>
              </div>
              <div className="form-group">
                <label className="form-label">Renewal Membership Price (₹) *</label>
                <input className="form-input" type="number" min="0" placeholder="200"
                  value={memForm.renewal_price}
                  onChange={e=>setMemForm(f=>({...f,renewal_price:Number(e.target.value)}))}/>
                <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>For existing members renewing</div>
              </div>
              <div className="form-group">
                <label className="form-label">Membership Duration</label>
                <div style={{background:'var(--blue-pale)',border:'1px solid #C0CDE8',borderRadius:'8px',padding:'10px 14px',fontSize:'12.5px',color:'var(--blue)',lineHeight:1.6}}>
                  <i className="fa-solid fa-circle-info" style={{marginRight:'6px'}}></i>
                  Every membership automatically ends on 31 March (financial year end), regardless of purchase date — not a fixed number of months. This isn't editable here since it's a policy, not a per-purchase setting.
                </div>
              </div>
            </div>
          </div>

          {/* Membership period */}
          <div style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'16px 20px',marginBottom:'20px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
              <i className="fa-solid fa-calendar"></i> Membership Year
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Membership Period Start</label>
                <input className="form-input" type="date"
                  value={memForm.membership_start_date}
                  onChange={e=>setMemForm(f=>({...f,membership_start_date:e.target.value}))}/>
                <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>e.g. 01-04-2025 (financial year start)</div>
              </div>
              <div className="form-group">
                <label className="form-label">Membership Period End</label>
                <input className="form-input" type="date"
                  value={memForm.membership_end_date}
                  onChange={e=>setMemForm(f=>({...f,membership_end_date:e.target.value}))}/>
                <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>e.g. 31-03-2026 (financial year end)</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{marginBottom:'20px'}}>
            <label className="form-label">Membership Description</label>
            <textarea className="form-textarea"
              placeholder="Describe what members get with their FIP membership…"
              value={memForm.description}
              onChange={e=>setMemForm(f=>({...f,description:e.target.value}))}
              style={{minHeight:'120px'}}/>
            <div style={{fontSize:'11px',color:'var(--text-light)',marginTop:'4px'}}>This can be shown on the membership page</div>
          </div>

          {/* Preview */}
          <div style={{background:'linear-gradient(135deg,#1A3C6E,#1B4A9E)',borderRadius:'var(--radius-lg)',padding:'20px 24px',marginBottom:'20px',color:'#fff'}}>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>Preview</div>
            <div style={{display:'flex',gap:'24px',flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>New Member</div>
                <div style={{fontSize:'28px',fontWeight:900,color:'#FFD09B'}}>₹{memForm.standard_price}<span style={{fontSize:'14px',fontWeight:400,color:'rgba(255,255,255,0.45)'}}>/yr</span></div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>Renewal</div>
                <div style={{fontSize:'28px',fontWeight:900,color:'#FFD09B'}}>₹{memForm.renewal_price}<span style={{fontSize:'14px',fontWeight:400,color:'rgba(255,255,255,0.45)'}}>/yr</span></div>
              </div>
              {memForm.membership_start_date && memForm.membership_end_date && (
                <div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginBottom:'3px'}}>Period</div>
                  <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>
                    {new Date(memForm.membership_start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}
                    {' – '}
                    {new Date(memForm.membership_end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
            <button className="btn btn-primary" onClick={saveMembershipSettings} disabled={memSaving}>
              {memSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save Settings</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}