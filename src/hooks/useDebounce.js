// Debounce hook — returns debounced value after `delay` ms
// Also triggers after every `wordCount` words typed
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 1500, wordCount = 3) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Fire immediately if user has typed N+ words (space-separated)
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length >= wordCount) {
      setDebounced(value);
      return;
    }
    // Otherwise wait for delay
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, wordCount]);

  return debounced;
}