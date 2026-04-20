import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/*
 * Tema clar/fosc · §17.2 ARCHITECTURE
 * Només "light" | "dark". First-visit llegeix prefers-color-scheme una
 * vegada per fixar el default i el persisteix. Després, sempre user-driven.
 */

const STORAGE_KEY = 'kompass.theme';
const VALID_PREFS = ['light', 'dark'];

const ThemeContext = createContext(null);

function systemInitial() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function readInitialPreference() {
  if (typeof window === 'undefined') return 'light';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (VALID_PREFS.includes(raw)) return raw;
  const initial = systemInitial();
  window.localStorage.setItem(STORAGE_KEY, initial);
  return initial;
}

function applyDomClass(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readInitialPreference);

  useEffect(() => {
    applyDomClass(preference === 'dark');
  }, [preference]);

  const setPreference = useCallback((next) => {
    if (!VALID_PREFS.includes(next)) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, setPreference, toggle }),
    [preference, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme s\'ha de cridar dins de <ThemeProvider>');
  return ctx;
}
