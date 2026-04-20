import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useT } from '@/i18n';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';
import { validateResponse } from '@/lib/exerciseValidator.js';
import { selectFeedback } from '@/lib/feedback.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { DropdownFillRenderer } from './DropdownFillRenderer.jsx';
import { TypeInRenderer } from './TypeInRenderer.jsx';

/*
 * Orquestra un exercici (DATA-MODEL §3.3).
 * Valida en "Comprovar" (form submit → Enter funciona). Quan es
 * comprova, els renderers reben perBlank per tenyir cada input.
 * El feedback final mostra missatge general + llista dels buits
 * errats amb la resposta esperada.
 */
export function ExerciseEngine({ exercise }) {
  const { t } = useT();
  const [response, setResponse] = useState({});
  const [result, setResult] = useState(null);
  const recordExerciseAttempt = useProgressStore(
    (s) => s.recordExerciseAttempt
  );

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
    setResult({ ...outcome, feedback });
    recordExerciseAttempt(
      exercise.topicId,
      exercise.id,
      outcome.correctOverall
    );
  };

  const handleReset = () => {
    setResponse({});
    setResult(null);
  };

  const locked = result !== null;
  const perBlank = result?.perBlank;

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
          <button type="button" className="btn-ghost" onClick={handleReset}>
            <RotateCcw size={16} aria-hidden="true" />
            <span className="ml-1">{t('exercise.retry')}</span>
          </button>
        )}
      </div>

      {result && (
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
