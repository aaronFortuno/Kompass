import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useT } from '@/i18n';
import { ThemeToggle } from '@/components/ui/ThemeToggle.jsx';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher.jsx';

const NAV_ITEMS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/temes', key: 'nav.topics' },
  { to: '/rutes', key: 'nav.paths' },
  { to: '/progres', key: 'nav.progress' },
];

export function Header() {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    [
      'inline px-3 py-2 rounded-sm text-sm transition-colors',
      isActive
        ? 'text-accent font-medium'
        : 'text-content-muted hover:text-content',
    ].join(' ');

  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border">
      <div className="page-gutter max-w-content-list mx-auto flex items-center justify-between gap-4 py-3">
        <Link to="/" className="inline font-semibold text-content">
          {t('app.name')}
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <button
          type="button"
          className="md:hidden btn-ghost"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sr-only">
            {menuOpen ? t('common.closeMenu') : t('common.openMenu')}
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-border bg-surface"
        >
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
            <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-border">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
