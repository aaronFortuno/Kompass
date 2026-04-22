import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, PenLine, HardDrive } from 'lucide-react';
import { useT } from '@/i18n';
import { getAllTopics } from '@/lib/dataLoader.js';

/*
 * HomePage · onboarding editorial (§84)
 * Hero càlid + CTA primària cap a la Lliçó 0 (Willkommen) + secció "com
 * funciona" amb 3 pilars + resum numèric del curs. Tot consumint la
 * paleta editorial paper/ink.
 */

function stats() {
  const topics = getAllTopics();
  let exerciseIds = new Set();
  topics.forEach((t) => {
    t.steps?.forEach((s) => {
      if (s?.kind === 'exercise' && s.exerciseId) {
        exerciseIds.add(s.exerciseId);
      }
      if (Array.isArray(s?.blocks)) {
        s.blocks.forEach((b) => {
          if (b?.type === 'exercise' && b.exerciseId) {
            exerciseIds.add(b.exerciseId);
          }
        });
      }
    });
  });
  const totalMinutes = topics.reduce(
    (acc, t) => acc + (typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 15),
    0,
  );
  return {
    lessons: topics.length,
    exercises: exerciseIds.size,
    hours: Math.round(totalMinutes / 60),
  };
}

function HowPillar({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 pt-1 text-reader-ink-2">
        <Icon size={22} aria-hidden="true" strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-ink mb-2">
          {title}
        </h3>
        <p className="font-serif text-reader-ink-2 leading-snug">{text}</p>
      </div>
    </div>
  );
}

export function HomePage() {
  const { t } = useT();
  const s = stats();

  return (
    <div className="max-w-content-read">
      {/* Hero editorial */}
      <header className="mb-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-reader-muted mb-6">
          {t('home.kicker')}
        </p>
        <h1 className="font-serif font-medium text-5xl sm:text-6xl md:text-7xl leading-[0.98] tracking-tight text-reader-ink">
          {t('home.welcome')}
        </h1>
        <p className="mt-6 font-serif italic text-xl sm:text-2xl text-reader-ink-2 leading-snug max-w-prose">
          {t('home.lead')}
        </p>
        <p className="mt-6 font-serif text-lg text-reader-ink-2 leading-relaxed max-w-prose">
          {t('home.intro')}
        </p>
      </header>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 mb-16">
        <Link
          to="/temari/A1a-0"
          className={[
            'inline-flex items-center gap-3 px-6 py-3 rounded-none',
            'bg-reader-ink text-reader-paper',
            'font-mono text-[11px] uppercase tracking-[0.14em]',
            'hover:bg-reader-ink-2 transition-colors duration-fast ease-standard',
          ].join(' ')}
        >
          {t('home.ctaStart')}
          <ArrowRight size={14} aria-hidden="true" strokeWidth={2} />
        </Link>
        <Link
          to="/temari"
          className={[
            'inline-flex items-center gap-2 px-6 py-3 rounded-none',
            'border border-reader-ink text-reader-ink',
            'font-mono text-[11px] uppercase tracking-[0.14em]',
            'hover:bg-reader-ink hover:text-reader-paper',
            'transition-colors duration-fast ease-standard',
          ].join(' ')}
        >
          {t('home.ctaSyllabus')}
        </Link>
      </div>

      {/* Com funciona */}
      <section className="mb-14 pt-10 border-t border-reader-rule">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-muted mb-8">
          {t('home.howTitle')}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <HowPillar
            icon={BookOpen}
            title={t('home.howBeatTitle')}
            text={t('home.howBeatText')}
          />
          <HowPillar
            icon={PenLine}
            title={t('home.howExerciseTitle')}
            text={t('home.howExerciseText')}
          />
          <HowPillar
            icon={HardDrive}
            title={t('home.howOfflineTitle')}
            text={t('home.howOfflineText')}
          />
        </div>
      </section>

      {/* Estadístiques */}
      <section className="pt-10 border-t border-reader-rule">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-muted mb-8">
          {t('home.statsTitle')}
        </h2>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="font-serif text-4xl md:text-5xl font-medium text-reader-ink leading-none">
              {s.lessons}
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
              Lliçons
            </div>
          </div>
          <div>
            <div className="font-serif text-4xl md:text-5xl font-medium text-reader-ink leading-none">
              {s.exercises}
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
              Exercicis
            </div>
          </div>
          <div>
            <div className="font-serif text-4xl md:text-5xl font-medium text-reader-ink leading-none">
              ~{s.hours}
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
              Hores d'estudi
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
