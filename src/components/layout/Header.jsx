import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useT } from '@/i18n';
import { ThemeToggle } from '@/components/ui/ThemeToggle.jsx';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher.jsx';
import { Logo } from '@/components/ui/Logo.jsx';

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
      'px-3 py-2 rounded-sm text-sm',
      'motion-hover',
      isActive ? 'text-accent font-medium' : 'text-content-muted hover:text-content',
    ].join(' ');

  const ToggleIcon = menuOpen ? X : Menu;

  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border">
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

        <div className="hidden md:flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <button
          type="button"
          className="md:hidden btn-ghost p-2 rounded-sm"
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
        <div className="overflow-hidden min-h-0 border-t border-border bg-surface">
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
            <div className="flex items-center gap-1 pt-3 mt-2 border-t border-border">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
