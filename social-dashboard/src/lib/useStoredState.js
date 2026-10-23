import { useEffect, useState } from 'react';

// useState that survives a page reload. Falls back to plain state if the
// browser blocks storage (private windows, etc.).
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable; the app still works for this session.
    }
  }, [key, value]);

  return [value, setValue];
}

export function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
