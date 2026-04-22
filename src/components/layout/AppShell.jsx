import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Header } from '@/components/layout/Header.jsx';
import { RouteTransition } from '@/components/layout/RouteTransition.jsx';
import { AboutModal } from '@/components/layout/AboutModal.jsx';
import { useT } from '@/i18n';
import pkg from '../../../package.json';

/*
 * AppShell editorial · §17.1 ARCHITECTURE
 * Fons reader-paper + tipografia serif al body. El footer global
 * integra brandmark + tagline (esquerra) i versió (dreta). La
 * navegació secundària vivia abans també aquí però duplicava la del
 * header; s'ha traslladat tota al header perquè sigui l'únic punt
 * d'entrada a les seccions — més consistent (§103).
 */

const APP_VERSION = pkg.version ?? '0.0.0';

export function AppShell() {
  const { t } = useT();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-reader-paper text-reader-ink">
      <Header />

      <main
        id="main"
        className="flex-1 page-gutter max-w-content-list mx-auto w-full py-6 sm:py-10"
      >
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>

      <footer className="border-t border-reader-rule mt-10">
        <div className="page-gutter max-w-content-list mx-auto py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Esquerra: brandmark + tagline */}
          <Link
            to="/"
            className="flex items-center gap-3 text-reader-ink transition-colors duration-fast ease-standard"
            aria-label={t('app.name')}
          >
            <Compass size={20} aria-hidden="true" strokeWidth={1.5} />
            <span className="flex flex-col leading-tight">
              <span className="font-serif font-semibold text-base tracking-tight">
                {t('app.name')}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-reader-muted">
                {t('app.tagline')}
              </span>
            </span>
          </Link>

          {/* Dreta: "Qui sóc" + versió, alineats a la mateixa baseline */}
          <div className="flex items-baseline gap-4 leading-none">
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className={[
                'font-mono text-[11px] uppercase tracking-[0.16em]',
                'text-reader-ink-2 hover:text-reader-ink',
                'hover:underline underline-offset-4 decoration-reader-ink-2',
                'transition-colors duration-fast ease-standard',
                'bg-transparent p-0',
              ].join(' ')}
              aria-haspopup="dialog"
              aria-expanded={aboutOpen}
            >
              Qui sóc
            </button>
            <span
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-reader-ink-2"
              aria-label={`${t('footer.versionLabel')} ${APP_VERSION}`}
            >
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </footer>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
