import { Dumbbell, GraduationCap, Check } from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';

/*
 * Indicador de progrés híbrid · ARCHITECTURE §18
 *
 * Contenidor unificat (bg-surface + border): la barra fina superior
 * i els ticks/dots inferiors formen un sol element visual perquè
 * quedi clar que són l'element interactiu del reproductor.
 *
 * Ticks desktop i dots mòbil comparteixen la semàntica de color:
 *  - active    : accent
 *  - completed : success + icona Check
 *  - errors    : warning
 *  - pending exercici : bg-danger/10 amb border-danger
 *  - pending narratiu : muted, semitransparent
 *  - visited narratiu : bg-surface-raised
 */

function stepKind(step) {
  const exerciseBlock = step.blocks.find((b) => b.type === 'exercise');
  if (!exerciseBlock) return { kind: 'narrative', exerciseId: null };
  return {
    kind: exerciseBlock.variant === 'assessment' ? 'assessment' : 'quick-check',
    exerciseId: exerciseBlock.exerciseId,
  };
}

function StepGlyph({ kind, index, status, size }) {
  if (kind === 'assessment') {
    return <GraduationCap size={size} aria-hidden="true" />;
  }
  if (kind === 'quick-check') {
    if (status === 'completed') return <Check size={size} aria-hidden="true" />;
    return <Dumbbell size={size} aria-hidden="true" />;
  }
  return <span className="text-[11px]">{index + 1}</span>;
}

function statusClasses(status, kind) {
  if (status === 'active') {
    return 'bg-accent text-accent-content shadow-soft';
  }
  if (status === 'completed') {
    return 'bg-success text-accent-content';
  }
  if (status === 'errors') {
    return 'bg-warning text-accent-content';
  }
  if (status === 'pending' && kind !== 'narrative') {
    return 'bg-danger/10 text-danger border border-danger/40';
  }
  if (status === 'pending') {
    return 'bg-transparent text-content-muted/60';
  }
  // visited narrative
  return 'bg-surface-raised text-content-muted';
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
      className="bg-surface border border-border rounded-md px-3 py-3 shadow-soft"
      aria-label={t('step.progress', {
        current: currentIndex + 1,
        total,
      })}
    >
      {/* Barra fina de progrés acumulat (només desktop) */}
      <div className="hidden md:block relative h-1.5 bg-border/60 rounded-full overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-base ease-standard"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Ticks/dots. Mateixa estructura de colors a ambdues mides;
          els botons creixen a desktop i ocupen tot l'ample. */}
      <div className="flex items-stretch justify-center md:justify-between gap-1.5 flex-wrap md:flex-nowrap">
        {steps.map((step, i) => {
          const { kind, status } = statusFor(step, i);
          const isExercise = kind !== 'narrative';
          // Mida de la icona: més gran per exercicis.
          const iconSize = isExercise ? 18 : 13;
          return (
            <button
              key={step.id ?? i}
              type="button"
              className={[
                'motion-hover rounded-md flex items-center justify-center',
                // Mobile: un cercle petit. Desktop: flex-1 + rectangle ample.
                'w-8 h-8 md:w-auto md:h-10 md:flex-1 md:rounded-sm',
                statusClasses(status, kind),
              ].join(' ')}
              style={{ minHeight: '32px', minWidth: '32px' }}
              aria-label={t('step.goToStep', { number: i + 1 })}
              aria-current={status === 'active' ? 'step' : undefined}
              title={step.id ?? `${i + 1}`}
              onClick={() => onJump(i)}
            >
              <StepGlyph
                kind={kind}
                index={i}
                status={status}
                size={iconSize}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
