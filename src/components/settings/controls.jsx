import { useEffect, useState } from 'react';
import { Typed } from '@/components/reader/Typed.jsx';
import { resolveTypewriterSpeed } from '@/lib/reader/beatTransitions.js';

/*
 * Controls compartits per a la pàgina /settings i per al drawer de
 * settings al reader. Així la UI d'ajustos es manté coherent a tot arreu
 * i el codi queda en un sol lloc.
 */

export function SegmentedControl({ value, options, onChange, name }) {
  return (
    <div
      className="inline-flex rounded-sm border border-reader-rule bg-reader-paper p-0.5"
      role="radiogroup"
      aria-label={name}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em]',
              'transition-colors duration-fast ease-standard',
              active
                ? 'bg-reader-ink text-reader-paper'
                : 'text-reader-ink-2 hover:text-reader-ink',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={id}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center',
        'rounded-full border border-reader-rule',
        'transition-colors duration-fast ease-standard',
        checked ? 'bg-reader-ink' : 'bg-reader-paper',
      ].join(' ')}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full',
          'shadow',
          'transition-transform duration-fast ease-standard',
          checked
            ? 'translate-x-6 bg-reader-paper'
            : 'translate-x-1 bg-reader-ink-2',
        ].join(' ')}
      />
    </button>
  );
}

export function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  id,
  disabled,
  compact = false,
}) {
  if (compact) {
    // Variant compacta (drawer del reader §98): un únic flex en fila
    // amb icona + títol a l'esquerra i el control a la dreta. Ometem
    // la descripció per estalviar espai vertical — el títol ha de ser
    // autoexplicatiu en aquest context.
    return (
      <div
        className={[
          'flex items-center gap-3 py-3.5 border-b border-reader-rule last:border-b-0',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
      >
        {Icon ? (
          <Icon
            size={18}
            aria-hidden="true"
            className="flex-shrink-0 text-reader-ink-2"
          />
        ) : null}
        <div
          id={id}
          className="font-serif text-[15px] text-reader-ink flex-1 min-w-0 truncate"
        >
          {title}
        </div>
        <div className="flex-shrink-0 flex items-center">{children}</div>
      </div>
    );
  }
  // Layout de dues files:
  //   Row 1: [icon] [title] ───── [control]
  //   Row 2: (indentat amb ml-9)  [description]
  // Abans era flex-wrap, cosa que a columnes mitjanes feia tres files
  // (títol / desc / slider). Ara títol i control sempre conviuen a la
  // mateixa línia; la descripció va a sota alineada amb el títol.
  return (
    <div
      className={[
        'py-5 border-b border-reader-rule last:border-b-0',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-4">
        {Icon ? (
          <Icon
            size={20}
            aria-hidden="true"
            className="flex-shrink-0 text-reader-ink-2"
          />
        ) : null}
        <div
          id={id}
          className="font-serif text-lg text-reader-ink flex-1 min-w-0"
        >
          {title}
        </div>
        <div className="flex-shrink-0 flex items-center">{children}</div>
      </div>
      {description ? (
        <p className="mt-1 ml-9 text-sm text-reader-ink-2 font-serif">{description}</p>
      ) : null}
    </div>
  );
}

export function SectionHeading({ children }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-muted mb-4">
      {children}
    </h2>
  );
}

/*
 * Preview que mostra l'efecte typewriter en viu amb la velocitat actual.
 * Es re-monta (via key) cada cop que canvia la velocitat per reiniciar
 * l'animació. Quan typewriter està desactivat, mostra el text estàtic.
 */
export function TypewriterPreview({ active, speedLevel, text }) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    setCycle((c) => c + 1);
  }, [speedLevel, active]);

  const speedMs = resolveTypewriterSpeed(speedLevel);
  return (
    <div className="mt-3 p-5 bg-reader-paper-2 border border-reader-rule">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted mb-3">
        Vista prèvia
      </p>
      <div className="font-serif text-xl text-reader-ink leading-snug min-h-[3.5em]">
        <Typed
          key={cycle}
          text={text}
          speed={speedMs}
          startDelay={200}
          active={active}
          as="span"
        />
      </div>
    </div>
  );
}
