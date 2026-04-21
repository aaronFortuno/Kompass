import { useEffect } from 'react';
import { useSettingsStore, applySettingsToDOM } from '@/store/useSettingsStore';

/*
 * Bridge de tema · ARCHITECTURE §17.2 + §17.8
 *
 * Ara el tema viu dins l'store unificat de settings (kompass.settings).
 * Aquest mòdul conserva els exports `ThemeProvider`, `useTheme` i els
 * ganxos utilitzats a la resta del codi, però deriva tot del store.
 *
 * ThemeProvider ara només sincronitza l'estat del store amb el DOM
 * (data-theme, classe .dark, --kf-type-scale). No manté cap estat propi.
 *
 * First-visit: si no hi ha settings persistits, el hydrate del store
 * retorna els DEFAULT_SETTINGS; l'única derivació que encara fem del
 * sistema és, si no hi havia la clau històrica `kompass.theme`, llegir-ne
 * el valor una vegada per preservar la preferència dels usuaris existents.
 */

const LEGACY_THEME_KEY = 'kompass.theme';

function systemInitial() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function migrateLegacyThemeOnce() {
  if (typeof window === 'undefined') return;
  try {
    const storeRaw = window.localStorage.getItem('kompass.settings');
    if (storeRaw) return; // ja hi ha settings, no migrem
    const legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
    const pref = legacy === 'dark' || legacy === 'light' ? legacy : systemInitial();
    useSettingsStore.getState().setTheme(pref);
  } catch {
    /* storage indisponible: defaults */
  }
}

export function ThemeProvider({ children }) {
  const theme = useSettingsStore((s) => s.theme);
  const textScale = useSettingsStore((s) => s.textScale);

  useEffect(() => {
    migrateLegacyThemeOnce();
  }, []);

  useEffect(() => {
    applySettingsToDOM({ theme, textScale });
  }, [theme, textScale]);

  return children;
}

/*
 * Compatibilitat amb consumidors existents (ThemeToggle, etc).
 * Expose `preference`, `setPreference`, `toggle` — la mateixa interfície
 * del provider antic, però ara deriva del settings store.
 */
export function useTheme() {
  const preference = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setPreference = (next) => {
    if (next === 'light' || next === 'dark') setTheme(next);
  };
  const toggle = () => setTheme(preference === 'dark' ? 'light' : 'dark');
  return { preference, setPreference, toggle };
}
