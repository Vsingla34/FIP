import * as React from 'react';

export default function AdminContactsTab({
  contactFilter, setContactFilter, contacts, setContacts, contactsLoading,
  replyingToId, setReplyingToId, replyText, setReplyText, replySending, setReplySending,
  profile, supabase, showToast, markContactStatus,
}) {
  return (
    <div className="admin-form-card">
      <div className="admin-form-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
        <span>Contact Messages</span>
        <div style={{display:'flex',gap:'6px'}}>
          {['unread','read','replied'].map(f => (
            <button key={f} onClick={() => setContactFilter(f)}
              style={{padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1.5px solid',
                background: contactFilter===f ? (f==='unread'?'var(--blue)':f==='replied'?'var(--green)':'var(--text-muted)') : 'transparent',
                color: contactFilter===f ? '#fff' : 'var(--text-muted)',
                borderColor: contactFilter===f ? (f==='unread'?'var(--blue)':f==='replied'?'var(--green)':'var(--text-muted)') : 'var(--border)',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
              <span style={{marginLeft:'5px',background:'rgba(0,0,0,0.1)',padding:'1px 6px',borderRadius:'10px'}}>
                {contacts.filter(c=>c.status===f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {contactsLoading ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-spinner fa-spin" style={{fontSize:'24px',display:'block',marginBottom:'8px'}}></i>Loading…
        </div>
      ) : contacts.filter(c=>c.status===contactFilter).length === 0 ? (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
          <i className="fa-solid fa-envelope" style={{fontSize:'32px',display:'block',marginBottom:'8px',opacity:.3}}></i>
          No {contactFilter} messages.
        </div>
      ) : contacts.filter(c=>c.status===contactFilter).map(msg => (
        <div key={msg.id} style={{background:'var(--off-white)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'20px',marginBottom:'14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',marginBottom:'12px',flexWrap:'wrap'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                <span style={{fontSize:'15px',fontWeight:700,color:'var(--blue)'}}>{msg.name}</span>
                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',fontWeight:600,
                  background:msg.status==='unread'?'rgba(26,60,110,0.1)':msg.status==='replied'?'var(--green-pale)':'var(--off-white)',
                  color:msg.status==='unread'?'var(--blue)':msg.status==='replied'?'var(--green)':'var(--text-muted)',
                  border:`1px solid ${msg.status==='unread'?'#C0CDE8':msg.status==='replied'?'#9ADDC3':'var(--border)'}`,
                }}>
                  {msg.status.charAt(0).toUpperCase()+msg.status.slice(1)}
                </span>
              </div>
              <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                <a href={`mailto:${msg.email}`} style={{color:'var(--orange)',fontWeight:600,textDecoration:'none'}}>{msg.email}</a>
                {msg.phone && <span><i className="fa-solid fa-phone" style={{marginRight:'3px'}}></i>{msg.phone}</span>}
                <span>{new Date(msg.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              {msg.subject && <div style={{marginTop:'4px',fontSize:'12px',fontWeight:600,color:'var(--blue-mid)'}}>{msg.subject}</div>}
            </div>
            <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap'}}>
              {/* Inline reply form */}
              {replyingToId === msg.id ? (
                <div style={{marginTop:'12px',background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'var(--blue)',marginBottom:'8px'}}>
                    <i className="fa-solid fa-reply" style={{marginRight:'6px',color:'var(--orange)'}}></i>
                    Replying to {msg.name}
                  </div>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Type your reply here…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    style={{resize:'vertical',marginBottom:'10px'}}
                    autoFocus
                  />
                  <div style={{display:'flex',gap:'8px'}}>
                    <button className="btn btn-primary btn-sm" disabled={!replyText.trim() || replySending}
                      onClick={async () => {
                        if (!replyText.trim()) return;
                        setReplySending(true);
                        // Save reply to contact_messages
                        await supabase.from('contact_messages').update({
                          reply_text:  replyText.trim(),
                          replied_at:  new Date().toISOString(),
                          replied_by:  profile?.id,
                          status:      'replied',
                        }).eq('id', msg.id);
                        // Create notification for the user (if they have an account)
                        if (msg.user_id) {
                          await supabase.from('notifications').insert({
                            user_id:  msg.user_id,
                            type:     'contact_reply',
                            title:    'FIP replied to your message',
                            message:  replyText.trim(),
                            link:     '/dashboard?tab=messages',
                            meta:     { contact_message_id: msg.id, subject: msg.subject, original: msg.message },
                          });
                        }
                        // Send reply email
                        try {
                          const emailRes = await fetch('/api/send-contact-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type:     'reply',
                              to:       msg.email || '',
                              name:     msg.name  || 'Member',
                              subject:  `Re: ${msg.subject || 'Your FIP Enquiry'}`,
                              message:  replyText.trim(),
                              original: msg.message || '',
                            }),
                          });
                          if (!emailRes.ok) {
                            const err = await emailRes.json().catch(() => ({}));
                            console.warn('Reply email failed:', err);
                          }
                        } catch (e) { console.warn('Reply email error:', e.message); }
                        setContacts(prev => prev.map(c => c.id === msg.id ? { ...c, status:'replied', reply_text: replyText.trim() } : c));
                        setReplyingToId(null); setReplyText(''); setReplySending(false);
                        showToast('Reply sent!');
                      }}>
                      {replySending ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending…</> : <><i className="fa-solid fa-paper-plane"></i> Send Reply</>}
                    </button>
                    <button className="btn btn-outline-blue btn-sm" onClick={() => { setReplyingToId(null); setReplyText(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
                  <button className="admin-btn" style={{background:'var(--blue)',color:'#fff',border:'none'}}
                    onClick={() => { setReplyingToId(msg.id); setReplyText(''); }}>
                    <i className="fa-solid fa-reply"></i> {msg.reply_text ? 'Edit Reply' : 'Reply'}
                  </button>
                  {msg.status === 'unread' && (
                    <button className="admin-btn" style={{background:'var(--off-white)',color:'var(--text-muted)',border:'1px solid var(--border)'}}
                      onClick={() => markContactStatus(msg.id,'read')}>
                      <i className="fa-solid fa-check"></i> Mark Read
                    </button>
                  )}
                </div>
              )}
              {/* Show existing reply */}
              {msg.reply_text && replyingToId !== msg.id && (
                <div style={{marginTop:'10px',background:'var(--green-pale)',border:'1px solid #9ADDC3',borderRadius:'8px',padding:'12px 14px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--green)',marginBottom:'4px'}}>
                    <i className="fa-solid fa-check-circle" style={{marginRight:'5px'}}></i>
                    Reply sent {msg.replied_at ? new Date(msg.replied_at).toLocaleDateString('en-IN') : ''}
                  </div>
                  <div style={{fontSize:'13px',color:'#166534',whiteSpace:'pre-wrap'}}>{msg.reply_text}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'14px 16px',fontSize:'14px',color:'var(--text-muted)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
            {msg.message}
          </div>
        </div>
      ))}
    </div>
  );
}