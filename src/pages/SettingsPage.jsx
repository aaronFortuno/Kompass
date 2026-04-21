import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Type,
  Film,
  Table2,
  RotateCcw,
  BookOpen,
  ScrollText,
  Gauge,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useSettingsStore, TEXT_SCALE_VALUES } from '@/store/useSettingsStore';
import { Typed } from '@/components/reader/Typed.jsx';
import { resolveTypewriterSpeed } from '@/lib/reader/beatTransitions.js';

/*
 * SettingsPage · ARCHITECTURE §17.8
 * Centralitza tots els controls d'ajustos: aparença (tema, mida del text),
 * lectura (mode d'estudi, typewriter + velocitat, tableAnim) i reset. Els
 * canvis s'apliquen immediatament — no hi ha botó "Desar".
 */

function SegmentedControl({ value, options, onChange, name }) {
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
              'px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em]',
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

function Toggle({ checked, onChange, label, id }) {
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

function SettingRow({ icon: Icon, title, description, children, id, disabled }) {
  return (
    <div
      className={[
        'flex items-start gap-4 py-5 border-b border-reader-rule last:border-b-0',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
    >
      <div className="flex-shrink-0 text-reader-ink-2 mt-1">
        {Icon ? <Icon size={20} aria-hidden="true" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div id={id} className="font-serif text-lg text-reader-ink">
          {title}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-reader-ink-2 font-serif">{description}</p>
        ) : null}
      </div>
      <div className="flex-shrink-0 flex items-center pt-1">{children}</div>
    </div>
  );
}

function SectionHeading({ children }) {
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
function TypewriterPreview({ active, speedLevel, text }) {
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

export function SettingsPage() {
  const { t } = useT();
  const theme = useSettingsStore((s) => s.theme);
  const textScale = useSettingsStore((s) => s.textScale);
  const studyMode = useSettingsStore((s) => s.studyMode);
  const typewriter = useSettingsStore((s) => s.typewriter);
  const typewriterSpeed = useSettingsStore((s) => s.typewriterSpeed);
  const tableAnim = useSettingsStore((s) => s.tableAnim);

  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTextScale = useSettingsStore((s) => s.setTextScale);
  const setStudyMode = useSettingsStore((s) => s.setStudyMode);
  const setTypewriter = useSettingsStore((s) => s.setTypewriter);
  const setTypewriterSpeed = useSettingsStore((s) => s.setTypewriterSpeed);
  const setTableAnim = useSettingsStore((s) => s.setTableAnim);
  const reset = useSettingsStore((s) => s.reset);

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-10">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-reader-ink">
          {t('settings.title')}
        </h1>
        <p className="mt-4 font-serif italic text-lg text-reader-ink-2 max-w-prose">
          {t('settings.intro')}
        </p>
      </header>

      <section className="mb-10">
        <SectionHeading>{t('settings.appearance.title')}</SectionHeading>

        <SettingRow
          id="setting-theme"
          icon={theme === 'dark' ? Moon : Sun}
          title={t('settings.appearance.theme')}
        >
          <SegmentedControl
            name={t('settings.appearance.theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('settings.appearance.themeLight') },
              { value: 'dark', label: t('settings.appearance.themeDark') },
            ]}
          />
        </SettingRow>

        <SettingRow
          id="setting-textscale"
          icon={Type}
          title={t('settings.appearance.textScale')}
          description={t('settings.appearance.textScaleHint')}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={TEXT_SCALE_VALUES[0]}
              max={TEXT_SCALE_VALUES[TEXT_SCALE_VALUES.length - 1]}
              step={0.05}
              value={textScale}
              onChange={(e) => setTextScale(Number(e.target.value))}
              aria-labelledby="setting-textscale"
              className="w-40 accent-reader-ink"
            />
            <span className="font-mono text-[11px] text-reader-ink-2 w-10 text-right">
              {Math.round(textScale * 100)}%
            </span>
          </div>
        </SettingRow>

        {/* Preview de la mida del text — s'escala amb --kf-type-scale */}
        <div className="ml-9 pl-5 border-l-2 border-reader-rule mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted mb-2">
            Vista prèvia
          </p>
          <p
            className="font-serif italic text-reader-ink"
            style={{ fontSize: `calc(1.25rem * var(--kf-type-scale, 1))`, lineHeight: 1.4 }}
          >
            {t('settings.appearance.textScalePreview')}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>{t('settings.reading.title')}</SectionHeading>

        <SettingRow
          id="setting-studymode"
          icon={studyMode === 'fragment' ? BookOpen : ScrollText}
          title={t('settings.reading.studyMode')}
          description={
            studyMode === 'fragment'
              ? t('settings.reading.studyModeFragmentDesc')
              : t('settings.reading.studyModeFullDesc')
          }
        >
          <SegmentedControl
            name={t('settings.reading.studyMode')}
            value={studyMode}
            onChange={setStudyMode}
            options={[
              { value: 'fragment', label: t('settings.reading.studyModeFragment') },
              { value: 'full', label: t('settings.reading.studyModeFull') },
            ]}
          />
        </SettingRow>

        <SettingRow
          id="setting-typewriter"
          icon={Film}
          title={t('settings.reading.typewriter')}
          description={t('settings.reading.typewriterDesc')}
        >
          <Toggle
            checked={typewriter}
            onChange={setTypewriter}
            label={t('settings.reading.typewriter')}
            id="setting-typewriter"
          />
        </SettingRow>

        <SettingRow
          id="setting-typewriter-speed"
          icon={Gauge}
          title={t('settings.reading.typewriterSpeed')}
          description={t('settings.reading.typewriterSpeedDesc')}
          disabled={!typewriter}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-reader-muted uppercase tracking-wider">
              {t('settings.reading.typewriterSpeedFast')}
            </span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={typewriterSpeed}
              onChange={(e) => setTypewriterSpeed(Number(e.target.value))}
              aria-labelledby="setting-typewriter-speed"
              className="w-32 accent-reader-ink"
            />
            <span className="font-mono text-[10px] text-reader-muted uppercase tracking-wider">
              {t('settings.reading.typewriterSpeedSlow')}
            </span>
          </div>
        </SettingRow>

        {/* Preview del typewriter — remuntat cada cop que canvia speed */}
        <div className="ml-9 pl-5 border-l-2 border-reader-rule mb-4">
          <TypewriterPreview
            active={typewriter}
            speedLevel={typewriterSpeed}
            text={t('settings.reading.typewriterPreview')}
          />
        </div>

        <SettingRow
          id="setting-tableanim"
          icon={Table2}
          title={t('settings.reading.tableAnim')}
          description={t('settings.reading.tableAnimDesc')}
        >
          <Toggle
            checked={tableAnim}
            onChange={setTableAnim}
            label={t('settings.reading.tableAnim')}
            id="setting-tableanim"
          />
        </SettingRow>
      </section>

      <section className="pt-6 border-t border-reader-rule">
        <SectionHeading>{t('settings.reset.title')}</SectionHeading>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="font-serif text-reader-ink-2">{t('settings.reset.description')}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-sm',
              'border border-reader-ink text-reader-ink',
              'font-mono text-xs uppercase tracking-wider',
              'hover:bg-reader-ink hover:text-reader-paper',
              'transition-colors duration-fast ease-standard',
            ].join(' ')}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t('settings.reset.button')}
          </button>
        </div>
      </section>
    </div>
  );
}
