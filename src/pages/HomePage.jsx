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

/*
 * HomePage v2 · experiència editorial compactada.
 *
 * Densitat objectiu: a desktop (~900px d'alçada útil) hero + teaser + CTA
 * caben al primer viewport; els pillars queden just sota del fold com a
 * segon nivell. Per aconseguir-ho:
 *   - El hero i el teaser comparteixen un grid de 2 columnes a `lg:`,
 *     amb proporció 1.1fr / 1fr perquè la columna text quedi lleugerament
 *     dominant.
 *   - Les CTAs viuen a la columna de text, just sota del lead — d'aquesta
 *     manera sempre són visibles amb el hero.
 *   - S'han suprimit els espais generosos mb-16/mb-20 en favor de
 *     separadors més editorial-compact (border-t + mt-10).
 *   - El peu intern de la home desapareix: el footer global d'AppShell
 *     ja porta brandmark, enllaços i versió.
 *
 * Seccions (de dalt a baix):
 *   1. Hero + teaser en grid (amb CTA integrada a la columna de text).
 *   2. Pillars "Què fa Kompass" (4 icones Lucide) + strip d'estadístiques.
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
    <div className="flex gap-3">
      <div className="flex-shrink-0 pt-1 text-reader-ink-2">
        <Icon size={20} aria-hidden="true" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-ink mb-1.5">
          {title}
        </h3>
        <p className="font-serif text-sm text-reader-ink-2 leading-snug">
          {text}
        </p>
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
      {/* ── 1. Hero + teaser en grid compacte ─────────────────── */}
      <section
        className="grid gap-10 lg:gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center"
        aria-labelledby="home-hero-heading"
      >
        {/* Columna de text: kicker, títol, lead, CTA */}
        <div>
          <div className="flex items-center gap-3 mb-5 text-reader-ink">
            <Compass size={24} aria-hidden="true" strokeWidth={1.5} />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-reader-muted">
              {t('home.kicker')}
            </p>
          </div>
          <h1
            id="home-hero-heading"
            className="font-serif font-medium text-5xl sm:text-6xl lg:text-[64px] leading-[0.98] tracking-tight text-reader-ink max-w-[14ch]"
          >
            {t('home.welcome')}
          </h1>
          <p className="mt-5 font-serif italic text-lg sm:text-xl text-reader-ink-2 leading-snug max-w-prose">
            {t('home.lead')}
          </p>

          {/* CTA dual · adaptada a progrés. Viu DINS del hero perquè
              sigui visible sense scroll amb el teaser al costat. */}
          <div className="mt-7">
            {continueTopic ? (
              <div className="flex flex-col gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-reader-muted">
                  {t('home.ctaContinueKicker')}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/temari/${continueTopic.id}`}
                    className={[
                      'inline-flex items-center gap-3 px-5 py-3 rounded-none',
                      'bg-reader-ink text-reader-paper',
                      'font-serif text-lg sm:text-xl tracking-tight',
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
                      'inline-flex items-center gap-2 px-4 py-3 rounded-none',
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
                    'inline-flex items-center gap-3 px-5 py-3 rounded-none',
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
            )}
          </div>
        </div>

        {/* Columna de teaser viu */}
        <ReaderTeaser />
      </section>

      {/* ── 2. Pillars + strip d'estadístiques ────────────────── */}
      <section className="mt-12 lg:mt-16 pt-8 border-t border-reader-rule">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-muted">
            {t('home.pillarsTitle')}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
            {t('home.statsLessons', { count: stats.lessons })} ·{' '}
            {t('home.statsExercises', { count: stats.exercises })} ·{' '}
            {t('home.statsHours', { count: stats.hours })}
          </span>
        </div>
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
