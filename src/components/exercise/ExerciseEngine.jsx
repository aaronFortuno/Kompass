import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useT } from '@/i18n';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';
import { validateResponse } from '@/lib/exerciseValidator.js';
import { selectFeedback } from '@/lib/feedback.js';
import { DropdownFillRenderer } from './DropdownFillRenderer.jsx';
import { TypeInRenderer } from './TypeInRenderer.jsx';

/*
 * Orquestra un exercici (DATA-MODEL §3.3).
 * - Manté l'estat de resposta.
 * - Valida en "Comprovar" (submit del form per permetre Enter).
 * - Mostra feedback seleccionat segons la resposta.
 * - "Torna a provar" reinicia.
 */
export function ExerciseEngine({ exercise }) {
  const { t } = useT();
  const [response, setResponse] = useState({});
  const [result, setResult] = useState(null);

  const updateSlot = (blankId, value) =>
    setResponse((r) => ({ ...r, [blankId]: value }));

  const handleCheck = (e) => {
    e?.preventDefault?.();
    const outcome = validateResponse(exercise, response);
    const feedback = selectFeedback(exercise, response, outcome.correct);
    setResult({ ...outcome, feedback });
  };

  const handleReset = () => {
    setResponse({});
    setResult(null);
  };

  const locked = result !== null;

  const interactionNode = useMemo(() => {
    if (exercise.interaction.type === 'dropdownFill') {
      return (
        <DropdownFillRenderer
          exercise={exercise}
          response={response}
          onUpdate={updateSlot}
          disabled={locked}
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
        />
      );
    }
    if (import.meta.env?.DEV) {
      console.warn(
        `[ExerciseEngine] tipus d'interacció no implementat: ${exercise.interaction.type}`
      );
    }
    return null;
  }, [exercise, response, locked]);

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
          correct={result.correct}
          message={result.feedback.message}
        />
      )}
    </form>
  );
}

function ExerciseFeedback({ correct, message }) {
  const { t } = useT();
  const Icon = correct ? CheckCircle2 : XCircle;
  const statusLabel = correct ? t('exercise.correct') : t('exercise.incorrect');
  const borderClass = correct ? 'border-success' : 'border-danger';
  const iconClass = correct ? 'text-success' : 'text-danger';
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
      <div className="space-y-1 min-w-0">
        <span className="block font-semibold text-content">{statusLabel}</span>
        <p className="text-content-muted leading-relaxed">
          <InlineRichText text={message} />
        </p>
      </div>
    </div>
  );
}
