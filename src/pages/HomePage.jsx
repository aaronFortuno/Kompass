import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Volume2,
  GitBranch,
  Download,
  Compass,
} from 'lucide-react';
import { useT } from '@/i18n';
import { getAllTopics, getTopic } from '@/lib/dataLoader.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { computeTopicProgress } from '@/lib/topicProgress.js';
import { ReaderTeaser } from '@/components/home/ReaderTeaser.jsx';
import pkg from '../../package.json';

const APP_VERSION = pkg.version ?? '0.0.1';

/*
 * HomePage · experiència editorial amb teaser viu del reader
 *
 * Seccions (de dalt a baix):
 *   1. Hero editorial (Compass + wordmark, lead, intro).
 *   2. Teaser viu del reader (ReaderTeaser): mostra beats reals amb
 *      typewriter i SpeakableText — el "reader en petit".
 *   3. CTA dual: adaptada al progrés. Si l'usuari ja ha iniciat algun
 *      tema, la primària ofereix "Continua: <tema>". Altrament,
 *      "Comença amb A1a-0".
 *   4. Pilars "Què fa Kompass" (4 icones Lucide).
 *   5. Peu editorial: navegació interna + versió.
 *
 * Tot consumeix tokens semàntics paper/ink i passa per t(). El
 * contingut d'estudi en alemany del teaser viu al ReaderTeaser.jsx
 * perquè és "contingut de demostració", no lliçó real.
 */

/*
 * Calcula estadístiques bàsiques del curs per al copy.
 * Només s'executa un cop a la home; operació O(temes).
 */
function courseStats(topics) {
  const exerciseIds = new Set();
  for (const topic of topics) {
    for (const step of topic?.steps ?? []) {
      if (Array.isArray(step?.blocks)) {
        for (const block of step.blocks) {
          if (block?.type === 'exercise' && block.exerciseId) {
            exerciseIds.add(block.exerciseId);
          }
        }
      }
    }
  }
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

/*
 * Determina el topic que té sentit oferir com a "Continua". Criteri:
 *   - Entre els topics presents al progress store (iniciats).
 *   - Descarta els que ja tenen tots els exercicis completats (allDone)
 *     perquè no serveix insistir-hi.
 *   - D'entre la resta, tria el de firstVisitedAt més recent. Com que
 *     no tenim un camp lastUpdated per topic, firstVisitedAt és
 *     l'indicador més proper al "tema en què estava treballant".
 *   - Torna null si no n'hi ha cap candidat.
 */
function pickContinueTopic(topicsProgress, exercisesProgress) {
  if (!topicsProgress) return null;
  const candidates = [];
  for (const [topicId, tp] of Object.entries(topicsProgress)) {
    const topic = getTopic(topicId);
    if (!topic) continue;
    const { allDone, total } = computeTopicProgress(topic, exercisesProgress);
    // Un tema sense exercicis (total === 0) també el considerem "en
    // curs" si apareix al store: l'usuari l'ha obert i probablement
    // vol tornar-hi.
    if (total > 0 && allDone) continue;
    candidates.push({ topic, firstVisitedAt: tp?.firstVisitedAt ?? '' });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    // Ordre descendent per firstVisitedAt (ISO string comparable).
    if (a.firstVisitedAt > b.firstVisitedAt) return -1;
    if (a.firstVisitedAt < b.firstVisitedAt) return 1;
    return 0;
  });
  return candidates[0].topic;
}

// Pilar individual "Què fa Kompass". Text curt, kicker mono, icona Lucide.
function Pillar({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 pt-1 text-reader-ink-2">
        <Icon size={22} aria-hidden="true" strokeWidth={1.5} />
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
  const topics = useMemo(() => getAllTopics(), []);
  const stats = useMemo(() => courseStats(topics), [topics]);

  // Progrés de l'usuari · determina la CTA primària.
  const topicsProgress = useProgressStore((s) => s.topics);
  const exercisesProgress = useProgressStore((s) => s.exercises);
  const continueTopic = useMemo(
    () => pickContinueTopic(topicsProgress, exercisesProgress),
    [topicsProgress, exercisesProgress],
  );

  return (
    <div className="max-w-content-list">
      {/* ── 1. Hero editorial ─────────────────────────────────── */}
      <header className="mb-16 sm:mb-20">
        <div className="flex items-center gap-3 mb-6 text-reader-ink">
          <Compass size={28} aria-hidden="true" strokeWidth={1.5} />
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-reader-muted">
            {t('home.kicker')}
          </p>
        </div>
        <h1 className="font-serif font-medium text-5xl sm:text-6xl md:text-7xl leading-[0.98] tracking-tight text-reader-ink max-w-[14ch]">
          {t('home.welcome')}
        </h1>
        <p className="mt-8 font-serif italic text-xl sm:text-2xl text-reader-ink-2 leading-snug max-w-prose">
          {t('home.lead')}
        </p>
      </header>

      {/* ── 2. Teaser viu del reader ──────────────────────────── */}
      <section
        className="mb-16 sm:mb-20 grid gap-10 lg:gap-16 lg:grid-cols-[1fr_1fr] items-center"
        aria-labelledby="home-teaser-heading"
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted mb-4">
            {t('home.readerKicker')}
          </p>
          <h2
            id="home-teaser-heading"
            className="font-serif font-medium text-3xl sm:text-4xl leading-tight tracking-tight text-reader-ink mb-5 max-w-[20ch]"
          >
            {t('home.readerTitle')}
          </h2>
          <p className="font-serif text-lg text-reader-ink-2 leading-relaxed max-w-prose">
            {t('home.readerBody')}
          </p>
        </div>
        <ReaderTeaser />
      </section>

      {/* ── 3. CTA dual (adaptada a progrés) ──────────────────── */}
      <section className="mb-16 sm:mb-20">
        {continueTopic ? (
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-reader-muted">
              {t('home.ctaContinueKicker')}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/temari/${continueTopic.id}`}
                className={[
                  'inline-flex items-center gap-3 px-6 py-4 rounded-none',
                  'bg-reader-ink text-reader-paper',
                  'font-serif text-xl sm:text-2xl tracking-tight',
                  'hover:bg-reader-ink-2',
                  'transition-colors duration-fast ease-standard',
                ].join(' ')}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {continueTopic.id}
                </span>
                <span>{continueTopic.shortTitle}</span>
                <ArrowRight size={18} aria-hidden="true" strokeWidth={1.75} />
              </Link>
              <Link
                to="/temari"
                className={[
                  'inline-flex items-center gap-2 px-5 py-3 rounded-none',
                  'border border-reader-ink text-reader-ink',
                  'font-mono text-[11px] uppercase tracking-[0.14em]',
                  'hover:bg-reader-ink hover:text-reader-paper',
                  'transition-colors duration-fast ease-standard',
                ].join(' ')}
              >
                {t('home.ctaSyllabus')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              to="/temari/A1a-0"
              className={[
                'inline-flex items-center gap-3 px-6 py-3 rounded-none',
                'bg-reader-ink text-reader-paper',
                'font-mono text-[11px] uppercase tracking-[0.14em]',
                'hover:bg-reader-ink-2',
                'transition-colors duration-fast ease-standard',
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
        )}
      </section>

      {/* ── 4. Què fa Kompass ─────────────────────────────────── */}
      <section className="mb-16 sm:mb-20 pt-10 border-t border-reader-rule">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-muted mb-10">
          {t('home.pillarsTitle')}
        </h2>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <Pillar
            icon={BookOpen}
            title={t('home.pillarReadTitle')}
            text={t('home.pillarReadText')}
          />
          <Pillar
            icon={Volume2}
            title={t('home.pillarAudioTitle')}
            text={t('home.pillarAudioText')}
          />
          <Pillar
            icon={GitBranch}
            title={t('home.pillarFreeTitle')}
            text={t('home.pillarFreeText')}
          />
          <Pillar
            icon={Download}
            title={t('home.pillarLocalTitle')}
            text={t('home.pillarLocalText')}
          />
        </div>
      </section>

      {/* ── 5. Peu editorial intern ──────────────────────────── */}
      <section className="pt-10 border-t border-reader-rule">
        <nav
          aria-label={t('home.footerNavAria')}
          className="flex flex-wrap items-baseline gap-x-8 gap-y-3 mb-6"
        >
          <Link
            to="/temari"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-ink-2 hover:text-reader-ink transition-colors duration-fast ease-standard"
          >
            {t('nav.topics')}
          </Link>
          <Link
            to="/progres"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-ink-2 hover:text-reader-ink transition-colors duration-fast ease-standard"
          >
            {t('nav.progress')}
          </Link>
          <Link
            to="/settings"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-ink-2 hover:text-reader-ink transition-colors duration-fast ease-standard"
          >
            {t('nav.settings')}
          </Link>
        </nav>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
            v{APP_VERSION}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
            {t('home.statsLessons', { count: stats.lessons })} ·{' '}
            {t('home.statsExercises', { count: stats.exercises })} ·{' '}
            {t('home.statsHours', { count: stats.hours })}
          </span>
        </div>
      </section>
    </div>
  );
}
