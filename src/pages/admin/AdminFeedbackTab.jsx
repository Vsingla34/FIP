import * as React from 'react';

const FEEDBACK_QUESTION_TYPES = [
  { value:'short_text',     label:'Short Answer' },
  { value:'paragraph',      label:'Paragraph' },
  { value:'rating',         label:'Star Rating (1–5)' },
  { value:'multiple_choice',label:'Multiple Choice (pick one)' },
  { value:'checkboxes',     label:'Checkboxes (pick multiple)' },
  { value:'yes_no',         label:'Yes / No' },
];

export default function AdminFeedbackTab({
  tab, feedbackLoading, feedbackEvents, feedbackForms, toggleFeedbackEnabled,
  openFeedbackResponses, openFeedbackEditor,
  feedbackEditingEvent, setFeedbackEditingEvent, feedbackQSaving, feedbackQuestions,
  moveQuestion, openEditQuestion, deleteQuestion, openAddQuestion, saveFeedbackQuestions,
  feedbackQModal, setFeedbackQModal, feedbackQDraft, setFeedbackQDraft, saveQuestionDraft,
  feedbackViewingEvent, setFeedbackViewingEvent, feedbackResponses,
  downloadFeedbackExcel, feedbackRespLoading,
}) {
  return (
    <>
      {/* ═══ FEEDBACK FORMS ═══ */}
      {tab === 'feedback' && (
      <div className="admin-form-card">
        <div className="admin-form-title" style={{marginBottom:'4px'}}>Feedback Forms</div>
        <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>
          Turn on feedback for any event, then build a custom set of questions for it.
          Attendees see only the events you've enabled here.
        </p>

        {feedbackLoading ? (
          <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
            <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'10px'}}></i>
            Loading events…
          </div>
        ) : feedbackEvents.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',color:'var(--text-light)'}}>No events found.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Event</th><th>Date</th><th>Feedback</th><th>Questions</th><th>Responses</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {feedbackEvents.map(ev => {
                  const form = feedbackForms[ev.id];
                  const enabled = form?.enabled === true;
                  const qCount = form?.questions?.length || 0;
                  return (
                    <tr key={ev.id}>
                      <td style={{fontWeight:600,color:'var(--blue)'}}>{ev.title}</td>
                      <td style={{fontSize:'12px',color:'var(--text-muted)'}}>
                        {ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td>
                        <div onClick={() => toggleFeedbackEnabled(ev)}
                          style={{width:'42px',height:'22px',borderRadius:'11px',background:enabled?'var(--green)':'var(--border-dark)',position:'relative',cursor:'pointer',transition:'background .2s'}}>
                          <div style={{position:'absolute',top:'2px',left:enabled?'22px':'2px',width:'18px',height:'18px',borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                        </div>
                      </td>
                      <td style={{fontSize:'12px',color:'var(--text-muted)'}}>
                        {qCount} question{qCount !== 1 ? 's' : ''}
                      </td>
                      <td>
                        <button className="btn btn-sm" style={{background:'transparent',border:'1px solid var(--border)',fontSize:'11px',padding:'5px 10px'}}
                          onClick={() => openFeedbackResponses(ev)}>
                          <i className="fa-solid fa-inbox"></i> View
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-sm" style={{background:'var(--blue)',color:'#fff',border:'none',fontSize:'11px',padding:'5px 10px'}}
                          onClick={() => openFeedbackEditor(ev)}>
                          <i className="fa-solid fa-pen"></i> Manage Questions
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
      {/* ── Question builder modal ── */}
      {feedbackEditingEvent && (
        <div className="modal-overlay" onClick={() => !feedbackQSaving && setFeedbackEditingEvent(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:'620px'}}>
            {!feedbackQSaving && (
              <button className="modal-close" onClick={() => setFeedbackEditingEvent(null)}>&#x2715;</button>
            )}
            <div className="modal-title" style={{marginBottom:'4px'}}>Feedback Questions</div>
            <p style={{fontSize:'12.5px',color:'var(--text-muted)',marginBottom:'18px'}}>
              For <strong>{feedbackEditingEvent.title}</strong>
            </p>

            {feedbackQuestions.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px',color:'var(--text-light)',background:'var(--off-white)',borderRadius:'10px',marginBottom:'16px'}}>
                No questions yet. Add your first one below.
              </div>
            ) : (
              <div style={{marginBottom:'16px'}}>
                {feedbackQuestions.map((q, idx) => (
                  <div key={q.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'var(--off-white)',borderRadius:'8px',marginBottom:'8px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:'var(--blue)'}}>
                        {q.label} {q.required && <span style={{color:'var(--orange)'}}>*</span>}
                      </div>
                      <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                        {FEEDBACK_QUESTION_TYPES.find(t=>t.value===q.type)?.label || q.type}
                        {q.options ? ` · ${q.options.length} options` : ''}
                      </div>
                    </div>
                    <button onClick={() => moveQuestion(idx,-1)} disabled={idx===0}
                      style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:idx===0?'default':'pointer',opacity:idx===0?0.4:1}}>
                      <i className="fa-solid fa-chevron-up" style={{fontSize:'10px'}}></i>
                    </button>
                    <button onClick={() => moveQuestion(idx,1)} disabled={idx===feedbackQuestions.length-1}
                      style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:idx===feedbackQuestions.length-1?'default':'pointer',opacity:idx===feedbackQuestions.length-1?0.4:1}}>
                      <i className="fa-solid fa-chevron-down" style={{fontSize:'10px'}}></i>
                    </button>
                    <button onClick={() => openEditQuestion(idx)}
                      style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:'pointer',color:'var(--blue)'}}>
                      <i className="fa-solid fa-pen" style={{fontSize:'10px'}}></i>
                    </button>
                    <button onClick={() => deleteQuestion(idx)}
                      style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',width:'26px',height:'26px',cursor:'pointer',color:'#DC2626'}}>
                      <i className="fa-solid fa-trash" style={{fontSize:'10px'}}></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-sm" style={{background:'transparent',border:'1px dashed var(--border-dark)',width:'100%',justifyContent:'center',marginBottom:'20px'}}
              onClick={openAddQuestion}>
              <i className="fa-solid fa-plus"></i> Add Question
            </button>

            <div style={{display:'flex',gap:'10px'}}>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}}
                disabled={feedbackQSaving} onClick={saveFeedbackQuestions}>
                {feedbackQSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save Questions</>}
              </button>
              <button className="btn" style={{background:'transparent',border:'1px solid var(--border)'}}
                disabled={feedbackQSaving} onClick={() => setFeedbackEditingEvent(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/edit single question modal ── */}
      {feedbackQModal && (
        <div className="modal-overlay" onClick={() => setFeedbackQModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:'440px'}}>
            <button className="modal-close" onClick={() => setFeedbackQModal(null)}>&#x2715;</button>
            <div className="modal-title" style={{marginBottom:'16px'}}>
              {feedbackQModal.idx === null ? 'Add Question' : 'Edit Question'}
            </div>

            <div className="form-group">
              <label className="form-label">Question *</label>
              <input className="form-input" type="text" placeholder="e.g. How would you rate this event?"
                value={feedbackQDraft.label} onChange={e=>setFeedbackQDraft(f=>({...f,label:e.target.value}))}/>
            </div>

            <div className="form-group">
              <label className="form-label">Answer Type</label>
              <select className="form-select" value={feedbackQDraft.type}
                onChange={e=>setFeedbackQDraft(f=>({...f,type:e.target.value}))}>
                {FEEDBACK_QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {(feedbackQDraft.type === 'multiple_choice' || feedbackQDraft.type === 'checkboxes') && (
              <div className="form-group">
                <label className="form-label">Options <span style={{fontWeight:400,color:'var(--text-light)'}}>— comma separated, at least 2</span></label>
                <input className="form-input" type="text" placeholder="Excellent, Good, Average, Poor"
                  value={feedbackQDraft.options} onChange={e=>setFeedbackQDraft(f=>({...f,options:e.target.value}))}/>
              </div>
            )}

            <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',marginBottom:'20px',fontSize:'13px',color:'var(--text-muted)'}}>
              <input type="checkbox" checked={feedbackQDraft.required}
                onChange={e=>setFeedbackQDraft(f=>({...f,required:e.target.checked}))}/>
              Required — attendee must answer this to submit
            </label>

            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}
              disabled={!feedbackQDraft.label.trim()} onClick={saveQuestionDraft}>
              <i className="fa-solid fa-check"></i> {feedbackQModal.idx === null ? 'Add Question' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Responses viewer ── */}
      {feedbackViewingEvent && (
        <div className="modal-overlay" onClick={() => setFeedbackViewingEvent(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:'720px',maxHeight:'82vh',overflowY:'auto'}}>
            <button className="modal-close" onClick={() => setFeedbackViewingEvent(null)}>&#x2715;</button>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px',paddingRight:'30px'}}>
              <div className="modal-title" style={{marginBottom:0}}>Feedback Responses</div>
              {feedbackResponses.length > 0 && (
                <button className="btn btn-sm" style={{background:'#15803D',color:'#fff',border:'none',fontSize:'11px'}}
                  onClick={downloadFeedbackExcel}>
                  <i className="fa-solid fa-file-excel"></i> Download Excel
                </button>
              )}
            </div>
            <p style={{fontSize:'12.5px',color:'var(--text-muted)',marginBottom:'18px'}}>
              For <strong>{feedbackViewingEvent.title}</strong> · {feedbackResponses.length} response{feedbackResponses.length !== 1 ? 's' : ''}
            </p>

            {feedbackRespLoading ? (
              <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                <i className="fa-solid fa-spinner fa-spin"></i> Loading…
              </div>
            ) : feedbackResponses.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'var(--text-light)'}}>No responses yet.</div>
            ) : (
              feedbackResponses.map(r => {
                const form = feedbackForms[feedbackViewingEvent.id];
                const questions = form?.questions || [];
                return (
                  <div key={r.id} style={{border:'1px solid var(--border)',borderRadius:'10px',padding:'14px 16px',marginBottom:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:'13px',color:'var(--blue)'}}>{r.full_name || 'Anonymous'}</div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{r.email}</div>
                      </div>
                      <div style={{fontSize:'11px',color:'var(--text-light)'}}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}
                      </div>
                    </div>
                    {questions.map(q => {
                      const a = r.answers?.[q.id];
                      if (a === undefined || a === null || a === '') return null;
                      return (
                        <div key={q.id} style={{fontSize:'12.5px',marginBottom:'4px'}}>
                          <span style={{color:'var(--text-muted)'}}>{q.label}: </span>
                          <span style={{fontWeight:600,color:'var(--blue)'}}>{Array.isArray(a) ? a.join(', ') : String(a)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}