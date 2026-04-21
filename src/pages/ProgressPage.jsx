import { useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';
import {
  getAllTopics,
} from '@/lib/dataLoader.js';
import {
  serializeProgress,
  deserializeProgress,
  downloadJson,
  buildExportFilename,
} from '@/lib/exportImport.js';
import pkg from '../../package.json';

/*
 * Pàgina /progres · ARCHITECTURE §15 (MVP) + DATA-MODEL §3.5 i §3.7.
 *
 * Tres cards:
 *   1. Exportar: descarrega el progrés a un fitxer JSON.
 *   2. Importar: carrega un fitxer JSON i reemplaça l'estat.
 *   3. Reiniciar: buida el progrés amb doble confirmació.
 *
 * L'app version es pren de package.json (import JSON de Vite). És
 * purament informativa al fitxer exportat i no bloqueja l'import.
 */

const APP_VERSION = pkg.version ?? '0.0.1';

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

/* Compta quants blocks de tipus exercise té el corpus de temes, per
 * mostrar "X / Y" exercicis resolts. Es deriva al render; amb poques
 * desenes de temes no és car. */
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

export function ProgressPage() {
  const { t, locale } = useT();

  const topicsProgress = useProgressStore((s) => s.topics);
  const exercisesProgress = useProgressStore((s) => s.exercises);
  const lastUpdated = useProgressStore((s) => s.lastUpdated);
  const exportSnapshot = useProgressStore((s) => s.exportSnapshot);
  const importProgress = useProgressStore((s) => s.importProgress);
  const resetProgress = useProgressStore((s) => s.reset);

  const topics = useMemo(() => getAllTopics(), []);
  const totalTopics = topics.length;
  const totalExercises = useMemo(() => countTotalExercises(topics), [topics]);

  const topicsStarted = Object.keys(topicsProgress ?? {}).length;
  const exercisesCompleted = Object.values(exercisesProgress ?? {}).filter(
    (e) => e?.firstCorrectAt
  ).length;

  const hasProgress =
    topicsStarted > 0 || exercisesCompleted > 0 || Boolean(lastUpdated);

  // ── Export state ─────────────────────────────────────────────
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

  // ── Import state ─────────────────────────────────────────────
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

  // ── Reset state ──────────────────────────────────────────────
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

  return (
    <div className="section-gap max-w-content-read">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-content">
          {t('progress.title')}
        </h1>
        <p className="text-content-muted">{t('progress.intro')}</p>
      </header>

      {/* ── Resum ─────────────────────────────────────────── */}
      <section className="card" aria-labelledby="progress-summary-heading">
        <h2
          id="progress-summary-heading"
          className="text-lg font-semibold text-content mb-3"
        >
          {t('progress.summary.title')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-content-muted">
              {t('progress.summary.topicsStarted')}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-content">
              {topicsStarted}{' '}
              <span className="text-sm font-normal text-content-muted">
                {t('progress.summary.topicsOutOf', { total: totalTopics })}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-content-muted">
              {t('progress.summary.exercisesCompleted')}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-content">
              {exercisesCompleted}{' '}
              <span className="text-sm font-normal text-content-muted">
                {t('progress.summary.topicsOutOf', { total: totalExercises })}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-content-muted">
              {t('progress.summary.lastUpdated')}
            </dt>
            <dd className="mt-1 text-sm text-content">
              {lastUpdated
                ? formatDateTime(lastUpdated, locale)
                : t('progress.summary.never')}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Exportar ──────────────────────────────────────── */}
      <section className="card" aria-labelledby="progress-export-heading">
        <h2
          id="progress-export-heading"
          className="text-lg font-semibold text-content mb-2"
        >
          {t('progress.export.title')}
        </h2>
        <p className="text-content-muted mb-4">
          {t('progress.export.description')}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={!hasProgress}
        >
          <Download size={18} aria-hidden="true" className="mr-2" />
          {t('progress.export.button')}
        </button>
        {!hasProgress && (
          <p className="mt-3 text-sm text-content-muted">
            {t('progress.export.empty')}
          </p>
        )}
        {exportMessage && (
          <p
            className={`mt-3 text-sm flex items-start gap-2 ${
              exportMessage.kind === 'success' ? 'text-success' : 'text-danger'
            }`}
            role="status"
          >
            {exportMessage.kind === 'success' ? (
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            ) : (
              <X size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            )}
            <span>{exportMessage.text}</span>
          </p>
        )}
      </section>

      {/* ── Importar ──────────────────────────────────────── */}
      <section className="card" aria-labelledby="progress-import-heading">
        <h2
          id="progress-import-heading"
          className="text-lg font-semibold text-content mb-2"
        >
          {t('progress.import.title')}
        </h2>
        <p className="text-content-muted mb-4">
          {t('progress.import.description')}
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="progress-import-file"
              className="block text-sm font-medium text-content mb-1"
            >
              {t('progress.import.fileLabel')}
            </label>
            <input
              id="progress-import-file"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-content file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-raised file:text-content file:px-3 file:py-2 file:font-medium hover:file:bg-surface file:motion-hover"
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleImport}
            disabled={!selectedFile}
          >
            <Upload size={18} aria-hidden="true" className="mr-2" />
            {t('progress.import.button')}
          </button>
        </div>
        {importMessage && (
          <p
            className={`mt-3 text-sm flex items-start gap-2 ${
              importMessage.kind === 'success' ? 'text-success' : 'text-danger'
            }`}
            role="status"
          >
            {importMessage.kind === 'success' ? (
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            ) : (
              <X size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            )}
            <span>{importMessage.text}</span>
          </p>
        )}
      </section>

      {/* ── Reiniciar ─────────────────────────────────────── */}
      <section
        className="card border-danger bg-warning/5"
        aria-labelledby="progress-reset-heading"
      >
        <h2
          id="progress-reset-heading"
          className="text-lg font-semibold text-danger mb-2 flex items-center gap-2"
        >
          <AlertTriangle size={20} aria-hidden="true" />
          {t('progress.reset.title')}
        </h2>
        <p className="text-content-muted mb-4">
          {t('progress.reset.description')}
        </p>

        {!resetConfirming && (
          <button
            type="button"
            onClick={startResetFlow}
            disabled={!hasProgress}
            className="btn bg-danger text-accent-content hover:opacity-90"
          >
            <Trash2 size={18} aria-hidden="true" className="mr-2" />
            {t('progress.reset.button')}
          </button>
        )}

        {resetConfirming && (
          <div className="space-y-3">
            <label
              htmlFor="progress-reset-keyword"
              className="block text-sm font-medium text-content"
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
              className="block w-full sm:max-w-xs rounded-md border border-border bg-surface text-content px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger/40"
              placeholder={expectedKeyword}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmReset}
                disabled={!resetKeywordOk}
                className="btn bg-danger text-accent-content hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 size={18} aria-hidden="true" className="mr-2" />
                {t('progress.reset.confirmButton')}
              </button>
              <button
                type="button"
                onClick={cancelResetFlow}
                className="btn-ghost"
              >
                {t('progress.reset.cancel')}
              </button>
            </div>
          </div>
        )}

        {resetMessage && (
          <p
            className={`mt-3 text-sm flex items-start gap-2 ${
              resetMessage.kind === 'success' ? 'text-success' : 'text-danger'
            }`}
            role="status"
          >
            <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{resetMessage.text}</span>
          </p>
        )}
      </section>
    </div>
  );
}
