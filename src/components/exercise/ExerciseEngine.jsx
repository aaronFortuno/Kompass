import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw, BookOpenCheck } from 'lucide-react';
import { useT } from '@/i18n';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';
import { validateResponse } from '@/lib/exerciseValidator.js';
import { selectFeedback } from '@/lib/feedback.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { DropdownFillRenderer } from './DropdownFillRenderer.jsx';
import { TypeInRenderer } from './TypeInRenderer.jsx';

/*
 * ExerciseEngine · DATA-MODEL §3.3 + progress store
 *
 * Tres estats d'ús:
 *   (a) Sense estat previ: l'usuari respon i comprova.
 *   (b) Completat prèviament (firstCorrectAt existeix): entrem
 *       directament en mode "resolt" amb les respostes correctes
 *       pre-omplertes i deshabilitades; botó "Tornar a intentar"
 *       per reiniciar.
 *   (c) En curs: pot haver-hi intents anteriors fallats; es permet
 *       respondre i comprovar normalment.
 *
 * L'estat "fallat lastAttempt" (opció B) es reflecteix a la barra
 * de progrés; aquí no bloqueja la interacció.
 */

function buildCorrectResponse(exercise) {
  const v = exercise.validation;
  if (v.type === 'slotMap') return { ...v.answers };
  if (v.type === 'slotMapMultiple') {
    return Object.fromEntries(
      Object.entries(v.answers).map(([k, arr]) => [k, arr[0]])
    );
  }
  return {};
}

function buildAllCorrectPerBlank(exercise) {
  const v = exercise.validation;
  if (v.type === 'slotMap') {
    return Object.fromEntries(
      Object.entries(v.answers).map(([k, expected]) => [
        k,
        { correct: true, actual: expected, expected },
      ])
    );
  }
  if (v.type === 'slotMapMultiple') {
    return Object.fromEntries(
      Object.entries(v.answers).map(([k, arr]) => [
        k,
        { correct: true, actual: arr[0], expected: arr.join(' / ') },
      ])
    );
  }
  return {};
}

function buildPrefilledSolved(exercise) {
  return {
    response: buildCorrectResponse(exercise),
    result: {
      correctOverall: true,
      perBlank: buildAllCorrectPerBlank(exercise),
      feedback: exercise.feedback.correct,
      prefilled: true,
    },
  };
}

function buildInitialState(exercise) {
  // Llegim el store de manera no reactiva: la decisió d'estat inicial
  // s'ha de prendre una vegada per exercici, no cada vegada que el
  // store canvia.
  const state = useProgressStore.getState();
  const ephemeral = state.ephemeralResults?.[exercise.id];
  if (ephemeral) {
    return { response: ephemeral.response, result: ephemeral.result };
  }
  const firstCorrectAt = state.exercises[exercise.id]?.firstCorrectAt;
  if (firstCorrectAt) return buildPrefilledSolved(exercise);
  return { response: {}, result: null };
}

export function ExerciseEngine({ exercise }) {
  const { t } = useT();
  const recordExerciseAttempt = useProgressStore(
    (s) => s.recordExerciseAttempt
  );
  const setEphemeralResult = useProgressStore((s) => s.setEphemeralResult);

  const initial = useMemo(() => buildInitialState(exercise), [exercise.id]);
  const [response, setResponse] = useState(initial.response);
  const [result, setResult] = useState(initial.result);

  // Rearma l'estat quan canviem d'exercici sense que el component
  // es desmunti (cas improbable amb key={stepIndex} del StepViewer,
  // però n'assegurem el comportament).
  useEffect(() => {
    const next = buildInitialState(exercise);
    setResponse(next.response);
    setResult(next.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const updateSlot = (blankId, value) =>
    setResponse((r) => ({ ...r, [blankId]: value }));

  const handleCheck = (e) => {
    e?.preventDefault?.();
    const outcome = validateResponse(exercise, response);
    const feedback = selectFeedback(
      exercise,
      response,
      outcome.correctOverall
    );
    const newResult = { ...outcome, feedback };
    setResult(newResult);
    setEphemeralResult(exercise.id, { response, result: newResult });
    recordExerciseAttempt(
      exercise.topicId,
      exercise.id,
      outcome.correctOverall
    );
  };

  const handleRetry = () => {
    setResponse({});
    setResult(null);
    setEphemeralResult(exercise.id, null);
  };

  const locked = result !== null;
  const perBlank = result?.perBlank;
  const showPrefilledBanner = result?.prefilled === true;

  const interactionNode = useMemo(() => {
    if (exercise.interaction.type === 'dropdownFill') {
      return (
        <DropdownFillRenderer
          exercise={exercise}
          response={response}
          onUpdate={updateSlot}
          disabled={locked}
          perBlank={perBlank}
        />
      );
    }
    if (exercise.interaction.type === 'typeIn') {
      return (
        <TypeInRenderer
          exercise={exercise}
          response={response}
          onUpdate={updateSlot}
          disabled={locked}
          perBlank={perBlank}
        />
      );
    }
    if (import.meta.env?.DEV) {
      console.warn(
        `[ExerciseEngine] tipus d'interacció no implementat: ${exercise.interaction.type}`
      );
    }
    return null;
  }, [exercise, response, locked, perBlank]);

  return (
    <form onSubmit={handleCheck} className="space-y-4">
      {exercise.prompt && (
        <p className="text-content font-medium">{exercise.prompt}</p>
      )}

      {showPrefilledBanner && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/5 border border-success/20 rounded-sm px-3 py-2">
          <BookOpenCheck size={16} aria-hidden="true" />
          <span>{t('exercise.alreadyCompleted')}</span>
        </div>
      )}

      <div className="p-4 rounded-md bg-surface-raised border border-border">
        {interactionNode}
      </div>

      <div className="flex flex-wrap gap-2">
        {!locked && (
          <button type="submit" className="btn-primary">
            {t('exercise.check')}
          </button>
        )}
        {locked && (
          <button type="button" className="btn-ghost" onClick={handleRetry}>
            <RotateCcw size={16} aria-hidden="true" />
            <span className="ml-1">
              {showPrefilledBanner
                ? t('exercise.tryAgain')
                : t('exercise.retry')}
            </span>
          </button>
        )}
      </div>

      {result && !showPrefilledBanner && (
        <ExerciseFeedback
          correct={result.correctOverall}
          message={result.feedback.message}
          perBlank={result.perBlank}
          blanks={exercise.stimulus.blanks}
        />
      )}
    </form>
  );
}

function ExerciseFeedback({ correct, message, perBlank, blanks }) {
  const { t } = useT();
  const Icon = correct ? CheckCircle2 : XCircle;
  const statusLabel = correct ? t('exercise.correct') : t('exercise.incorrect');
  const borderClass = correct ? 'border-success' : 'border-danger';
  const iconClass = correct ? 'text-success' : 'text-danger';

  const errors =
    !correct && perBlank
      ? Object.entries(perBlank)
          .filter(([, b]) => !b.correct)
          .map(([blankId, b]) => ({
            blankId,
            actual: b.actual,
            expected: b.expected,
            label: blanks?.find((x) => String(x.id) === String(blankId))?.label,
          }))
      : [];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`card ${borderClass} border-2 flex gap-3 items-start`}
    >
      <Icon
        size={22}
        className={`${iconClass} shrink-0 mt-0.5`}
        aria-hidden="true"
      />
      <div className="space-y-3 min-w-0 flex-1">
        <span className="block text-lg font-semibold text-content">
          {statusLabel}
        </span>

        {errors.length > 0 && (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li
                key={e.blankId}
                className="p-2 rounded-sm bg-danger/5 border border-danger/20 text-content"
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-danger mb-1">
                  {t('exercise.blankLabel', { id: e.blankId })}
                  {e.label ? ` · ${e.label}` : ''}
                </span>
                <span className="block">
                  {e.actual ? (
                    <>
                      {t('exercise.youWrote')}{' '}
                      <code className="px-1.5 py-0.5 rounded-sm bg-danger/10 text-danger font-mono">
                        {e.actual}
                      </code>
                    </>
                  ) : (
                    <span className="italic text-content-muted">
                      {t('exercise.leftBlank')}
                    </span>
                  )}
                  {' · '}
                  {t('exercise.expectedWas')}{' '}
                  <code className="px-1.5 py-0.5 rounded-sm bg-success/10 text-success font-mono">
                    {e.expected}
                  </code>
                </span>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p
            className={`text-sm text-content-muted leading-relaxed ${
              errors.length > 0 ? 'pt-2 border-t border-border' : ''
            }`}
          >
            {errors.length > 0 && (
              <span className="font-semibold text-content-muted">
                {t('exercise.tipPrefix')}{' '}
              </span>
            )}
            <InlineRichText text={message} />
          </p>
        )}
      </div>
    </div>
  );
}
