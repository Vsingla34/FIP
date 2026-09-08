import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useApp } from '../context/AppContext.jsx';

const PAGE_SIZE = 5; // questions per page, per request

export default function EventFeedbackPage() {
  const { showToast } = useApp();
  const [searchParams] = useSearchParams();
  const preselectEventId = searchParams.get('event');

  const [loading,  setLoading]  = useState(true);
  const [forms,    setForms]    = useState([]);
  const [selected, setSelected] = useState(null);

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [answers,   setAnswers]   = useState({});   // question id -> value
  const [otherText, setOtherText] = useState({});   // question id -> free-text for "Other"
  const [page,       setPage]       = useState(0);
  const [errorQId,   setErrorQId]   = useState(null); // first unanswered required question, for highlight + scroll
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);

  const qRefs = useRef({}); // question id -> DOM node, for scroll-into-view on validation failure

  useEffect(() => {
    supabase.from('event_feedback_forms')
      .select('*, events(event_date, event_type, city, image_url)')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data || []).filter(f => (f.questions || []).length > 0);
        setForms(list);
        setLoading(false);
        if (preselectEventId) {
          const match = list.find(f => f.event_id === preselectEventId);
          if (match) selectForm(match);
        }
      });
  }, []);

  const selectForm = (form) => {
    setSelected(form);
    setName(''); setEmail(''); setAnswers({}); setOtherText({});
    setPage(0); setErrorQId(null); setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const questions = selected?.questions || [];
  const pages = [];
  for (let i = 0; i < questions.length; i += PAGE_SIZE) pages.push(questions.slice(i, i + PAGE_SIZE));
  const totalPages = Math.max(1, pages.length);
  const pctComplete = Math.round(((page + 1) / totalPages) * 100);

  const setAnswer = (qId, value) => setAnswers(a => ({ ...a, [qId]: value }));

  const toggleCheckbox = (q, option) => {
    setAnswers(a => {
      const cur = Array.isArray(a[q.id]) ? a[q.id] : [];

      // An "exclusive" option (e.g. "I do not require further support") —
      // selecting it clears everything else; selecting anything else clears it.
      if (q.exclusiveOption) {
        if (option === q.exclusiveOption) {
          return { ...a, [q.id]: cur.includes(option) ? [] : [option] };
        }
        const withoutExclusive = cur.filter(o => o !== q.exclusiveOption);
        const next = withoutExclusive.includes(option)
          ? withoutExclusive.filter(o => o !== option)
          : [...withoutExclusive, option];
        return { ...a, [q.id]: next };
      }

      // Capped multi-select (e.g. "select up to 3") — silently ignore
      // attempts to add a 4th once the cap is reached.
      if (q.maxSelections && !cur.includes(option) && cur.length >= q.maxSelections) {
        return a;
      }

      const next = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option];
      return { ...a, [q.id]: next };
    });
  };

  const isAnswered = (q) => {
    const a = answers[q.id];
    if (Array.isArray(a)) return a.length > 0;
    return a !== undefined && a !== null && a !== '';
  };

  const goNext = () => {
    // Per spec: Continue always works, even if the current page isn't fully
    // answered. Validation only happens at final Submit.
    if (page < totalPages - 1) { setPage(p => p + 1); window.scrollTo({top:0,behavior:'smooth'}); }
  };
  const goBack = () => {
    if (page > 0) { setPage(p => p - 1); window.scrollTo({top:0,behavior:'smooth'}); }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      showToast('Please fill in your name and email.', true);
      return;
    }

    // Find the first unanswered REQUIRED question, across ALL pages — not
    // just the current one, since Continue never blocked earlier pages.
    const missingIdx = questions.findIndex(q => q.required !== false && !isAnswered(q));
    if (missingIdx !== -1) {
      const missingQ = questions[missingIdx];
      const targetPage = Math.floor(missingIdx / PAGE_SIZE);
      setErrorQId(missingQ.id);
      setPage(targetPage);
      showToast('Please answer this question before submitting.', true);
      // Wait for the page change to render, then scroll to the actual field.
      setTimeout(() => {
        qRefs.current[missingQ.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      return;
    }

    setSubmitting(true);
    const finalAnswers = { ...answers };
    Object.keys(otherText).forEach(qId => {
      if (otherText[qId]?.trim()) finalAnswers[`${qId}_other`] = otherText[qId].trim();
    });

    const { error } = await supabase.from('event_feedback_responses').insert({
      form_id:    selected.id,
      event_id:   selected.event_id,
      event_name: selected.event_name,
      full_name:  name.trim(),
      email:      email.trim(),
      answers:    finalAnswers,
    });
    setSubmitting(false);

    if (error) {
      // Preserve everything the participant already entered — never clear
      // answers on a failed submission.
      showToast('Could not submit feedback — please try again. Your answers are still here.', true);
      return;
    }
    setSubmitted(true);
  };

  const hasOtherSelected = (q) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.includes('Other') : a === 'Other';
  };

  const renderQuestion = (q) => {
    const isError = errorQId === q.id;
    const errorStyle = isError ? { border: '2px solid #DC2626', borderRadius: '10px', padding: '10px' } : {};

    let body;
    switch (q.type) {
      case 'paragraph':
        body = (
          <textarea className="form-input" rows={4} maxLength={q.maxLength || 2500} style={{resize:'none'}}
            value={answers[q.id] || ''} onChange={e => { setAnswer(q.id, e.target.value); setErrorQId(null); }} />
        );
        break;

      case 'rating': {
        const scale = q.scale || 5;
        const useStars = scale <= 5;
        body = (
          <div>
            <div style={{display:'flex',gap: useStars ? '6px' : '5px',flexWrap:'wrap'}}>
              {Array.from({length:scale}, (_,i)=>i+1).map(n => {
                const active = (answers[q.id]||0) >= n;
                return useStars ? (
                  <button key={n} type="button" onClick={() => { setAnswer(q.id, n); setErrorQId(null); }}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'36px',padding:0,lineHeight:1,
                            color: active ? '#F5A623' : 'var(--border-dark)',transition:'transform .12s'}}
                    onMouseOver={e => e.currentTarget.style.transform='scale(1.15)'}
                    onMouseOut={e => e.currentTarget.style.transform='scale(1)'}>
                    <i className="fa-solid fa-star"></i>
                  </button>
                ) : (
                  <button key={n} type="button" onClick={() => { setAnswer(q.id, n); setErrorQId(null); }}
                    style={{
                      width:'38px',height:'38px',borderRadius:'8px',fontWeight:700,fontSize:'14px',cursor:'pointer',
                      border:'1.5px solid ' + (answers[q.id]===n ? 'var(--blue)' : 'var(--border)'),
                      background: answers[q.id]===n ? 'var(--blue)' : '#fff',
                      color: answers[q.id]===n ? '#fff' : 'var(--text-main)',
                      transition:'var(--t)',
                    }}>
                    {n}
                  </button>
                );
              })}
            </div>
            {q.scaleLabels && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-light)',marginTop:'6px'}}>
                <span>{q.scaleLabels.low}</span>
                <span>{q.scaleLabels.high}</span>
              </div>
            )}
          </div>
        );
        break;
      }

      case 'card_choice':
        body = (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {(q.options || []).map(opt => {
              const active = answers[q.id] === opt.value;
              return (
                <div key={opt.value} onClick={() => { setAnswer(q.id, opt.value); setErrorQId(null); }}
                  style={{
                    cursor:'pointer',padding:'16px 18px',borderRadius:'12px',
                    border:'2px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue-pale)' : '#fff',
                    transition:'var(--t)',
                  }}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
                    <span style={{
                      width:'20px',height:'20px',borderRadius:'50%',flexShrink:0,marginTop:'2px',
                      border:'2px solid ' + (active ? 'var(--blue)' : 'var(--border-dark)'),
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}>
                      {active && <span style={{width:'10px',height:'10px',borderRadius:'50%',background:'var(--blue)'}}/>}
                    </span>
                    <div>
                      <div style={{fontWeight:700,fontSize:'14.5px',color: active ? 'var(--blue)' : 'var(--text-main)'}}>{opt.value}</div>
                      {opt.description && <div style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'4px',lineHeight:1.5}}>{opt.description}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
        break;

      case 'multiple_choice':
        body = (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {(q.options || []).map(opt => {
              const active = answers[q.id] === opt;
              return (
                <label key={opt} onClick={() => { setAnswer(q.id, opt); setErrorQId(null); }}
                  style={{
                    display:'flex',alignItems:'center',gap:'11px',cursor:'pointer',fontSize:'14px',
                    padding:'11px 16px',borderRadius:'10px',
                    border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue-pale)' : '#fff',
                    color: active ? 'var(--blue)' : 'var(--text-main)',
                    fontWeight: active ? 700 : 500,transition:'var(--t)',
                  }}>
                  <span style={{
                    width:'18px',height:'18px',borderRadius:'50%',flexShrink:0,
                    border:'2px solid ' + (active ? 'var(--blue)' : 'var(--border-dark)'),
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    {active && <span style={{width:'9px',height:'9px',borderRadius:'50%',background:'var(--blue)'}}/>}
                  </span>
                  {opt}
                </label>
              );
            })}
          </div>
        );
        break;

      case 'checkboxes': {
        const cur = answers[q.id] || [];
        body = (
          <div>
            {q.maxSelections && (
              <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'8px',fontWeight:600}}>
                {cur.filter(o=>o!==q.exclusiveOption).length} of {q.maxSelections} selected
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {(q.options || []).map(opt => {
                const active = cur.includes(opt);
                const disabled = q.maxSelections && !active && cur.length >= q.maxSelections && opt !== q.exclusiveOption;
                return (
                  <label key={opt} onClick={() => { if (!disabled) { toggleCheckbox(q, opt); setErrorQId(null); } }}
                    style={{
                      display:'flex',alignItems:'center',gap:'11px',cursor: disabled ? 'not-allowed' : 'pointer',fontSize:'14px',
                      padding:'11px 16px',borderRadius:'10px',
                      border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                      background: active ? 'var(--blue-pale)' : (disabled ? '#F7F7F7' : '#fff'),
                      color: active ? 'var(--blue)' : (disabled ? 'var(--text-light)' : 'var(--text-main)'),
                      fontWeight: active ? 700 : 500,transition:'var(--t)',opacity: disabled ? 0.6 : 1,
                    }}>
                    <span style={{
                      width:'18px',height:'18px',borderRadius:'5px',flexShrink:0,
                      border:'2px solid ' + (active ? 'var(--blue)' : 'var(--border-dark)'),
                      background: active ? 'var(--blue)' : '#fff',
                      display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',
                    }}>
                      {active && <i className="fa-solid fa-check"></i>}
                    </span>
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        );
        break;
      }

      case 'yes_no':
        body = (
          <div style={{display:'flex',gap:'10px'}}>
            {['Yes','No'].map(opt => {
              const active = answers[q.id] === opt;
              return (
                <button key={opt} type="button" onClick={() => { setAnswer(q.id, opt); setErrorQId(null); }}
                  style={{
                    flex:1,padding:'11px 24px',borderRadius:'10px',border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue)' : '#fff',color: active ? '#fff' : 'var(--text-main)',
                    fontWeight:700,fontSize:'14px',cursor:'pointer',transition:'var(--t)',
                  }}>
                  <i className={`fa-solid ${opt==='Yes'?'fa-check':'fa-xmark'}`} style={{marginRight:'7px'}}></i>{opt}
                </button>
              );
            })}
          </div>
        );
        break;

      default: // short_text
        body = (
          <input className="form-input" type="text"
            value={answers[q.id] || ''} onChange={e => { setAnswer(q.id, e.target.value); setErrorQId(null); }} />
        );
    }

    return (
      <div ref={el => qRefs.current[q.id] = el} style={errorStyle}>
        {body}
        {hasOtherSelected(q) && (
          <input className="form-input" type="text" placeholder="Please specify…" style={{marginTop:'10px'}}
            value={otherText[q.id] || ''} onChange={e => setOtherText(t => ({ ...t, [q.id]: e.target.value }))} />
        )}
        {isError && (
          <div style={{color:'#DC2626',fontSize:'12px',fontWeight:600,marginTop:'8px'}}>
            <i className="fa-solid fa-circle-exclamation" style={{marginRight:'5px'}}></i>
            Please answer this question before submitting.
          </div>
        )}
      </div>
    );
  };

  const selectedImage = selected?.events?.image_url;

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Feedback</span></div>
          <h1>Event Feedback</h1>
          <p>Help us improve — share your thoughts on an event you attended.</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{maxWidth: selected ? '680px' : '920px'}}>

          {loading ? (
            <div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-muted)'}}>
              <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'26px',display:'block',marginBottom:'12px'}}></i>
              Loading events…
            </div>

          ) : submitted ? (
            <div style={{textAlign:'center',padding:'56px 24px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-sm)'}}>
              <div style={{width:'76px',height:'76px',borderRadius:'50%',background:'var(--green-pale)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'30px',color:'var(--green)'}}>
                <i className="fa-solid fa-check"></i>
              </div>
              <div className="modal-title" style={{marginBottom:'8px',fontSize:'22px'}}>Thank You for Your Honest Feedback</div>
              <p style={{fontSize:'14.5px',color:'var(--text-muted)',marginBottom:'24px',lineHeight:1.7}}>
                Your response has been securely received. Your insights will help FIP create more practical,
                meaningful and globally relevant opportunities for Indian professionals.
              </p>
              <button className="btn btn-outline-blue btn-sm" onClick={() => setSelected(null)}>
                Give feedback for another event
              </button>
            </div>

          ) : !selected ? (
            forms.length === 0 ? (
              <div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-light)'}}>
                <i className="fa-solid fa-comment-slash" style={{fontSize:'32px',display:'block',marginBottom:'14px',opacity:.4}}></i>
                No feedback forms are open right now.<br/>Check back after your next event.
              </div>
            ) : (
              <>
                <p style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'22px',textAlign:'center'}}>
                  Select the event you'd like to give feedback on
                </p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'22px'}}>
                  {forms.map(f => (
                    <div key={f.id} className="ev-card" style={{cursor:'pointer'}} onClick={() => selectForm(f)}>
                      {f.events?.image_url ? (
                        <div className="ev-card-banner">
                          <img src={f.events.image_url} alt={f.event_name}
                            onError={e => e.target.closest('.ev-card-banner').style.display='none'}/>
                        </div>
                      ) : <div className="ev-card-accent"/>}
                      <div className="ev-card-body">
                        {f.events?.event_date && (
                          <div style={{fontSize:'11.5px',fontWeight:700,color:'var(--orange)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:'6px'}}>
                            {new Date(f.events.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                          </div>
                        )}
                        <div style={{fontWeight:800,fontSize:'16px',color:'var(--blue)',lineHeight:1.35,marginBottom:'12px'}}>
                          {f.event_name}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',fontWeight:700,color:'var(--orange)'}}>
                          Give Feedback <i className="fa-solid fa-arrow-right" style={{fontSize:'11px'}}></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )

          ) : (
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>

              {selectedImage ? (
                <div style={{position:'relative',height:'190px',overflow:'hidden'}}>
                  <img src={selectedImage} alt={selected.event_name}
                    style={{width:'100%',height:'100%',objectFit:'cover'}}
                    onError={e => e.target.style.display='none'}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(26,60,110,0.1) 0%,rgba(26,60,110,0.9) 100%)'}}/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'18px 24px'}}>
                    <div style={{fontWeight:800,fontSize:'19px',color:'#fff',lineHeight:1.3}}>{selected.event_name}</div>
                  </div>
                  <button type="button" onClick={() => setSelected(null)}
                    style={{position:'absolute',top:'14px',left:'14px',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',fontWeight:700,color:'var(--blue)',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                </div>
              ) : (
                <div style={{padding:'22px 28px 0'}}>
                  <button type="button" onClick={() => setSelected(null)}
                    style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'12px',marginBottom:'12px',padding:0,display:'flex',alignItems:'center',gap:'6px'}}>
                    <i className="fa-solid fa-arrow-left"></i> Choose a different event
                  </button>
                  <div className="modal-title" style={{fontSize:'20px'}}>{selected.event_name}</div>
                </div>
              )}

              {/* Progress bar — page number + percentage, per spec */}
              {questions.length > 0 && (
                <div style={{padding:'16px 28px 0'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'6px'}}>
                    <span>Page {page+1} of {totalPages}</span>
                    <span>{pctComplete}% complete</span>
                  </div>
                  <div style={{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pctComplete}%`,background:'var(--orange)',transition:'width .3s'}}/>
                  </div>
                </div>
              )}

              <div style={{padding:'22px 28px 28px'}}>
                {/* Participant details only show on the first page */}
                {page === 0 && (
                  <div className="form-row" style={{marginBottom:'22px',paddingBottom:'20px',borderBottom: questions.length ? '1px solid var(--border)' : 'none'}}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-input" type="text" value={name} onChange={e=>setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                  </div>
                )}

                {(pages[page] || []).map((q, i) => (
                  <div className="form-group" key={q.id} style={{marginBottom:'20px'}}>
                    <label className="form-label" style={{fontSize:'14px',marginBottom:'10px'}}>
                      {q.label}{q.required !== false && <span style={{color:'var(--orange)'}}> *</span>}
                    </label>
                    {renderQuestion(q)}
                  </div>
                ))}

                <div style={{display:'flex',gap:'10px',marginTop:'26px'}}>
                  {page > 0 && (
                    <button type="button" className="btn btn-outline-blue" style={{flex:1,justifyContent:'center'}} onClick={goBack}>
                      <i className="fa-solid fa-arrow-left"></i> Back
                    </button>
                  )}
                  {page < totalPages - 1 ? (
                    <button type="button" className="btn btn-primary" style={{flex:2,justifyContent:'center'}} onClick={goNext}>
                      Continue <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" style={{flex:2,justifyContent:'center',padding:'13px'}}
                      disabled={submitting} onClick={handleSubmit}>
                      {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Securely submitting your feedback…</> : <><i className="fa-solid fa-paper-plane"></i> Submit Confidential Feedback</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </>
  );
}