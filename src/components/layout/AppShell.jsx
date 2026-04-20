import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header.jsx';
import { useT } from '@/i18n';

export function AppShell() {
  const { t } = useT();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-content">
      <Header />

      <main
        id="main"
        className="flex-1 page-gutter max-w-content-list mx-auto w-full py-6 sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="page-gutter max-w-content-list mx-auto py-6 text-sm text-content-muted">
          {t('app.name')} · {t('app.tagline')}
        </div>
      </footer>
    </div>
  );
}
