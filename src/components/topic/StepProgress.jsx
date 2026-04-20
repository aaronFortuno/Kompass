import { Dumbbell, GraduationCap } from 'lucide-react';
import { useT } from '@/i18n';

/*
 * Indicador de progrés híbrid · ARCHITECTURE §18
 *
 * Estats d'un step:
 *  - Actiu: destaca amb fons accent.
 *  - Visitat (abans del current): muted.
 *  - No visitat: border-color neutre.
 *
 * Tipus d'step (derivat dels blocks):
 *  - Narratiu: dot o número segons mida.
 *  - Exercici quick-check: icona Dumbbell.
 *  - Exercici assessment: icona GraduationCap.
 *
 * El progrés de "completat correctament" requereix persistència
 * d'exercicis (iteració D); aquest component encara no l'ensenya.
 */

function stepKind(step) {
  const exerciseBlock = step.blocks.find((b) => b.type === 'exercise');
  if (!exerciseBlock) return 'narrative';
  return exerciseBlock.variant === 'assessment' ? 'assessment' : 'quick-check';
}

function StepGlyph({ kind, index, size = 12 }) {
  if (kind === 'assessment') {
    return <GraduationCap size={size} aria-hidden="true" />;
  }
  if (kind === 'quick-check') {
    return <Dumbbell size={size} aria-hidden="true" />;
  }
  return <span>{index + 1}</span>;
}

export function StepProgress({ steps, currentIndex, onJump }) {
  const { t } = useT();
  const total = steps.length;
  const pct = ((currentIndex + 1) / total) * 100;

  return (
    <div
      className="space-y-2"
      aria-label={t('step.progress', { current: currentIndex + 1, total })}
    >
      {/* Mobile: dots amb icona si és exercici */}
      <div className="flex md:hidden gap-2 items-center justify-center flex-wrap">
        {steps.map((step, i) => {
          const active = i === currentIndex;
          const visited = i < currentIndex;
          const kind = stepKind(step);
          const isExercise = kind !== 'narrative';
          return (
            <button
              key={step.id ?? i}
              type="button"
              className={[
                'motion-hover inline-flex items-center justify-center rounded-full',
                'w-7 h-7 text-[11px] font-semibold',
                active
                  ? 'bg-accent text-accent-content'
                  : visited
                  ? isExercise
                    ? 'bg-accent/30 text-accent'
                    : 'bg-content-muted text-bg'
                  : isExercise
                  ? 'border border-accent text-accent bg-surface'
                  : 'bg-border text-content-muted',
              ].join(' ')}
              style={{ minHeight: '28px', minWidth: '28px' }}
              aria-label={t('step.goToStep', { number: i + 1 })}
              aria-current={active ? 'step' : undefined}
              onClick={() => onJump(i)}
            >
              {isExercise ? (
                <StepGlyph kind={kind} index={i} size={13} />
              ) : active || visited ? (
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
            const active = i === currentIndex;
            const kind = stepKind(step);
            const isExercise = kind !== 'narrative';
            return (
              <button
                key={step.id ?? i}
                type="button"
                className={[
                  'flex-1 inline-flex items-center justify-center gap-1 py-1 rounded-sm motion-hover text-xs',
                  active
                    ? 'text-accent font-semibold'
                    : isExercise
                    ? 'text-accent/80 hover:text-accent'
                    : 'text-content-muted hover:text-content',
                ].join(' ')}
                aria-label={t('step.goToStep', { number: i + 1 })}
                aria-current={active ? 'step' : undefined}
                title={step.id ?? `${i + 1}`}
                onClick={() => onJump(i)}
              >
                <StepGlyph kind={kind} index={i} size={13} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
