import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  Compass,
  ChevronDown,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';
import {
  getAllTopics,
  getAllLevelKeys,
  getTopicsByLevel,
  getTopic,
} from '@/lib/dataLoader.js';
import {
  serializeProgress,
  deserializeProgress,
  downloadJson,
  buildExportFilename,
} from '@/lib/exportImport.js';
import { groupTopics } from '@/lib/topicGroups.js';
import pkg from '../../package.json';

/*
 * Pàgina /progres v2 · ARCHITECTURE §15 (MVP) + §17 (tokens) + DATA-MODEL §3.5 i §3.7.
 *
 * Tres blocs verticals:
 *   (1) Resum editorial (Stats globals) — igual que v1.
 *   (2) "Entre les mans" — top 3 de temes en curs (col·lapsat si n=0).
 *   (3) Navegador tot-el-temari amb filtre per estat i nivells col·lapsables.
 *   (4) Accions de backup (export/import/reset) — igual que v1.
 *
 * Decisions de càlcul (problema #1 de la v1):
 *   - Ignorem `lastVisitedAt` (no existeix al store). L'ordenació "en curs"
 *     passa a ser per `visitedStepIds.length` descendent, i després id asc.
 *   - "En curs" = visitedStepIds.length > 0 && !allDone.
 *   - "Per consolidar" = topic amb algun exercici amb lastAttemptCorrect=false.
 *   - "Completat" = allDone (tots els exercicis amb lastAttemptCorrect=true).
 *   - "No començat" = cap visita.
 *
 * Nota: `computeTopicProgress` (lib/topicProgress.js) encara no suporta el
 * format ric de steps (`kind: "exercise"` amb `exerciseId` pla). Aquesta
 * pàgina usa un helper local `collectExerciseIdsForTopic` que sí el cobreix,
 * perquè els temes migrats (A1a-1, A1a-2) apareguin amb progrés real. Quan
 * es corregeixi topicProgress.js (afecta també TopicsIndexPage), aquest
 * helper local es pot eliminar.
 */

const APP_VERSION = pkg.version ?? '0.0.1';

// ─── Helpers de format i derivació de dades ─────────────────────────────

function formatDateTime(iso, locale) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(locale === 'ca' ? 'ca-ES' : 'es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatDate(iso, locale) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(locale === 'ca' ? 'ca-ES' : 'es-ES', {
      dateStyle: 'long',
    });
  } catch {
    return iso;
  }
}

/* Dies sencers transcorreguts des d'una ISO fins ara. Null si no hi ha data. */
function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Math.max(0, Date.now() - then);
  return Math.floor(diffMs / 86_400_000);
}

function formatLastActivity(t, days) {
  if (days == null) return '—';
  if (days === 0) return t('progress.summary.today');
  if (days === 1) return t('progress.summary.yesterday');
  return t('progress.summary.daysAgo', { count: days });
}

function formatJourney(t, days) {
  if (days == null) return '—';
  if (days === 0) return t('progress.summary.journeyToday');
  return t('progress.summary.journeyDays', { count: days });
}

/* Recull exerciseIds d'un topic cobrint els dos formats de steps:
 *  - Llegat: step.blocks[] amb type === 'exercise'.
 *  - Ric: step.kind === 'exercise' amb exerciseId pla.
 */
function collectExerciseIdsForTopic(topic) {
  const ids = [];
  for (const step of topic?.steps ?? []) {
    if (step?.kind === 'exercise' && step.exerciseId) {
      ids.push(step.exerciseId);
      continue;
    }
    for (const block of step?.blocks ?? []) {
      if (block?.type === 'exercise' && block.exerciseId) {
        ids.push(block.exerciseId);
      }
    }
  }
  return ids;
}

/* Compta tots els blocs/steps d'exercici del corpus, per al stat "X / Y". */
function countTotalExercises(topics) {
  let n = 0;
  for (const topic of topics) n += collectExerciseIdsForTopic(topic).length;
  return n;
}

/* Estat sintètic d'un topic donat el seu progrés. Retorna suficient
 * metadata per a render + filtratge. */
function deriveTopicState(topic, topicsProgress, exercisesState) {
  const entry = topicsProgress?.[topic.id] ?? null;
  const visitedCount = entry?.visitedStepIds?.length ?? 0;
  const ids = collectExerciseIdsForTopic(topic);
  const totalEx = ids.length;
  let completedEx = 0;
  let failedEx = 0;
  for (const id of ids) {
    const ex = exercisesState?.[id];
    if (ex?.lastAttemptCorrect === true) completedEx += 1;
    else if (ex?.lastAttemptCorrect === false) failedEx += 1;
  }
  const allDone = totalEx > 0 && completedEx === totalEx;
  const pct = totalEx === 0 ? null : Math.round((completedEx / totalEx) * 100);

  // status per filtre. Ordre de precedència:
  //   completed > review > inProgress > notStarted
  let status = 'notStarted';
  if (allDone) status = 'completed';
  else if (failedEx > 0) status = 'review';
  else if (visitedCount > 0) status = 'inProgress';

  return {
    topic,
    status,
    visitedCount,
    totalSteps: topic.steps?.length ?? 0,
    totalEx,
    completedEx,
    failedEx,
    pct,
    allDone,
  };
}

// ─── Subcomponents editorials ───────────────────────────────────────────

function SectionHeading({ children, id }) {
  return (
    <h2
      id={id}
      className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted mb-4"
    >
      {children}
    </h2>
  );
}

function Stat({ label, value, denominator, foot }) {
  return (
    <div className="border-t border-reader-rule pt-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted">
        {label}
      </p>
      <p className="mt-2 font-serif text-reader-ink leading-none">
        <span className="text-4xl tracking-tight">{value}</span>
        {denominator != null && (
          <span className="ml-2 font-mono text-sm text-reader-ink-2">
            / {denominator}
          </span>
        )}
      </p>
      {foot && (
        <p className="mt-2 font-serif italic text-sm text-reader-ink-2">
          {foot}
        </p>
      )}
    </div>
  );
}

function ThinBar({ pct, done }) {
  const width = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div
      className="h-[2px] w-full bg-reader-rule overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className={[
          'h-full transition-[width] duration-base ease-standard',
          done ? 'bg-reader-ok' : 'bg-reader-ink',
        ].join(' ')}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/* Badge d'estat de tema (tokens de color únics per status). */
function StatusBadge({ status, t }) {
  const map = {
    completed: {
      label: t('progress.browse.statusCompleted'),
      className: 'text-reader-ok border-reader-ok',
    },
    review: {
      label: t('progress.browse.statusReview'),
      className: 'text-reader-bad border-reader-bad',
    },
    inProgress: {
      label: t('progress.browse.statusInProgress'),
      className: 'text-reader-ink border-reader-ink',
    },
    notStarted: {
      label: t('progress.browse.statusNotStarted'),
      className: 'text-reader-muted border-reader-rule',
    },
  };
  const cfg = map[status] ?? map.notStarted;
  return (
    <span
      className={[
        'inline-block border px-2 py-[2px]',
        'font-mono text-[10px] uppercase tracking-[0.15em]',
        'transition-colors duration-fast ease-standard',
        cfg.className,
      ].join(' ')}
    >
      {cfg.label}
    </span>
  );
}

/* Fila densa (navegador): id · títol · estat · barra · percentatge/check.
 * `revealIndex` dispara un stagger subtle a l'aparició de la fila (quan el
 * <details> s'obre, tipus reader-row-reveal). Capem el delay perquè nivells
 * amb moltes files (A1b = 42) no allarguin la revelació més enllà de ~1.2s. */
function BrowseRow({ state, t, revealIndex = 0 }) {
  const { topic, status, totalEx, completedEx, pct, allDone, failedEx } = state;
  const hasExercises = totalEx > 0;
  let meta = null;
  if (!hasExercises) {
    meta = t('progress.browse.metaNoExercises');
  } else if (status === 'review') {
    meta = t('progress.browse.pendingHint', { count: failedEx });
  } else {
    meta = t('progress.browse.metaExercises', {
      completed: completedEx,
      total: totalEx,
    });
  }
  const delayMs = revealIndex < 30 ? revealIndex * 40 : 0;
  return (
    <li
      className="progress-row-reveal"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Link
        to={`/temari/${topic.id}`}
        aria-label={t('progress.browse.openTopic', { id: topic.id })}
        className={[
          'group grid gap-3 py-3 px-2 -mx-2',
          'grid-cols-[4.5rem_1fr] sm:grid-cols-[4.5rem_1fr_7rem_9rem]',
          'sm:items-center',
          'hover:bg-reader-paper-2',
          'transition-colors duration-fast ease-standard',
        ].join(' ')}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted self-start sm:self-center">
          {topic.id}
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-base text-reader-ink tracking-tight truncate">
            {topic.shortTitle}
          </span>
          <span className="block sm:hidden font-mono text-[10px] uppercase tracking-[0.15em] text-reader-ink-2 mt-1">
            {meta}
          </span>
        </span>
        <span className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.15em] text-reader-ink-2 truncate">
          {meta}
        </span>
        <span className="col-span-2 sm:col-span-1 flex items-center gap-2">
          <StatusBadge status={status} t={t} />
          {hasExercises && (
            <span className="flex-1 flex items-center gap-2 min-w-0">
              <ThinBar pct={pct} done={allDone} />
              {allDone ? (
                <Check size={12} className="text-reader-ok flex-shrink-0" aria-hidden="true" />
              ) : (
                <span className="font-mono text-[10px] text-reader-muted w-8 text-right flex-shrink-0">
                  {pct}%
                </span>
              )}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/* Secció col·lapsable per nivell. Usa <details>/<summary> natius:
 * accessibilitat gratuïta, sense JS de col·lapse. Els canvis d'estat
 * entren al transition global definit a @media reduced-motion al CSS. */
function LevelSection({ levelKey, states, t, defaultOpen }) {
  const total = states.length;
  const shown = states.filter((s) => s.__shown).length;
  const completed = states.filter((s) => s.status === 'completed').length;

  return (
    <details
      open={defaultOpen}
      className={[
        'group border-t border-reader-rule',
        'transition-colors duration-fast ease-standard',
      ].join(' ')}
    >
      <summary
        className={[
          'flex items-center justify-between gap-4',
          'py-3 px-2 -mx-2 cursor-pointer list-none',
          'hover:bg-reader-paper-2',
          'transition-colors duration-fast ease-standard',
          // Oculta el marcador per defecte a Safari/Firefox.
          '[&::-webkit-details-marker]:hidden',
        ].join(' ')}
      >
        <span className="flex items-baseline gap-3">
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={[
              'text-reader-muted flex-shrink-0',
              'transition-transform duration-base ease-standard',
              'group-open:rotate-0 -rotate-90',
            ].join(' ')}
          />
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-reader-ink">
            {levelKey.toUpperCase()}
          </span>
        </span>
        <span className="font-mono text-[11px] text-reader-ink-2">
          {t('progress.browse.levelCount', { shown, total, completed })}
        </span>
      </summary>

      {/* Panell obert: GRID de cards temàtiques. */}
      <div className="pt-3 pb-4">
        {shown === 0 ? (
          <p className="font-serif italic text-sm text-reader-ink-2 px-2 py-4">
            {t('progress.browse.emptyForFilter')}
          </p>
        ) : (
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const visibleStates = states.filter((s) => s.__shown);
              // Agrupem per TOPIC_GROUPS (mateix mapa que TopicsIndex).
              // Mantenim l'estat de cada state dins del seu grup.
              const topics = visibleStates.map((s) => s.topic);
              const buckets = groupTopics(levelKey, topics);
              let cum = 0;
              return buckets.map((entry) => {
                const groupStates = entry.topics.map((topic) =>
                  visibleStates.find((s) => s.topic.id === topic.id),
                );
                const startIndex = cum;
                cum += groupStates.length;
                return (
                  <GroupBlockCard
                    key={entry.group.id}
                    group={entry.group}
                    states={groupStates}
                    t={t}
                    startIndex={startIndex}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
    </details>
  );
}

/* Card temàtica del navegador de progrés: títol del grup + xifra
 * agregada de compleció + llista compacta dels temes del grup amb el
 * seu estat individual.
 *
 * Càlcul del progrés del bloc:
 *   - Compleció per exercicis: suma de completedEx / suma de totalEx.
 *     Si el bloc no té exercicis, mostrem només els temes començats
 *     sobre el total.
 */
function GroupBlockCard({ group, states, t, startIndex }) {
  let totalEx = 0;
  let completedEx = 0;
  let allDoneCount = 0;
  let startedCount = 0;
  for (const s of states) {
    if (!s) continue;
    totalEx += s.totalEx || 0;
    completedEx += s.completedEx || 0;
    if (s.status === 'completed') allDoneCount += 1;
    if (s.status !== 'notStarted') startedCount += 1;
  }
  const blockPct = totalEx === 0 ? null : Math.round((completedEx / totalEx) * 100);
  const total = states.length;

  return (
    <div className="flex flex-col">
      {/* Capçalera del bloc · títol + % compleció. */}
      <div className="flex items-baseline justify-between gap-3 border-t-2 border-reader-rule pt-4 pb-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
          {group.title}
        </h3>
        <span className="font-mono text-[10px] text-reader-ink-2 flex-shrink-0">
          {blockPct != null
            ? `${blockPct}% · ${allDoneCount}/${total}`
            : `${startedCount}/${total}`}
        </span>
      </div>
      {/* Barra fina que agrega compleció del bloc. */}
      <ThinBar pct={blockPct ?? 0} done={allDoneCount === total && total > 0} />
      {/* Llista compacta de temes del grup. */}
      <ul className="flex flex-col mt-1">
        {states.map((state, i) => {
          if (!state) return null;
          return (
            <li key={state.topic.id} className="border-b border-reader-rule last:border-b-0">
              <BrowseCompactRow state={state} t={t} revealIndex={startIndex + i} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Fila compacta d'un tema dins d'una card de bloc: id · shortTitle · estat.
 * Tipografia més petita que el BrowseRow original — les cards ja són
 * contextualitzades pel títol del grup, no cal repetir metadata. */
function BrowseCompactRow({ state, t, revealIndex = 0 }) {
  const { topic, status, pct, allDone, totalEx } = state;
  const hasExercises = totalEx > 0;
  const delayMs = Math.min(revealIndex * 35, 500);
  const to = `/temari/${topic.id}`;
  return (
    <Link
      to={to}
      className={[
        'group flex items-baseline gap-3',
        'py-2 px-2 -mx-2',
        'hover:bg-reader-paper-2',
        'transition-colors duration-fast ease-standard',
        'progress-row-reveal',
      ].join(' ')}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-reader-muted w-7 flex-shrink-0 text-right">
        {topic.id.replace(/^A1[ab]-/, '')}
      </span>
      <span className="flex-1 min-w-0 font-serif text-sm text-reader-ink tracking-tight truncate">
        {topic.shortTitle}
      </span>
      <span className="flex-shrink-0 flex items-center gap-1.5">
        {hasExercises ? (
          allDone ? (
            <Check size={13} className="text-reader-ok" aria-hidden="true" />
          ) : status === 'review' ? (
            <AlertTriangle size={12} className="text-reader-bad" aria-hidden="true" />
          ) : (
            <span className="font-mono text-[10px] text-reader-muted">
              {pct != null && pct > 0 ? `${pct}%` : '·'}
            </span>
          )
        ) : (
          <span className="font-mono text-[10px] text-reader-muted">
            {status === 'notStarted' ? '·' : '—'}
          </span>
        )}
      </span>
    </Link>
  );
}

/* Chip de filtre — inspirat en tabs editorials, tipografia mono. Actiu porta
 * sublínia negra; la resta son gris. */
function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-baseline gap-2 px-3 py-2',
        'font-mono text-[11px] uppercase tracking-[0.18em]',
        'border-b-2',
        'transition-colors duration-fast ease-standard',
        active
          ? 'border-reader-ink text-reader-ink'
          : 'border-transparent text-reader-muted hover:text-reader-ink',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] text-reader-ink-2">{count}</span>
    </button>
  );
}

/* Fila compacta per al mini-league "Entre les mans". */
function MiniLeagueRow({ state, t, revealIndex = 0 }) {
  const { topic, totalEx, completedEx, pct, totalSteps, visitedCount } = state;
  const hasExercises = totalEx > 0;
  const meta = hasExercises
    ? t('progress.inProgress.metaExercises', {
        completed: completedEx,
        total: totalEx,
      })
    : t('progress.inProgress.metaSteps', {
        visited: visitedCount,
        total: totalSteps,
      });
  const delayMs = revealIndex * 60;
  return (
    <li
      className="progress-row-reveal"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Link
        to={`/temari/${topic.id}`}
        className={[
          'group flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6',
          'py-3 px-2 -mx-2',
          'hover:bg-reader-paper-2',
          'transition-colors duration-fast ease-standard',
        ].join(' ')}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted sm:w-20 flex-shrink-0">
          {topic.id}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-serif text-base text-reader-ink tracking-tight">
            {topic.shortTitle}
          </span>
          <span className="block font-serif italic text-sm text-reader-ink-2 mt-0.5">
            {meta}
          </span>
        </span>
        {hasExercises && (
          <span className="flex-shrink-0 sm:w-32 flex items-center gap-2">
            <ThinBar pct={pct} done={false} />
            <span className="font-mono text-[10px] text-reader-muted w-8 text-right">
              {pct}%
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

// ─── Accions ────────────────────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none';

const BUTTON_LOOKS = {
  inkOutline:
    'border border-reader-ink text-reader-ink hover:bg-reader-ink hover:text-reader-paper',
  badOutline:
    'border border-reader-bad text-reader-bad hover:bg-reader-bad hover:text-reader-paper',
  badSolid: 'bg-reader-bad text-reader-paper hover:opacity-90',
  ghost:
    'border border-reader-rule text-reader-ink-2 hover:text-reader-ink hover:border-reader-ink',
};

function EditorialButton({
  onClick,
  disabled,
  look = 'inkOutline',
  icon: Icon,
  children,
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BUTTON_BASE} ${BUTTON_LOOKS[look]}`}
    >
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

function ActionTitle({ title, description, tone = 'ink' }) {
  const titleColor = tone === 'bad' ? 'text-reader-bad' : 'text-reader-ink';
  return (
    <div className="flex-1 min-w-[14rem]">
      <h3 className={`font-serif text-lg ${titleColor} mb-1`}>{title}</h3>
      <p className="font-serif italic text-sm text-reader-ink-2 max-w-prose">
        {description}
      </p>
    </div>
  );
}

function InlineMessage({ message }) {
  if (!message) return null;
  const isOk = message.kind === 'success';
  return (
    <p
      role="status"
      className={[
        'mt-3 flex items-start gap-2 font-serif italic text-sm',
        isOk ? 'text-reader-ok' : 'text-reader-bad',
      ].join(' ')}
    >
      {isOk ? (
        <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      ) : (
        <X size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      )}
      <span>{message.text}</span>
    </p>
  );
}

// ─── Component principal ────────────────────────────────────────────────

const FILTER_ORDER = ['all', 'inProgress', 'review', 'completed', 'notStarted'];

export function ProgressPage() {
  const { t, locale } = useT();

  const topicsProgress = useProgressStore((s) => s.topics);
  const exercisesProgress = useProgressStore((s) => s.exercises);
  const lastUpdated = useProgressStore((s) => s.lastUpdated);
  const createdAt = useProgressStore((s) => s.createdAt);
  const exportSnapshot = useProgressStore((s) => s.exportSnapshot);
  const importProgress = useProgressStore((s) => s.importProgress);
  const resetProgress = useProgressStore((s) => s.reset);

  // Corpus (estàtic). Excloem A1a-0 (onboarding de benvinguda) perquè
  // no és una lliçó de contingut amb exercicis avaluables, i distorsiona
  // els totals/percentatges del progrés regular.
  const allTopics = useMemo(
    () => getAllTopics().filter((t) => t.id !== 'A1a-0'),
    [],
  );
  const levelKeys = useMemo(() => getAllLevelKeys(), []);
  const totalTopics = allTopics.length;
  const totalExercises = useMemo(() => countTotalExercises(allTopics), [allTopics]);

  // Estat derivat de tots els topics (un sol passada). És la base tant
  // dels comptadors de chips com del navegador i el mini-league.
  const allStates = useMemo(() => {
    return allTopics.map((topic) =>
      deriveTopicState(topic, topicsProgress, exercisesProgress)
    );
  }, [allTopics, topicsProgress, exercisesProgress]);

  // Comptadors per filtre
  const counts = useMemo(() => {
    const c = { all: allStates.length, inProgress: 0, review: 0, completed: 0, notStarted: 0 };
    for (const s of allStates) c[s.status] += 1;
    return c;
  }, [allStates]);

  // Stats per al resum editorial.
  const topicsStarted = counts.inProgress + counts.review + counts.completed;
  const exercisesConsolidated = useMemo(
    () =>
      Object.values(exercisesProgress ?? {}).filter(
        (e) => e?.firstCorrectAt && e?.lastAttemptCorrect !== false
      ).length,
    [exercisesProgress]
  );

  const hasProgress =
    topicsStarted > 0 ||
    exercisesConsolidated > 0 ||
    Boolean(lastUpdated) ||
    Object.keys(exercisesProgress ?? {}).length > 0;

  // Mini-league "Entre les mans": top 3 per visitedStepIds desc, id asc.
  const inProgressLeague = useMemo(() => {
    return allStates
      .filter((s) => s.status === 'inProgress' || s.status === 'review')
      // Només els que l'usuari ha encetat (visitat algun step).
      .filter((s) => s.visitedCount > 0 && !s.allDone)
      .sort((a, b) => {
        if (b.visitedCount !== a.visitedCount) return b.visitedCount - a.visitedCount;
        return a.topic.id < b.topic.id ? -1 : a.topic.id > b.topic.id ? 1 : 0;
      })
      .slice(0, 3);
  }, [allStates]);

  // Dies des de l'inici del curs i des de l'última activitat.
  const daysSinceStart = daysSince(createdAt);
  const daysSinceLast = daysSince(lastUpdated);

  // ─── Filtre del navegador ───────────────────────────────────────
  const [filter, setFilter] = useState('all');

  // Map topicId → shown booleà, segons filtre. Marquem l'estat amb __shown
  // per a LevelSection. L'ordre del nivell és el de dataLoader (per number).
  const statesByLevel = useMemo(() => {
    const map = new Map();
    for (const levelKey of levelKeys) {
      // A1a-0 és la lliçó d'onboarding (benvinguda). No la mostrem al
      // progrés regular — viu només a la landing fins que l'usuari la
      // completa la primera vegada.
      const topicsInLevel = getTopicsByLevel(levelKey).filter(
        (t) => t.id !== 'A1a-0',
      );
      const list = topicsInLevel.map((topic) => {
        const state = allStates.find((s) => s.topic.id === topic.id);
        const shown = filter === 'all' || state.status === filter;
        return Object.assign({}, state, { __shown: shown });
      });
      map.set(levelKey, list);
    }
    return map;
  }, [allStates, levelKeys, filter]);

  // ─── Export ─────────────────────────────────────────────────────
  const [exportMessage, setExportMessage] = useState(null);

  function handleExport() {
    const snapshot = exportSnapshot();
    const payload = serializeProgress(snapshot, { appVersion: APP_VERSION });
    const filename = buildExportFilename();
    downloadJson(payload, filename);
    setExportMessage({
      kind: 'success',
      text: t('progress.export.success', { filename }),
    });
  }

  // ─── Import ─────────────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMessage, setImportMessage] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportMessage(null);
  }

  async function handleImport() {
    if (!selectedFile) {
      setImportMessage({ kind: 'error', text: t('progress.import.noFile') });
      return;
    }

    let text;
    try {
      text = await selectedFile.text();
    } catch {
      setImportMessage({ kind: 'error', text: t('progress.import.errorRead') });
      return;
    }

    const result = deserializeProgress(text);
    if (!result.ok) {
      const msg =
        result.errorCode === 'invalid-json'
          ? t('progress.import.errorInvalidJson')
          : t('progress.import.errorSchema', { detail: result.errorMessage });
      setImportMessage({ kind: 'error', text: msg });
      return;
    }

    if (hasProgress) {
      const confirmed = window.confirm(t('progress.import.confirmReplace'));
      if (!confirmed) {
        setImportMessage(null);
        return;
      }
    }

    importProgress(result.progress);
    setImportMessage({ kind: 'success', text: t('progress.import.success') });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Reset (doble confirmació: native + paraula clau) ───────────
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetKeyword, setResetKeyword] = useState('');
  const [resetMessage, setResetMessage] = useState(null);

  function startResetFlow() {
    const ok = window.confirm(t('progress.reset.confirmNative'));
    if (!ok) return;
    setResetConfirming(true);
    setResetKeyword('');
    setResetMessage(null);
  }

  function cancelResetFlow() {
    setResetConfirming(false);
    setResetKeyword('');
  }

  function confirmReset() {
    resetProgress();
    setResetConfirming(false);
    setResetKeyword('');
    setResetMessage({ kind: 'success', text: t('progress.reset.success') });
    setExportMessage(null);
    setImportMessage(null);
  }

  const expectedKeyword = t('progress.reset.confirmKeyword');
  const resetKeywordOk =
    resetKeyword.trim().toLowerCase() === expectedKeyword.toLowerCase();

  // ─────────────────────────────────────────────────────────────────

  const chipLabels = {
    all: t('progress.browse.filterAll'),
    inProgress: t('progress.browse.filterInProgress'),
    review: t('progress.browse.filterReview'),
    completed: t('progress.browse.filterCompleted'),
    notStarted: t('progress.browse.filterNotStarted'),
  };

  return (
    <div className="max-w-content-list">
      {/* ── Capçalera + resum en 2 columnes ────────────────────── */}
      <section className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:items-start">
        <header className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
            {t('progress.kicker')}
          </p>
          <h1 className="font-serif font-medium text-4xl sm:text-5xl tracking-tight text-reader-ink">
            {t('progress.title')}
          </h1>
          <p className="font-serif italic text-lg text-reader-ink-2 max-w-prose">
            {t('progress.intro')}
          </p>
        </header>
        {hasProgress && (
          // Resum global compactat com a segona columna. A desktop
          // viu al costat del header; a mòbil cau sota en col·lumna.
          <div aria-labelledby="progress-summary-heading">
            <SectionHeading id="progress-summary-heading">
              {t('progress.summary.title')}
            </SectionHeading>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Stat
                label={t('progress.summary.topicsStarted')}
                value={topicsStarted}
                denominator={totalTopics}
              />
              <Stat
                label={t('progress.summary.exercisesConsolidated')}
                value={exercisesConsolidated}
                denominator={totalExercises}
              />
              <Stat
                label={t('progress.summary.lastActivity')}
                value={formatLastActivity(t, daysSinceLast)}
              />
              <Stat
                label={t('progress.summary.journey')}
                value={formatJourney(t, daysSinceStart)}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!hasProgress && (
        <section className="mb-12" aria-labelledby="progress-empty-heading">
          <div className="border-t border-reader-rule pt-6 flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 text-reader-ink-2 mt-1">
              <Compass size={28} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2
                id="progress-empty-heading"
                className="font-serif text-2xl text-reader-ink mb-2"
              >
                {t('progress.empty.title')}
              </h2>
              <p className="font-serif italic text-reader-ink-2 max-w-prose mb-4">
                {t('progress.empty.body')}
              </p>
              <Link
                to="/temari"
                className={`${BUTTON_BASE} ${BUTTON_LOOKS.inkOutline}`}
              >
                {t('progress.empty.cta')}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Entre les mans (top 3, només si hi ha) ─────────────── */}
      {hasProgress && inProgressLeague.length > 0 && (
        <section className="mb-12" aria-labelledby="progress-league-heading">
          <SectionHeading id="progress-league-heading">
            {t('progress.inProgress.title')}
          </SectionHeading>
          <p className="font-serif italic text-sm text-reader-ink-2 mb-4 max-w-prose">
            {t('progress.inProgress.intro')}
          </p>
          <ul className="divide-y divide-reader-rule border-t border-b border-reader-rule">
            {inProgressLeague.map((state, i) => (
              <MiniLeagueRow key={state.topic.id} state={state} t={t} revealIndex={i} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Navegador tot-el-temari ────────────────────────────── */}
      {levelKeys.length > 0 && (
        <section className="mb-12" aria-labelledby="progress-browse-heading">
          <SectionHeading id="progress-browse-heading">
            {t('progress.browse.title')}
          </SectionHeading>
          <p className="font-serif italic text-sm text-reader-ink-2 mb-4 max-w-prose">
            {t('progress.browse.intro')}
          </p>

          {/* Filtre per estat — tabs planes amb underline del actiu. */}
          <div
            role="tablist"
            aria-label={t('progress.browse.filterAriaLabel')}
            className="flex flex-wrap gap-x-1 gap-y-0 border-b border-reader-rule mb-2"
          >
            {FILTER_ORDER.map((key) => (
              <FilterChip
                key={key}
                label={chipLabels[key]}
                count={counts[key]}
                active={filter === key}
                onClick={() => setFilter(key)}
              />
            ))}
          </div>

          {/* Seccions col·lapsables per nivell. Per defecte obertes si el
           * filtre actiu té matches al nivell; si n=0 al nivell, tancat. */}
          <div className="mt-0">
            {levelKeys.map((levelKey) => {
              const states = statesByLevel.get(levelKey) ?? [];
              const shownCount = states.filter((s) => s.__shown).length;
              // Per defecte obert si hi ha matches o si filter === 'all'.
              const defaultOpen = shownCount > 0;
              return (
                <LevelSection
                  key={levelKey}
                  levelKey={levelKey}
                  states={states}
                  t={t}
                  defaultOpen={defaultOpen}
                />
              );
            })}
            {/* Bottom rule per tancar visualment la taula. */}
            <div className="border-t border-reader-rule" />
          </div>
        </section>
      )}

      {/* ── Accions (backup) ─────────────────────────────────── */}
      <section
        className="mt-16 pt-10 border-t-2 border-reader-rule"
        aria-labelledby="progress-actions-heading"
      >
        <SectionHeading id="progress-actions-heading">
          {t('progress.actions.title')}
        </SectionHeading>
        <p className="font-serif italic text-reader-ink-2 max-w-prose mb-8">
          {t('progress.actions.intro')}
        </p>

        {/* Exportar */}
        <div className="py-6 border-t border-reader-rule">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <ActionTitle
              title={t('progress.export.title')}
              description={t('progress.export.description')}
            />
            <EditorialButton
              onClick={handleExport}
              disabled={!hasProgress}
              icon={Download}
            >
              {t('progress.export.button')}
            </EditorialButton>
          </div>
          {!hasProgress && (
            <p className="mt-3 font-serif italic text-sm text-reader-muted">
              {t('progress.export.empty')}
            </p>
          )}
          <InlineMessage message={exportMessage} />
        </div>

        {/* Importar */}
        <div className="py-6 border-t border-reader-rule">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 mb-3">
            <ActionTitle
              title={t('progress.import.title')}
              description={t('progress.import.description')}
            />
          </div>
          <div className="space-y-3">
            <label
              htmlFor="progress-import-file"
              className="block font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted"
            >
              {t('progress.import.fileLabel')}
            </label>
            <input
              id="progress-import-file"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-reader-ink font-serif file:mr-3 file:rounded-sm file:border file:border-reader-rule file:bg-reader-paper file:text-reader-ink file:px-3 file:py-2 file:font-mono file:text-[11px] file:uppercase file:tracking-wider hover:file:bg-reader-paper-2 file:transition-colors file:duration-fast file:ease-standard"
            />
            <EditorialButton
              onClick={handleImport}
              disabled={!selectedFile}
              icon={Upload}
            >
              {t('progress.import.button')}
            </EditorialButton>
          </div>
          <InlineMessage message={importMessage} />
        </div>

        {/* Reiniciar */}
        <div className="py-6 border-t border-reader-rule">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <div className="flex-shrink-0 text-reader-bad mt-1">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <ActionTitle
              title={t('progress.reset.title')}
              description={t('progress.reset.description')}
              tone="bad"
            />
            {!resetConfirming && (
              <EditorialButton
                onClick={startResetFlow}
                disabled={!hasProgress}
                look="badOutline"
                icon={Trash2}
              >
                {t('progress.reset.button')}
              </EditorialButton>
            )}
          </div>

          {resetConfirming && (
            <div className="mt-4 space-y-3">
              <label
                htmlFor="progress-reset-keyword"
                className="block font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted"
              >
                {t('progress.reset.confirmTypeLabel')}
              </label>
              <input
                id="progress-reset-keyword"
                type="text"
                value={resetKeyword}
                onChange={(e) => setResetKeyword(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="block w-full sm:max-w-xs rounded-sm border border-reader-rule bg-reader-paper text-reader-ink font-serif px-3 py-2 text-sm focus:outline-none focus:border-reader-bad transition-colors duration-fast ease-standard"
                placeholder={expectedKeyword}
              />
              <div className="flex flex-wrap gap-2">
                <EditorialButton
                  onClick={confirmReset}
                  disabled={!resetKeywordOk}
                  look="badSolid"
                  icon={Trash2}
                >
                  {t('progress.reset.confirmButton')}
                </EditorialButton>
                <EditorialButton onClick={cancelResetFlow} look="ghost">
                  {t('progress.reset.cancel')}
                </EditorialButton>
              </div>
            </div>
          )}

          <InlineMessage message={resetMessage} />
        </div>
      </section>
    </div>
  );
}
