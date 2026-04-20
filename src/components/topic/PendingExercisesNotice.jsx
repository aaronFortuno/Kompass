import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n';

export function PendingExercisesNotice({ pending, onGoTo }) {
  const { t } = useT();
  if (!pending.length) return null;

  return (
    <aside className="card border-warning border-2 bg-warning/5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-warning" size={20} aria-hidden="true" />
        <h3 className="text-lg font-semibold text-content">
          {t('topic.pendingTitle', { count: pending.length })}
        </h3>
      </div>
      <p className="text-content-muted text-sm">{t('topic.pendingIntro')}</p>
      <ul className="space-y-1">
        {pending.map(({ stepIndex, step, exerciseId, reason }) => (
          <li key={exerciseId}>
            <button
              type="button"
              className="flex items-center gap-1 text-accent hover:underline text-sm motion-hover"
              onClick={() => onGoTo(stepIndex)}
            >
              <ChevronRight size={16} aria-hidden="true" />
              <span>
                {t('step.labelShort', { number: stepIndex + 1 })} ·{' '}
                {step.id ?? exerciseId}
              </span>
              <span className="text-content-muted ml-1">
                · {t(`topic.pendingReason.${reason}`)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
