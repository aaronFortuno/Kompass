import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useT } from '@/i18n';
import { Logo } from '@/components/ui/Logo.jsx';

/*
 * Header editorial · §17.1 + §5 ARCHITECTURE
 * Logo serif a l'esquerra, navegació al centre en mode mono-caps,
 * enllaç a /settings a la dreta. El theme toggle ja NO viu al header —
 * ara només a /settings (decisió intencional).
 */

const NAV_ITEMS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/temari', key: 'nav.topics' },
  { to: '/rutes', key: 'nav.paths' },
  { to: '/progres', key: 'nav.progress' },
  { to: '/settings', key: 'nav.settings' },
];

export function Header() {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

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
        </nav>

        {/* La icona circular de Settings s'ha mogut al footer global
            per coherència visual — tot el header és quadrat/editorial
            i l'icona gear desentonava. Vegeu AppShell footer. §103 polit. */}

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
            <NavLink
              to="/settings"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.settings')}
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
