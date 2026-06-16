import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AnnounceBar() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();
  if (!visible) return null;
  return (
    <div id="announce-bar">
      <i className="fa-solid fa-bell" style={{ color: '#FFD09B', fontSize: '12px', flexShrink: 0 }}></i>
      <span><strong>GST Conclave 2026</strong> — Registrations opening soon. Be the first to know!</span>
      <span className="ann-link" onClick={() => navigate('/events')}>View Events</span>
      <button id="ann-close" onClick={() => setVisible(false)} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}