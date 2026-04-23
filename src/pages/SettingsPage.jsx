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
  Play,
  Timer,
  Volume2,
  Mic,
  Rabbit,
  Focus,
  Music2,
  ListMusic,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useSettingsStore, TEXT_SCALE_VALUES } from '@/store/useSettingsStore';
import musicManifest from '@/audio/music-manifest.json';
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
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const autoPlayDelay = useSettingsStore((s) => s.autoPlayDelay);
  const audioAutoplay = useSettingsStore((s) => s.audioAutoplay);
  const audioSpeed = useSettingsStore((s) => s.audioSpeed);
  const audioVoice = useSettingsStore((s) => s.audioVoice);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const bgMusicEnabled = useSettingsStore((s) => s.bgMusicEnabled);
  const bgMusicVolume = useSettingsStore((s) => s.bgMusicVolume);
  const bgMusicTrack = useSettingsStore((s) => s.bgMusicTrack);

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
  const setBgMusicEnabled = useSettingsStore((s) => s.setBgMusicEnabled);
  const setBgMusicVolume = useSettingsStore((s) => s.setBgMusicVolume);
  const setBgMusicTrack = useSettingsStore((s) => s.setBgMusicTrack);
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
          id="setting-focus-mode"
          icon={Focus}
          title="Mode focus"
          description="Amaga capçalera, peu i índex al reader per concentrar-te només en el contingut. Drecera: tecla f."
        >
          <Toggle
            checked={focusMode}
            onChange={setFocusMode}
            label="Mode focus"
            id="setting-focus-mode"
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
              {t('settings.reading.typewriterSpeedSlow')}
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
              {t('settings.reading.typewriterSpeedFast')}
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

        <SettingRow
          id="setting-autoplay"
          icon={Play}
          title={t('settings.reading.autoPlay')}
          description={t('settings.reading.autoPlayDesc')}
        >
          <Toggle
            checked={autoPlay}
            onChange={setAutoPlay}
            label={t('settings.reading.autoPlay')}
            id="setting-autoplay"
          />
        </SettingRow>

        <SettingRow
          id="setting-autoplay-delay"
          icon={Timer}
          title={t('settings.reading.autoPlayDelay')}
          description={t('settings.reading.autoPlayDelayDesc')}
          disabled={!autoPlay}
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
              value={autoPlayDelay}
              onChange={(e) => setAutoPlayDelay(Number(e.target.value))}
              aria-labelledby="setting-autoplay-delay"
              className="w-32 accent-reader-ink"
            />
            <span className="font-mono text-[10px] text-reader-muted uppercase tracking-wider">
              {t('settings.reading.typewriterSpeedSlow')}
            </span>
          </div>
        </SettingRow>
      </section>

      {/* Secció Àudio · §98 — mateixos controls que al drawer del reader */}
      <section className="mb-10">
        <SectionHeading>Àudio</SectionHeading>

        <SettingRow
          id="setting-audio-autoplay"
          icon={Volume2}
          title="Reproduir automàticament"
          description="Reprodueix el pill principal del beat en acabar el typewriter, amb pausa entre pills per deixar-te assimilar cada so."
        >
          <Toggle
            checked={audioAutoplay}
            onChange={setAudioAutoplay}
            label="Reproduir automàticament"
            id="setting-audio-autoplay"
          />
        </SettingRow>

        <SettingRow
          id="setting-audio-speed"
          icon={Rabbit}
          title="Velocitat de l'àudio"
          description="Escala la reproducció dels MP3 (0.8× ≈ més lent · 1.2× ≈ més ràpid). Fora d'aquest rang els MP3 comencen a sonar estranys."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.8}
              max={1.2}
              step={0.05}
              value={audioSpeed}
              onChange={(e) => setAudioSpeed(Number(e.target.value))}
              aria-labelledby="setting-audio-speed"
              className="w-32 accent-reader-ink"
            />
            <span className="font-mono text-[11px] text-reader-ink-2 w-10 text-right">
              {audioSpeed.toFixed(2)}×
            </span>
          </div>
        </SettingRow>

        <SettingRow
          id="setting-audio-voice"
          icon={Mic}
          title="Veu"
          description="Veu de síntesi per a la pronúncia alemanya. Aviat: més veus (Florian, Katja)."
        >
          <select
            id="setting-audio-voice"
            value={audioVoice}
            onChange={(e) => setAudioVoice(e.target.value)}
            className="font-mono text-[11px] bg-reader-paper border border-reader-rule text-reader-ink px-3 py-1.5 rounded-sm"
          >
            <option value="seraphina">Seraphina (càlida · actual)</option>
            <option value="florian" disabled>Florian (aviat)</option>
            <option value="katja" disabled>Katja (aviat)</option>
          </select>
        </SettingRow>
      </section>

      {Array.isArray(musicManifest?.tracks) && musicManifest.tracks.length > 0 ? (
        <section className="pt-6 border-t border-reader-rule">
          <SectionHeading>Música ambient</SectionHeading>

          <SettingRow
            id="setting-bgmusic-enabled"
            icon={Music2}
            title="Música de fons"
            description="Pistes instrumentals CC0 per sessions d'estudi. S'atenua automàticament quan sona un àudio de veu."
          >
            <Toggle
              checked={bgMusicEnabled}
              onChange={setBgMusicEnabled}
              label="Música de fons"
              id="setting-bgmusic-enabled"
            />
          </SettingRow>

          {bgMusicEnabled ? (
            <>
              <SettingRow
                id="setting-bgmusic-track"
                icon={ListMusic}
                title="Pista"
                description="Tres moods CC0 per triar segons la sessió."
              >
                <select
                  id="setting-bgmusic-track"
                  value={bgMusicTrack || musicManifest.tracks[0].id}
                  onChange={(e) => setBgMusicTrack(e.target.value)}
                  className="font-mono text-[11px] bg-reader-paper border border-reader-rule text-reader-ink px-3 py-1.5 rounded-sm"
                >
                  {musicManifest.tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title || tr.id}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow
                id="setting-bgmusic-volume"
                icon={Gauge}
                title="Volum"
                description="El 100% correspon a un volum mig real — pensat per estudi, no per escoltar música."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgMusicVolume}
                    onChange={(e) => setBgMusicVolume(Number(e.target.value))}
                    aria-labelledby="setting-bgmusic-volume"
                    className="w-40 accent-reader-ink"
                  />
                  <span className="font-mono text-[11px] text-reader-ink-2 w-10 text-right">
                    {Math.round(bgMusicVolume * 100)}%
                  </span>
                </div>
              </SettingRow>
            </>
          ) : null}
        </section>
      ) : null}

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
