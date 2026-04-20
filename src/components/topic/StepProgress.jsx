import { useT } from '@/i18n';

/*
 * Indicador de progrés híbrid · ARCHITECTURE §18
 * Mòbil: dots clicables, un per step. L'actiu destaca en accent,
 * els visitats en content-muted, els pendents en border.
 * Desktop: barra amb fill progressiu + marcadors clicables a sota.
 */
export function StepProgress({ steps, currentIndex, onJump }) {
  const { t } = useT();
  const total = steps.length;
  const pct = ((currentIndex + 1) / total) * 100;

  return (
    <div className="space-y-2" aria-label={t('step.progress', { current: currentIndex + 1, total })}>
      {/* Mobile: dots */}
      <div className="flex md:hidden gap-2 items-center justify-center flex-wrap">
        {steps.map((step, i) => {
          const active = i === currentIndex;
          const visited = i < currentIndex;
          return (
            <button
              key={step.id ?? i}
              type="button"
              className={[
                'w-3 h-3 rounded-full motion-hover',
                active ? 'bg-accent scale-125' : visited ? 'bg-content-muted' : 'bg-border',
              ].join(' ')}
              style={{ minHeight: '24px', minWidth: '24px', padding: '6px' }}
              aria-label={t('step.goToStep', { number: i + 1 })}
              aria-current={active ? 'step' : undefined}
              onClick={() => onJump(i)}
            />
          );
        })}
      </div>

      {/* Desktop: barra amb ticks clicables */}
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
            return (
              <button
                key={step.id ?? i}
                type="button"
                className={[
                  'flex-1 text-xs py-1 rounded-sm motion-hover',
                  active ? 'text-accent font-semibold' : 'text-content-muted hover:text-content',
                ].join(' ')}
                aria-label={t('step.goToStep', { number: i + 1 })}
                aria-current={active ? 'step' : undefined}
                title={step.id ?? `${i + 1}`}
                onClick={() => onJump(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
