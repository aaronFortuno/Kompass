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
 * "light" | "dark" | "system" persistit a localStorage.kompass.theme.
 * Quan el valor efectiu és "dark", afegim la classe "dark" a <html>.
 */

const STORAGE_KEY = 'kompass.theme';
const VALID_PREFS = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

function readStoredPreference() {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return VALID_PREFS.includes(raw) ? raw : 'system';
}

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDomClass(isDark) {
  const el = document.documentElement;
  el.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Escolta canvis en la preferència del sistema per reaccionar quan el mode és "system".
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effective = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // Sincronitza amb el DOM cada cop que canvia.
  useEffect(() => {
    applyDomClass(effective === 'dark');
  }, [effective]);

  const setPreference = useCallback((next) => {
    if (!VALID_PREFS.includes(next)) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, effective, setPreference }),
    [preference, effective, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme s\'ha de cridar dins de <ThemeProvider>');
  return ctx;
}
