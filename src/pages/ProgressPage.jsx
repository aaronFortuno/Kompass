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
} from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';
import {
  getAllTopics,
  getAllLevelKeys,
  getTopicsByLevel,
  getTopic,
} from '@/lib/dataLoader.js';
import { computeTopicProgress } from '@/lib/topicProgress.js';
import {
  serializeProgress,
  deserializeProgress,
  downloadJson,
  buildExportFilename,
} from '@/lib/exportImport.js';
import pkg from '../../package.json';

/*
 * Pàgina /progres · ARCHITECTURE §15 (MVP) + §17 (tokens) + DATA-MODEL §3.5 i §3.7.
 * Dues meitats: (1) visualització honesta del progrés acumulat i (2) accions
 * de backup (export/import/reset), preservant la lògica existent intacta.
 * Tota la visualització deriva del store (topics + exercises) i de
 * `computeTopicProgress` — no hi ha càlculs nous rellevants que no visquin ja a lib/.
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

/* Format humà per al stat "darrera activitat". Retorna un string pel value
 * del Stat: "Avui", "Ahir" o "Fa N dies". Em / si no hi ha dada. */
function formatLastActivity(t, days) {
  if (days == null) return '—';
  if (days === 0) return t('progress.summary.today');
  if (days === 1) return t('progress.summary.yesterday');
  return t('progress.summary.daysAgo', { count: days });
}

/* Format humà pel stat "des que vas començar". */
function formatJourney(t, days) {
  if (days == null) return '—';
  if (days === 0) return t('progress.summary.journeyToday');
  return t('progress.summary.journeyDays', { count: days });
}

/* Compta blocs d'exercici del corpus, per mostrar "X / Y" al resum. */
function countTotalExercises(topics) {
  let n = 0;
  for (const topic of topics) {
    for (const step of topic.steps ?? []) {
      for (const block of step.blocks ?? []) {
        if (block?.type === 'exercise' && block.exerciseId) n += 1;
      }
    }
  }
  return n;
}

/* Llista d'exerciseIds referenciats per un tema (en ordre d'aparició). */
function collectExerciseIds(topic) {
  const ids = [];
  for (const step of topic?.steps ?? []) {
    for (const block of step?.blocks ?? []) {
      if (block?.type === 'exercise' && block.exerciseId) ids.push(block.exerciseId);
    }
  }
  return ids;
}

/* Clau d'ordenació d'un topic: el camp més recent disponible al store.
 * `lastVisitedAt` és futur-compatible; avui només hi ha `firstVisitedAt`. */
function topicSortKey(entry) {
  return entry?.lastVisitedAt || entry?.firstVisitedAt || '';
}

/* Temes "en curs": visitats però no completats, ordenats recent → antic. */
function deriveInProgressTopics(topicsProgress, exercisesState, max) {
  const enriched = [];
  for (const [topicId, entry] of Object.entries(topicsProgress ?? {})) {
    const topic = getTopic(topicId);
    if (!topic) continue;
    if ((entry?.visitedStepIds?.length ?? 0) === 0) continue;
    const progress = computeTopicProgress(topic, exercisesState);
    if (progress.allDone) continue;
    enriched.push({ topic, entry, progress, sortKey: topicSortKey(entry) });
  }
  enriched.sort((a, b) => (a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0));
  return enriched.slice(0, max);
}

/* Temes a repassar: els que tenen algun exercici amb lastAttemptCorrect === false. */
function deriveReviewTopics(topicsProgress, exercisesState, max) {
  const list = [];
  for (const [topicId, entry] of Object.entries(topicsProgress ?? {})) {
    const topic = getTopic(topicId);
    if (!topic) continue;
    let pending = 0;
    for (const id of collectExerciseIds(topic)) {
      if (exercisesState?.[id]?.lastAttemptCorrect === false) pending += 1;
    }
    if (pending === 0) continue;
    list.push({ topic, pending, sortKey: topicSortKey(entry) });
  }
  list.sort((a, b) => (a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0));
  return list.slice(0, max);
}

// ─── Subcomponents editorials ───────────────────────────────────────────

/* Encapçalament de secció (mono uppercase tracking-wide), mateix patró
 * que SectionHeading de settings/controls però autònom aquí. */
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

/* Stat gran: nombre + denominador + label + peu opcional. Border-top
 * editorial, sense cards ni ombres. */
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

/* Barra de progrés discreta (mateix look que TopicsIndexPage). */
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

/* Fila clickable d'un tema (mateix patró que TopicsIndexPage). */
function TopicRow({ topic, meta, pct, done }) {
  return (
    <li>
      <Link
        to={`/temari/${topic.id}`}
        className={[
          'group flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6',
          'py-4 px-2 -mx-2',
          'hover:bg-reader-paper-2',
          'transition-colors duration-fast ease-standard',
        ].join(' ')}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted sm:w-20 flex-shrink-0">
          {topic.id}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-serif text-lg text-reader-ink tracking-tight">
            {topic.shortTitle}
          </span>
          {meta && (
            <span className="block font-serif italic text-sm text-reader-ink-2 mt-1">
              {meta}
            </span>
          )}
        </span>
        {pct != null && (
          <span className="flex-shrink-0 sm:w-32 flex items-center gap-2">
            <ThinBar pct={pct} done={done} />
            {done ? (
              <Check size={14} className="text-reader-ok" aria-hidden="true" />
            ) : (
              <span className="font-mono text-[10px] text-reader-muted w-8 text-right">
                {pct}%
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

/* Resum per nivell: etiqueta + barra fina + fracció completats + línia
 * "has encetat N de M". Els topics arriben decorats amb `_started` per
 * no tornar a tocar el store des d'aquí. */
function LevelSummaryRow({ levelKey, topics, exercisesState, t }) {
  let completed = 0;
  let started = 0;
  for (const topic of topics) {
    if (topic._started) started += 1;
    const { allDone } = computeTopicProgress(topic, exercisesState);
    if (allDone) completed += 1;
  }
  const total = topics.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="border-t border-reader-rule pt-4 pb-2">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-reader-ink">
          {levelKey.toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-reader-ink-2">
          {t('progress.byLevel.fraction', { completed, total })}
        </span>
      </div>
      <ThinBar pct={pct} done={total > 0 && completed === total} />
      <p className="mt-2 font-serif italic text-sm text-reader-ink-2">
        {t('progress.byLevel.startedLine', { started, total })}
      </p>
    </div>
  );
}

/* Botó editorial (4 looks). Tailwind JIT necessita classes literals. */
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

/* Capçalera repetitiva d'acció (títol h3 serif + descripció italic). */
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

/* Missatge inline amb icona ok/ko, reutilitzat per les 3 accions. */
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

export function ProgressPage() {
  const { t, locale } = useT();

  const topicsProgress = useProgressStore((s) => s.topics);
  const exercisesProgress = useProgressStore((s) => s.exercises);
  const lastUpdated = useProgressStore((s) => s.lastUpdated);
  const createdAt = useProgressStore((s) => s.createdAt);
  const exportSnapshot = useProgressStore((s) => s.exportSnapshot);
  const importProgress = useProgressStore((s) => s.importProgress);
  const resetProgress = useProgressStore((s) => s.reset);

  // Corpus (estàtic)
  const topics = useMemo(() => getAllTopics(), []);
  const levelKeys = useMemo(() => getAllLevelKeys(), []);
  const totalTopics = topics.length;
  const totalExercises = useMemo(() => countTotalExercises(topics), [topics]);

  // Derivades del progrés
  const topicsStarted = useMemo(
    () =>
      Object.values(topicsProgress ?? {}).filter(
        (entry) => (entry?.visitedStepIds?.length ?? 0) > 0
      ).length,
    [topicsProgress]
  );

  // "Consolidat": firstCorrectAt present i l'últim intent no ha fallat.
  // Coherent amb el matís del store: reintentar i fallar treu la consolidació.
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

  const inProgressList = useMemo(
    () => deriveInProgressTopics(topicsProgress, exercisesProgress, 5),
    [topicsProgress, exercisesProgress]
  );

  const reviewList = useMemo(
    () => deriveReviewTopics(topicsProgress, exercisesProgress, 5),
    [topicsProgress, exercisesProgress]
  );

  // Dies des de l'inici del curs i des de l'última activitat.
  const daysSinceStart = daysSince(createdAt);
  const daysSinceLast = daysSince(lastUpdated);

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

  return (
    <div className="max-w-content-list">
      {/* ── Capçalera editorial ────────────────────────────────── */}
      <header className="space-y-3 mb-10">
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

      {/* ── Si no hi ha cap progrés, mostrem l'empty state càlid ── */}
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

      {/* ── Resum global ───────────────────────────────────────── */}
      {hasProgress && (
        <section className="mb-12" aria-labelledby="progress-summary-heading">
          <SectionHeading id="progress-summary-heading">
            {t('progress.summary.title')}
          </SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Stat
              label={t('progress.summary.topicsStarted')}
              value={topicsStarted}
              denominator={totalTopics}
            />
            <Stat
              label={t('progress.summary.exercisesConsolidated')}
              value={exercisesConsolidated}
              denominator={totalExercises}
              foot={
                exercisesConsolidated > 0
                  ? t('progress.summary.consolidatedHint')
                  : null
              }
            />
            <Stat
              label={t('progress.summary.lastActivity')}
              value={formatLastActivity(t, daysSinceLast)}
              foot={lastUpdated ? formatDateTime(lastUpdated, locale) : null}
            />
            <Stat
              label={t('progress.summary.journey')}
              value={formatJourney(t, daysSinceStart)}
              foot={
                createdAt
                  ? t('progress.summary.startedOn', {
                      date: formatDate(createdAt, locale),
                    })
                  : null
              }
            />
          </div>
        </section>
      )}

      {/* ── Per nivell ─────────────────────────────────────────── */}
      {hasProgress && levelKeys.length > 0 && (
        <section className="mb-12" aria-labelledby="progress-bylevel-heading">
          <SectionHeading id="progress-bylevel-heading">
            {t('progress.byLevel.title')}
          </SectionHeading>
          <div className="space-y-2">
            {levelKeys.map((levelKey) => {
              const levelTopics = getTopicsByLevel(levelKey);
              // Decorem cada topic amb `_started` perquè LevelSummaryRow
              // pugui comptar-ho sense accedir al store.
              const decorated = levelTopics.map((topic) => {
                const entry = topicsProgress?.[topic.id];
                const started = (entry?.visitedStepIds?.length ?? 0) > 0;
                return Object.assign({}, topic, { _started: started });
              });
              return (
                <LevelSummaryRow
                  key={levelKey}
                  levelKey={levelKey}
                  topics={decorated}
                  exercisesState={exercisesProgress}
                  t={t}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Temes en curs ─────────────────────────────────────── */}
      {inProgressList.length > 0 && (
        <section className="mb-12" aria-labelledby="progress-inprogress-heading">
          <SectionHeading id="progress-inprogress-heading">
            {t('progress.inProgress.title')}
          </SectionHeading>
          <p className="font-serif italic text-sm text-reader-ink-2 mb-4 max-w-prose">
            {t('progress.inProgress.intro')}
          </p>
          <ul className="divide-y divide-reader-rule border-t border-b border-reader-rule">
            {inProgressList.map(({ topic, progress }) => {
              const hasExercises = progress.total > 0;
              const stepsCount = topic.steps?.length ?? 0;
              const visited =
                topicsProgress?.[topic.id]?.visitedStepIds?.length ?? 0;
              const metaLine = hasExercises
                ? t('progress.inProgress.metaExercises', {
                    completed: progress.completed,
                    total: progress.total,
                  })
                : t('progress.inProgress.metaSteps', {
                    visited,
                    total: stepsCount,
                  });
              return (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  meta={metaLine}
                  pct={hasExercises ? progress.pct : null}
                  done={false}
                />
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Temes a repassar ──────────────────────────────────── */}
      {reviewList.length > 0 && (
        <section className="mb-12" aria-labelledby="progress-review-heading">
          <SectionHeading id="progress-review-heading">
            {t('progress.review.title')}
          </SectionHeading>
          <p className="font-serif italic text-sm text-reader-ink-2 mb-4 max-w-prose">
            {t('progress.review.intro')}
          </p>
          <ul className="divide-y divide-reader-rule border-t border-b border-reader-rule">
            {reviewList.map(({ topic, pending }) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                meta={t('progress.review.meta', { count: pending })}
                pct={null}
              />
            ))}
          </ul>
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

        {/* Reiniciar — matís de perill, sense card ni fons farcit. */}
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
