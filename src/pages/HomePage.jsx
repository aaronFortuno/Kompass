import { Link } from 'react-router-dom';
import { useT } from '@/i18n';

export function HomePage() {
  const { t } = useT();

  return (
    <div className="section-gap max-w-content-read">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-content-muted">
          {t('app.tagline')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-content">
          {t('home.welcome')}
        </h1>
        <p className="text-base sm:text-lg text-content-muted">
          {t('home.intro')}
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link to="/temes" className="btn-primary inline">
          {t('home.ctaStart')}
        </Link>
        <Link to="/rutes" className="btn-ghost inline">
          {t('home.ctaPaths')}
        </Link>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold text-content mb-2">
          {t('home.statusTitle')}
        </h2>
        <p className="text-content-muted">
          {t('home.statusScaffold')}
        </p>
      </section>
    </div>
  );
}
