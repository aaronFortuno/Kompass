import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useT } from '@/i18n';

export function HomePage() {
  const { t } = useT();

  return (
    <div className="section-gap max-w-content-read">
      <header className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
          {t('app.tagline')}
        </p>
        <h1 className="font-serif font-medium text-4xl sm:text-5xl tracking-tight text-reader-ink">
          {t('home.welcome')}
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-reader-ink-2 max-w-prose leading-relaxed">
          {t('home.intro')}
        </p>
      </header>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          to="/temari"
          className={[
            'inline-flex items-center gap-2 px-5 py-3 rounded-none',
            'bg-reader-ink text-reader-paper',
            'font-mono text-[11px] uppercase tracking-[0.14em]',
            'hover:bg-reader-ink-2 transition-colors duration-fast ease-standard',
          ].join(' ')}
        >
          {t('home.ctaStart')}
          <ArrowRight size={14} aria-hidden="true" strokeWidth={2} />
        </Link>
        <Link
          to="/rutes"
          className={[
            'inline-flex items-center gap-2 px-5 py-3 rounded-none',
            'border border-reader-ink text-reader-ink',
            'font-mono text-[11px] uppercase tracking-[0.14em]',
            'hover:bg-reader-ink hover:text-reader-paper',
            'transition-colors duration-fast ease-standard',
          ].join(' ')}
        >
          {t('home.ctaPaths')}
        </Link>
      </div>

      <section className="mt-12 pt-8 border-t border-reader-rule">
        <div className="flex items-start gap-4">
          <BookOpen size={22} className="text-reader-ink-2 mt-1" aria-hidden="true" />
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted mb-2">
              {t('home.statusTitle')}
            </h2>
            <p className="font-serif text-reader-ink-2">
              {t('home.statusScaffold')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
