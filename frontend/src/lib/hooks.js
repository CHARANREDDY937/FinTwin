import { useEffect, useState } from 'react';

/**
 * Keeps document.title in sync with the given title string.
 * Call at the top of each page component.
 */
export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title || prev;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

/**
 * useState backed by localStorage (safe against unavailable storage).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof localStorage === 'undefined') return initialValue;
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable — ignore.
    }
  }, [key, value]);

  return [value, setValue];
}