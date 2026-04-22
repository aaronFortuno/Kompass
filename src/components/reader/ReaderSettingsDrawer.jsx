import { useEffect } from 'react';
import {
  Sun,
  Moon,
  Type,
  Film,
  Table2,
  BookOpen,
  ScrollText,
  Gauge,
  Play,
  Timer,
  Volume2,
  Mic,
  Rabbit,
  Focus,
  X as CloseIcon,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useSettingsStore, TEXT_SCALE_VALUES } from '@/store/useSettingsStore';
import {
  SegmentedControl,
  Toggle,
  SettingRow,
  SectionHeading,
} from '@/components/settings/controls.jsx';

/*
 * Drawer de settings del reader · §79
 *
 * S'obre des del peu del reader o amb la drecera de teclat "c" (config).
 * Conté els ajustos rellevants per a la lectura — els mateixos controls
 * que /settings, però presentats com a panell lateral perquè l'usuari
 * els pugui canviar sense sortir de la lliçó. Estat sincronitzat via
 * useSettingsStore (store únic).
 *
 * Esc tanca el drawer (capturat a l'inici perquè no surti del reader).
 * Clic al backdrop també tanca.
 */
export function ReaderSettingsDrawer({ open, onClose }) {
  const { t } = useT();

  const theme = useSettingsStore((s) => s.theme);
  const textScale = useSettingsStore((s) => s.textScale);
  const studyMode = useSettingsStore((s) => s.studyMode);
  const typewriter = useSettingsStore((s) => s.typewriter);
  const typewriterSpeed = useSettingsStore((s) => s.typewriterSpeed);
  const tableAnim = useSettingsStore((s) => s.tableAnim);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const autoPlayDelay = useSettingsStore((s) => s.autoPlayDelay);
  const audioAutoplay = useSettingsStore((s) => s.audioAutoplay);
  const audioSpeed = useSettingsStore((s) => s.audioSpeed);
  const audioVoice = useSettingsStore((s) => s.audioVoice);
  const focusMode = useSettingsStore((s) => s.focusMode);

  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTextScale = useSettingsStore((s) => s.setTextScale);
  const setStudyMode = useSettingsStore((s) => s.setStudyMode);
  const setTypewriter = useSettingsStore((s) => s.setTypewriter);
  const setTypewriterSpeed = useSettingsStore((s) => s.setTypewriterSpeed);
  const setTableAnim = useSettingsStore((s) => s.setTableAnim);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const setAutoPlayDelay = useSettingsStore((s) => s.setAutoPlayDelay);
  const setAudioAutoplay = useSettingsStore((s) => s.setAudioAutoplay);
  const setAudioSpeed = useSettingsStore((s) => s.setAudioSpeed);
  const setAudioVoice = useSettingsStore((s) => s.setAudioVoice);
  const setFocusMode = useSettingsStore((s) => s.setFocusMode);

  // Esc tanca el drawer (abans que el handler del reader tanqui tot)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return (
    <>
      <div
        className={['kf-drawer-backdrop', open ? 'is-open' : ''].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={['kf-drawer', open ? 'is-open' : ''].join(' ')}
        aria-label={t('settings.title')}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        <header className="kf-drawer-header">
          <h2 className="kf-drawer-title">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="kf-drawer-close"
            aria-label="Tanca"
          >
            <CloseIcon size={16} strokeWidth={1.75} />
          </button>
        </header>

        <div className="kf-drawer-body">
          <section className="mb-6">
            <SectionHeading>{t('settings.appearance.title')}</SectionHeading>

            <SettingRow
              id="drawer-theme"
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
              id="drawer-textscale"
              icon={Type}
              title={t('settings.appearance.textScale')}
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={TEXT_SCALE_VALUES[0]}
                  max={TEXT_SCALE_VALUES[TEXT_SCALE_VALUES.length - 1]}
                  step={0.05}
                  value={textScale}
                  onChange={(e) => setTextScale(Number(e.target.value))}
                  aria-labelledby="drawer-textscale"
                  className="w-32 accent-reader-ink"
                />
                <span className="font-mono text-[11px] text-reader-ink-2 w-10 text-right">
                  {Math.round(textScale * 100)}%
                </span>
              </div>
            </SettingRow>
          </section>

          <section>
            <SectionHeading>{t('settings.reading.title')}</SectionHeading>

            <SettingRow
              id="drawer-studymode"
              icon={studyMode === 'fragment' ? BookOpen : ScrollText}
              title={t('settings.reading.studyMode')}
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
              id="drawer-typewriter"
              icon={Film}
              title={t('settings.reading.typewriter')}
            >
              <Toggle
                checked={typewriter}
                onChange={setTypewriter}
                label={t('settings.reading.typewriter')}
                id="drawer-typewriter"
              />
            </SettingRow>

            <SettingRow
              id="drawer-speed"
              icon={Gauge}
              title={t('settings.reading.typewriterSpeed')}
              disabled={!typewriter}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-reader-muted uppercase tracking-wider">
                  {t('settings.reading.typewriterSpeedSlow')}
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={typewriterSpeed}
                  onChange={(e) => setTypewriterSpeed(Number(e.target.value))}
                  aria-labelledby="drawer-speed"
                  className="w-24 accent-reader-ink"
                />
                <span className="font-mono text-[9px] text-reader-muted uppercase tracking-wider">
                  {t('settings.reading.typewriterSpeedFast')}
                </span>
              </div>
            </SettingRow>

            <SettingRow
              id="drawer-tableanim"
              icon={Table2}
              title={t('settings.reading.tableAnim')}
            >
              <Toggle
                checked={tableAnim}
                onChange={setTableAnim}
                label={t('settings.reading.tableAnim')}
                id="drawer-tableanim"
              />
            </SettingRow>

            <SettingRow
              id="drawer-autoplay"
              icon={Play}
              title={t('settings.reading.autoPlay')}
            >
              <Toggle
                checked={autoPlay}
                onChange={setAutoPlay}
                label={t('settings.reading.autoPlay')}
                id="drawer-autoplay"
              />
            </SettingRow>

            <SettingRow
              id="drawer-autoplay-delay"
              icon={Timer}
              title={t('settings.reading.autoPlayDelay')}
              disabled={!autoPlay}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={autoPlayDelay}
                  onChange={(e) => setAutoPlayDelay(Number(e.target.value))}
                  aria-labelledby="drawer-autoplay-delay"
                  className="w-28 accent-reader-ink"
                />
                <span className="font-mono text-[10px] text-reader-ink-2 w-8 text-right">
                  {autoPlayDelay}s
                </span>
              </div>
            </SettingRow>
          </section>

          {/* Secció Àudio · §98 */}
          <section className="mt-6">
            <SectionHeading>Àudio</SectionHeading>

            <SettingRow
              id="drawer-audio-autoplay"
              icon={Volume2}
              title="Reproduir automàticament"
              help="Reprodueix el pill principal del beat en acabar el typewriter."
            >
              <Toggle
                checked={audioAutoplay}
                onChange={setAudioAutoplay}
                label="Reproduir automàticament"
                id="drawer-audio-autoplay"
              />
            </SettingRow>

            <SettingRow
              id="drawer-audio-speed"
              icon={Rabbit}
              title="Velocitat de l'àudio"
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.05}
                  value={audioSpeed}
                  onChange={(e) => setAudioSpeed(Number(e.target.value))}
                  aria-labelledby="drawer-audio-speed"
                  className="w-28 accent-reader-ink"
                />
                <span className="font-mono text-[10px] text-reader-ink-2 w-10 text-right">
                  {audioSpeed.toFixed(2)}×
                </span>
              </div>
            </SettingRow>

            <SettingRow
              id="drawer-focus-mode"
              icon={Focus}
              title="Mode focus"
              help="Amaga capçalera, peu i índex. Drecera: tecla f."
            >
              <Toggle
                checked={focusMode}
                onChange={setFocusMode}
                label="Mode focus"
                id="drawer-focus-mode"
              />
            </SettingRow>

            <SettingRow
              id="drawer-audio-voice"
              icon={Mic}
              title="Veu"
              help="Aviat: més veus alemanyes per triar."
            >
              <select
                id="drawer-audio-voice"
                value={audioVoice}
                onChange={(e) => setAudioVoice(e.target.value)}
                className="font-mono text-[11px] bg-reader-paper border border-reader-rule text-reader-ink px-2 py-1 rounded"
              >
                <option value="seraphina">Seraphina (càlida · actual)</option>
                <option value="florian" disabled>Florian (aviat)</option>
                <option value="katja" disabled>Katja (aviat)</option>
              </select>
            </SettingRow>
          </section>
        </div>
      </aside>
    </>
  );
}
