import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function AnnounceBar() {
  const [visible, setVisible]   = useState(false);
  const [config,  setConfig]    = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'announce_bar')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.is_active) {
          setConfig(data.value);
          setVisible(true);
        }
      });
  }, []);

  if (!visible || !config) return null;

  const handleClick = () => {
    if (!config.link_url) return;
    if (config.link_url.startsWith('http')) window.open(config.link_url, '_blank');
    else navigate(config.link_url);
  };

  return (
    <div id="announce-bar">
      <i className="fa-solid fa-bell" style={{ color: '#FFD09B', fontSize: '12px', flexShrink: 0 }}></i>
      <span dangerouslySetInnerHTML={{ __html: config.text || '' }} />
      {config.link_label && (
        <span className="ann-link" onClick={handleClick}>
          {config.link_label}
        </span>
      )}
      <button id="ann-close" onClick={() => setVisible(false)} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}