import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/i18n';
import { Logo } from '@/components/ui/Logo.jsx';
import { useSettingsStore } from '@/store/useSettingsStore.js';

/*
 * Header editorial · §17.1 + §5 ARCHITECTURE
 * Logo serif a l'esquerra, navegació al centre en mode mono-caps,
 * enllaç a /settings a la dreta. El theme toggle ja NO viu al header —
 * ara només a /settings (decisió intencional).
 */

// §112: settings no és un NavLink; és un botó que obre el modal. La
// resta de nav items van a rutes com abans.
const NAV_ITEMS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/temari', key: 'nav.topics' },
  { to: '/rutes', key: 'nav.paths' },
  { to: '/progres', key: 'nav.progress' },
];

export function Header() {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const openSettings = useSettingsStore((s) => s.setSettingsOpen);

  const linkClass = ({ isActive }) =>
    [
      'px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]',
      'transition-colors duration-fast ease-standard',
      isActive
        ? 'text-reader-ink'
        : 'text-reader-muted hover:text-reader-ink-2',
    ].join(' ');


  const ToggleIcon = menuOpen ? X : Menu;

  return (
    <header className="sticky top-0 z-20 bg-reader-paper/90 backdrop-blur border-b border-reader-rule">
      <div className="page-gutter max-w-content-list mx-auto flex items-center justify-between gap-4 py-3">
        <Link to="/" className="inline-flex items-center" aria-label={t('app.name')}>
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => openSettings(true)}
            className={[
              'px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]',
              'text-reader-muted hover:text-reader-ink-2',
              'transition-colors duration-fast ease-standard',
              'inline-flex items-center gap-1.5 bg-transparent border-0',
            ].join(' ')}
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
          >
            <SettingsIcon size={14} aria-hidden="true" strokeWidth={1.75} />
            <span>{t('nav.settings')}</span>
          </button>
        </nav>

        <button
          type="button"
          className={[
            'md:hidden p-2 rounded-sm text-reader-ink-2',
            'hover:text-reader-ink transition-colors duration-fast ease-standard',
          ].join(' ')}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sr-only">
            {menuOpen ? t('common.closeMenu') : t('common.openMenu')}
          </span>
          <ToggleIcon size={22} aria-hidden="true" />
        </button>
      </div>

      {/*
        Menú mòbil animat · §17.6
        Truc: grid amb grid-template-rows 0fr → 1fr per animar l'alçada
        sense conèixer-la. El fill té overflow:hidden i min-h:0.
      */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={[
          'md:hidden grid motion-panel',
          menuOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <div className="overflow-hidden min-h-0 border-t border-reader-rule bg-reader-paper">
          <nav
            className="page-gutter max-w-content-list mx-auto py-3 flex flex-col gap-1"
            aria-label="primary-mobile"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openSettings(true);
              }}
              className={[
                'px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]',
                'text-reader-muted hover:text-reader-ink-2 text-left',
                'transition-colors duration-fast ease-standard',
                'inline-flex items-center gap-1.5 bg-transparent border-0',
              ].join(' ')}
            >
              <SettingsIcon size={14} aria-hidden="true" strokeWidth={1.75} />
              <span>{t('nav.settings')}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
