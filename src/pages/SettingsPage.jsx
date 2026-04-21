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
import {
  SegmentedControl,
  Toggle,
  SettingRow,
  SectionHeading,
  TypewriterPreview,
} from '@/components/settings/controls.jsx';

/*
 * SettingsPage · ARCHITECTURE §17.8
 * Centralitza tots els controls d'ajustos: aparença (tema, mida del text),
 * lectura (mode d'estudi, typewriter + velocitat, tableAnim) i reset. Els
 * canvis s'apliquen immediatament — no hi ha botó "Desar".
 *
 * Els controls són compartits amb el drawer de settings del reader
 * (ReaderSettingsDrawer), així que la UX és consistent a tot arreu.
 */

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
