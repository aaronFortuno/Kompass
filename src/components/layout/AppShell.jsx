import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header.jsx';
import { useT } from '@/i18n';

/*
 * AppShell editorial · §17.1 ARCHITECTURE
 * Fons reader-paper + tipografia serif al body. El footer adopta el to
 * mono-caps per encaixar amb el llenguatge visual de header i peu de
 * reader. Maximitza la immersió des del moment d'entrada.
 */
export function AppShell() {
  const { t } = useT();

  return (
    <div className="min-h-screen flex flex-col bg-reader-paper text-reader-ink">
      <Header />

      <main
        id="main"
        className="flex-1 page-gutter max-w-content-list mx-auto w-full py-8 sm:py-12"
      >
        <Outlet />
      </main>

      <footer className="border-t border-reader-rule">
        <div className="page-gutter max-w-content-list mx-auto py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-reader-muted">
          {t('app.name')} · {t('app.tagline')}
        </div>
      </footer>
    </div>
  );
}
