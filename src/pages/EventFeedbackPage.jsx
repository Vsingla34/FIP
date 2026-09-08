import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useApp } from '../context/AppContext.jsx';

export default function EventFeedbackPage() {
  const { showToast } = useApp();
  const [searchParams] = useSearchParams();
  const preselectEventId = searchParams.get('event');

  const [loading,  setLoading]  = useState(true);
  const [forms,    setForms]    = useState([]);
  const [selected, setSelected] = useState(null); // the chosen form row

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [answers,   setAnswers]   = useState({}); // question id -> value
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from('event_feedback_forms')
      // image_url pulled in alongside the other event fields so the picker
      // and the form banner can show the event's real flyer/promo image.
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
    setName(''); setEmail(''); setAnswers({}); setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setAnswer = (qId, value) => setAnswers(a => ({ ...a, [qId]: value }));

  const toggleCheckbox = (qId, option) => {
    setAnswers(a => {
      const cur = Array.isArray(a[qId]) ? a[qId] : [];
      const next = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option];
      return { ...a, [qId]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Please fill in your name and email.', true);
      return;
    }
    const missing = (selected.questions || [])
      .filter(q => q.required !== false)
      .filter(q => {
        const a = answers[q.id];
        return a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);
      });
    if (missing.length > 0) {
      showToast(`Please answer: ${missing[0].label}`, true);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('event_feedback_responses').insert({
      form_id:    selected.id,
      event_id:   selected.event_id,
      event_name: selected.event_name,
      full_name:  name.trim(),
      email:      email.trim(),
      answers,
    });
    setSubmitting(false);

    if (error) {
      showToast('Could not submit feedback: ' + error.message, true);
      return;
    }
    setSubmitted(true);
  };

  const renderQuestion = (q) => {
    switch (q.type) {
      case 'paragraph':
        return (
          <textarea className="form-input" rows={4} style={{resize:'none'}}
            value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} />
        );

      case 'rating':
        return (
          <div style={{display:'flex',gap:'6px'}}>
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setAnswer(q.id, n)}
                style={{
                  background:'none',border:'none',cursor:'pointer',fontSize:'36px',padding:0,
                  lineHeight:1,transition:'transform .12s',
                  color: (answers[q.id]||0) >= n ? '#F5A623' : 'var(--border-dark)',
                }}
                onMouseOver={e => e.currentTarget.style.transform='scale(1.15)'}
                onMouseOut={e => e.currentTarget.style.transform='scale(1)'}>
                <i className="fa-solid fa-star"></i>
              </button>
            ))}
            {answers[q.id] > 0 && (
              <span style={{alignSelf:'center',marginLeft:'8px',fontSize:'13px',fontWeight:700,color:'var(--blue)'}}>
                {answers[q.id]} / 5
              </span>
            )}
          </div>
        );

      case 'multiple_choice':
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {(q.options || []).map(opt => {
              const active = answers[q.id] === opt;
              return (
                <label key={opt} onClick={() => setAnswer(q.id, opt)}
                  style={{
                    display:'flex',alignItems:'center',gap:'11px',cursor:'pointer',fontSize:'14px',
                    padding:'11px 16px',borderRadius:'10px',
                    border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue-pale)' : '#fff',
                    color: active ? 'var(--blue)' : 'var(--text-main)',
                    fontWeight: active ? 700 : 500,
                    transition:'var(--t)',
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

      case 'checkboxes':
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {(q.options || []).map(opt => {
              const active = (answers[q.id]||[]).includes(opt);
              return (
                <label key={opt} onClick={() => toggleCheckbox(q.id, opt)}
                  style={{
                    display:'flex',alignItems:'center',gap:'11px',cursor:'pointer',fontSize:'14px',
                    padding:'11px 16px',borderRadius:'10px',
                    border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue-pale)' : '#fff',
                    color: active ? 'var(--blue)' : 'var(--text-main)',
                    fontWeight: active ? 700 : 500,
                    transition:'var(--t)',
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
        );

      case 'yes_no':
        return (
          <div style={{display:'flex',gap:'10px'}}>
            {['Yes','No'].map(opt => {
              const active = answers[q.id] === opt;
              return (
                <button key={opt} type="button" onClick={() => setAnswer(q.id, opt)}
                  style={{
                    flex:1,padding:'11px 24px',borderRadius:'10px',border:'1.5px solid ' + (active ? 'var(--blue)' : 'var(--border)'),
                    background: active ? 'var(--blue)' : '#fff',
                    color: active ? '#fff' : 'var(--text-main)',
                    fontWeight:700,fontSize:'14px',cursor:'pointer',transition:'var(--t)',
                  }}>
                  <i className={`fa-solid ${opt==='Yes'?'fa-check':'fa-xmark'}`} style={{marginRight:'7px'}}></i>{opt}
                </button>
              );
            })}
          </div>
        );

      default: // short_text
        return (
          <input className="form-input" type="text"
            value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} />
        );
    }
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
        <div className="container" style={{maxWidth: selected ? '640px' : '920px'}}>

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
              <div className="modal-title" style={{marginBottom:'8px',fontSize:'22px'}}>Thank you!</div>
              <p style={{fontSize:'14.5px',color:'var(--text-muted)',marginBottom:'24px'}}>
                Your feedback for <strong style={{color:'var(--blue)'}}>{selected.event_name}</strong> has been received.
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

              {/* Event flyer banner, when available — real visual context
                  instead of a plain generic form */}
              {selectedImage ? (
                <div style={{position:'relative',height:'200px',overflow:'hidden'}}>
                  <img src={selectedImage} alt={selected.event_name}
                    style={{width:'100%',height:'100%',objectFit:'cover'}}
                    onError={e => e.target.style.display='none'}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(26,60,110,0.1) 0%,rgba(26,60,110,0.85) 100%)'}}/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'20px 24px'}}>
                    <div style={{fontWeight:800,fontSize:'20px',color:'#fff',lineHeight:1.3}}>{selected.event_name}</div>
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

              <form onSubmit={handleSubmit} style={{padding:'26px 28px 28px'}}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" type="text" value={name} onChange={e=>setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
                  </div>
                </div>

                {(selected.questions || []).map((q, i) => (
                  <div className="form-group" key={q.id} style={{marginTop: i===0 ? '22px' : '20px',paddingTop: i===0 ? '20px' : 0,borderTop: i===0 ? '1px solid var(--border)' : 'none'}}>
                    <label className="form-label" style={{fontSize:'14px',marginBottom:'10px'}}>
                      {q.label}{q.required !== false && <span style={{color:'var(--orange)'}}> *</span>}
                    </label>
                    {renderQuestion(q)}
                  </div>
                ))}

                <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'24px',padding:'13px'}}
                  disabled={submitting}>
                  {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit Feedback</>}
                </button>
              </form>
            </div>
          )}

        </div>
      </section>
    </>
  );
}