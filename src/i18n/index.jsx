import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ca from './ca.json';
import es from './es.json';

/*
 * i18n de la UI · §17.3 ARCHITECTURE
 * Hook propi, sense deps. `t('namespace.key', { var })` amb interpolació simple.
 * Locale persistit a localStorage.kompass.locale. Default: "ca".
 * Fallback automàtic al locale per defecte si la clau no existeix al locale actiu.
 */

const STORAGE_KEY = 'kompass.locale';
const DEFAULT_LOCALE = 'ca';
const MESSAGES = { ca, es };
const AVAILABLE_LOCALES = Object.keys(MESSAGES);

const I18nContext = createContext(null);

function readStoredLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return AVAILABLE_LOCALES.includes(raw) ? raw : DEFAULT_LOCALE;
}

function lookup(messages, path) {
  // Cerca "a.b.c" dins de l'objecte.
  const parts = path.split('.');
  let node = messages;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  );
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (!AVAILABLE_LOCALES.includes(next)) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const primary = lookup(MESSAGES[locale], key);
      if (primary !== undefined) return interpolate(primary, vars);

      const fallback = lookup(MESSAGES[DEFAULT_LOCALE], key);
      if (fallback !== undefined) {
        if (import.meta.env?.DEV) {
          // Avís durant desenvolupament per detectar claus sense traduir.
          console.warn(`[i18n] Clau "${key}" absent a "${locale}", usant "${DEFAULT_LOCALE}".`);
        }
        return interpolate(fallback, vars);
      }

      if (import.meta.env?.DEV) {
        console.warn(`[i18n] Clau "${key}" no trobada a cap locale.`);
      }
      return key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ t, locale, setLocale, availableLocales: AVAILABLE_LOCALES }),
    [t, locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT s\'ha de cridar dins de <I18nProvider>');
  return ctx;
}
