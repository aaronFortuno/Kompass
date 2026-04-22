import { useLocation } from 'react-router-dom';

/*
 * RouteTransition · fade-in suau entre rutes del shell.
 *
 * Wrapper del contingut servit per <Outlet />. A cada canvi de
 * pathname remunta per la `key` i aplica una classe `route-fade-in`
 * que anima opacity + translateY mínim durant `--duration-base`
 * amb `--ease-enter`. Respecta `prefers-reduced-motion` via CSS
 * (vegeu regla global a styles/index.css, que neutralitza les
 * durades d'animació a 0.01ms).
 *
 * Només s'aplica a rutes regulars del shell — no afecta el reader
 * (TopicPage), que viu fora d'<AppShell> i és un overlay propi.
 */

export function RouteTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="route-fade-in">
      {children}
    </div>
  );
}
