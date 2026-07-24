import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* Scrolls to top on every page navigation — prevents browser restoring
   scroll position from a previous visit to the same route */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}