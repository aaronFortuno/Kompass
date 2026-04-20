import { Dumbbell, GraduationCap, Check } from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';

/*
 * Indicador de progrés híbrid · ARCHITECTURE §18
 *
 * Estats per step (consultats al UserProgress):
 *  - 'active'    : step actual (sempre preval visualment).
 *  - 'completed' : exercici amb lastAttemptCorrect === true.
 *  - 'errors'    : exercici amb lastAttemptCorrect === false
 *                  (consolidació pendent, opció B).
 *  - 'visited'   : step narratiu amb id a visitedStepIds.
 *  - 'pending'   : encara no visitat (narratiu) o no intentat
 *                  (exercici).
 */

function stepKind(step) {
  const exerciseBlock = step.blocks.find((b) => b.type === 'exercise');
  if (!exerciseBlock) return { kind: 'narrative', exerciseId: null };
  return {
    kind: exerciseBlock.variant === 'assessment' ? 'assessment' : 'quick-check',
    exerciseId: exerciseBlock.exerciseId,
  };
}

function computeStatus({ kind, exerciseId }, isActive, topicProgress, exercisesState) {
  if (isActive) return 'active';
  if (kind === 'narrative') {
    const visited = topicProgress?.visitedStepIds ?? [];
    return visited.includes(this?.stepId) ? 'visited' : 'pending';
  }
  const entry = exerciseId ? exercisesState?.[exerciseId] : null;
  if (!entry) return 'pending';
  if (entry.lastAttemptCorrect === true) return 'completed';
  if (entry.lastAttemptCorrect === false) return 'errors';
  return 'pending';
}

function StepGlyph({ kind, index, status, size = 13 }) {
  if (kind === 'assessment') {
    return <GraduationCap size={size} aria-hidden="true" />;
  }
  if (kind === 'quick-check') {
    if (status === 'completed') return <Check size={size} aria-hidden="true" />;
    return <Dumbbell size={size} aria-hidden="true" />;
  }
  return <span>{index + 1}</span>;
}

// Classes per estat x posició (dots mobile). L'actiu sobreposa.
function mobileDotClasses(status, kind) {
  if (status === 'active') {
    return 'bg-accent text-accent-content';
  }
  if (status === 'completed') {
    return 'bg-success text-accent-content';
  }
  if (status === 'errors') {
    return 'bg-warning text-accent-content';
  }
  if (status === 'pending') {
    if (kind === 'narrative') return 'bg-border text-content-muted';
    return 'border border-danger text-danger bg-surface';
  }
  // visited narrative
  return 'bg-content-muted/50 text-bg';
}

function desktopTickClasses(status, kind) {
  if (status === 'active') return 'text-accent font-semibold';
  if (status === 'completed') return 'text-success font-semibold';
  if (status === 'errors') return 'text-warning font-semibold';
  if (status === 'pending' && kind !== 'narrative') return 'text-danger';
  if (status === 'pending') return 'text-content-muted/50';
  return 'text-content-muted';
}

export function StepProgress({ topicId, steps, currentIndex, onJump }) {
  const { t } = useT();
  const topicProgress = useProgressStore((s) =>
    topicId ? s.topics[topicId] ?? null : null
  );
  const exercisesState = useProgressStore((s) => s.exercises);

  const total = steps.length;
  const pct = ((currentIndex + 1) / total) * 100;

  const statusFor = (step, i) => {
    const { kind, exerciseId } = stepKind(step);
    if (i === currentIndex) return { kind, status: 'active', exerciseId };
    if (kind === 'narrative') {
      const visited = topicProgress?.visitedStepIds ?? [];
      return {
        kind,
        status: step.id && visited.includes(step.id) ? 'visited' : 'pending',
        exerciseId,
      };
    }
    const entry = exerciseId ? exercisesState?.[exerciseId] : null;
    if (!entry) return { kind, status: 'pending', exerciseId };
    if (entry.lastAttemptCorrect === true) {
      return { kind, status: 'completed', exerciseId };
    }
    if (entry.lastAttemptCorrect === false) {
      return { kind, status: 'errors', exerciseId };
    }
    return { kind, status: 'pending', exerciseId };
  };

  return (
    <div
      className="space-y-2"
      aria-label={t('step.progress', {
        current: currentIndex + 1,
        total,
      })}
    >
      {/* Mobile: dots amb icona si és exercici */}
      <div className="flex md:hidden gap-2 items-center justify-center flex-wrap">
        {steps.map((step, i) => {
          const { kind, status } = statusFor(step, i);
          const isExercise = kind !== 'narrative';
          return (
            <button
              key={step.id ?? i}
              type="button"
              className={[
                'motion-hover inline-flex items-center justify-center rounded-full',
                'w-7 h-7 text-[11px] font-semibold',
                mobileDotClasses(status, kind),
              ].join(' ')}
              style={{ minHeight: '28px', minWidth: '28px' }}
              aria-label={t('step.goToStep', { number: i + 1 })}
              aria-current={status === 'active' ? 'step' : undefined}
              onClick={() => onJump(i)}
            >
              {isExercise ? (
                <StepGlyph kind={kind} index={i} status={status} size={14} />
              ) : status === 'active' || status === 'visited' ? (
                <span className="block w-2 h-2 rounded-full bg-current" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Desktop: barra amb ticks */}
      <div className="hidden md:block">
        <div className="relative h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-base ease-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 gap-1">
          {steps.map((step, i) => {
            const { kind, status } = statusFor(step, i);
            return (
              <button
                key={step.id ?? i}
                type="button"
                className={[
                  'flex-1 inline-flex items-center justify-center gap-1 py-1 rounded-sm motion-hover text-xs',
                  desktopTickClasses(status, kind),
                ].join(' ')}
                aria-label={t('step.goToStep', { number: i + 1 })}
                aria-current={status === 'active' ? 'step' : undefined}
                title={step.id ?? `${i + 1}`}
                onClick={() => onJump(i)}
              >
                <StepGlyph kind={kind} index={i} status={status} size={13} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
