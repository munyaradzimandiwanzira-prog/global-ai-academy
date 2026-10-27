import { useCallback, useEffect, useState } from 'react';
import { storage } from './utils';

type Theme = 'light' | 'dark';
const pref = storage<Theme | null>('gaa:theme', null);

function initial(): Theme {
  const saved = pref.get();
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme = initial()) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      pref.set(next);
      return next;
    });
  }, []);
  return { theme, toggle };
}
