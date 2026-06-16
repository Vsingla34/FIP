import { useApp } from '../context/AppContext.jsx';

export default function EventsPage() {
  const { openModal } = useApp();

  const events = [
    { date:'Jan 11, 2026', title:'Rashtrapati Bhawan Visit', desc:"Exclusive guided visit to the President's residence. RSVP by Jan 2, 7 PM with your name, designation & ID proof.", type:'Physical · Delhi', typeClass:'evt-physical', seats:'120 seats' },
    { date:'Every Sunday', title:'Chartered Walk & Talk', desc:'Morning walks at India Gate, War Memorial & Firoz Shah Road. Networking meets wellness — free for all members.', type:'Physical · Delhi', typeClass:'evt-physical', seats:'Open to all' },
    { date:'Coming Soon', title:'GST Conclave 2026', desc:"Following Le Meridien's success, the next GST Conclave brings 500+ professionals for a full-day indirect tax summit.", type:'Notify Me', typeClass:'evt-virtual', seats:'500+ capacity' },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <div className="breadcrumb">Home <i className="fa-solid fa-chevron-right"></i> <span>Events</span></div>
          <h1>Events &amp; Programmes</h1>
          <p>From Parliament visits to expert summits — FIP brings professionals together in unique ways.</p>
        </div>
      </div>
      <section className="section section-alt">
        <div className="container">
          <div className="shflex">
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2 className="section-heading">Events &amp; <span>Programmes</span></h2>
              <p className="section-sub">FIP hosts physical meet-ups, heritage visits, webinars, and multi-city summits.</p>
            </div>
          </div>
          <div className="event-grid">
            {events.map((e,i) => (
              <div className="ev-light" key={i} onClick={() => openModal('rsvp')}>
                <div className="ev-date"><i className="fa-regular fa-calendar"></i> {e.date}</div>
                <div className="ev-title">{e.title}</div>
                <div className="ev-desc">{e.desc}</div>
                <div className="ev-footer">
                  <span className={`ev-type ${e.typeClass}`}>{e.type}</span>
                  <button className="ev-rsvp-btn" onClick={ev => { ev.stopPropagation(); openModal('rsvp'); }}>RSVP</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}