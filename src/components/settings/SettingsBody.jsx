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
import {
  SegmentedControl,
  Toggle,
  SettingRow,
  SectionHeading,
  TypewriterPreview,
} from '@/components/settings/controls.jsx';
import musicManifest from '@/audio/music-manifest.json';

/*
 * SettingsBody · §112
 *
 * Cos unificat del panell d'ajustaments. Viu dins del SettingsModal,
 * és l'única font de veritat per a la UI dels controls — abans hi havia
 * dues implementacions (pàgina i drawer del reader) que podien divergir
 * i provocaven que algunes settings només fossin accessibles a una
 * banda.
 *
 * Organitzat en seccions agrupades semànticament. El modal que l'emboquil
 * decideix el layout (2-col a desktop, apilat a mòbil).
 *
 * Totes les seccions s'autosuprimeixen si la seva condició no es
 * compleix (p. ex. Música si no hi ha pistes al manifest). Res
 * hardcodat aquí — les fonts de dades vénen dels stores o dels
 * manifests importats.
 */
export function SettingsBody() {
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

  const hasMusic = Array.isArray(musicManifest?.tracks) && musicManifest.tracks.length > 0;

  return (
    <div className="settings-grid">
      {/* Columna 1 · només Lectura (prou llarg per omplir el seu espai) */}
      <div className="settings-col">
        <section>
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
            description="Amaga tot el que envolta el contingut (capçalera, peu, índex i barres) perquè només quedi el fragment a pantalla. Ideal per concentrar-se. Drecera: tecla «f»."
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
                aria-labelledby="setting-typewriter-speed"
                className="w-32 accent-reader-ink"
              />
              <span className="font-mono text-[9px] text-reader-muted uppercase tracking-wider">
                {t('settings.reading.typewriterSpeedFast')}
              </span>
            </div>
          </SettingRow>

          {typewriter ? (
            <div className="ml-9 pl-4 border-l-2 border-reader-rule mb-4">
              <TypewriterPreview
                active={typewriter}
                speedLevel={typewriterSpeed}
                text={t('settings.reading.typewriterPreview')}
              />
            </div>
          ) : null}

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
            disabled={!autoPlay}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-reader-muted uppercase tracking-wider">
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
              <span className="font-mono text-[9px] text-reader-muted uppercase tracking-wider">
                {t('settings.reading.typewriterSpeedSlow')}
              </span>
            </div>
          </SettingRow>
        </section>
      </div>

      {/* Columna 2 · Aparença → Àudio (+Música integrada) → Reset */}
      <div className="settings-col">
        <section>
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
                className="w-44 accent-reader-ink"
              />
              <span className="font-mono text-[11px] text-reader-ink-2 w-10 text-right">
                {Math.round(textScale * 100)}%
              </span>
            </div>
          </SettingRow>
        </section>

        <section className="mt-10">
          <SectionHeading>Àudio</SectionHeading>

          <SettingRow
            id="setting-audio-autoplay"
            icon={Volume2}
            title="Reproduir l'àudio sense clicar"
            description="Quan apareix un fragment, l'àudio alemany sona tot sol sense que hi hagis de clicar. Si a més tens l'efecte màquina d'escriure activat, sona just quan s'acaba d'escriure el text."
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
            title="Velocitat de la veu"
            description="Accelera o alenteix la pronunciació (de 0.8× a 1.2×). El to no canvia, així que la veu no sona ni de robot ni de dibuixos animats."
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
                className="w-40 accent-reader-ink"
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
            description="Una veu femenina càlida, generada amb el TTS neuronal d'Azure. Aviat n'hi haurà més per triar."
          >
            <select
              id="setting-audio-voice"
              value={audioVoice}
              onChange={(e) => setAudioVoice(e.target.value)}
              className="font-mono text-[11px] bg-reader-paper border border-reader-rule text-reader-ink px-2 py-1 rounded-sm"
            >
              <option value="seraphina">Seraphina (càlida · actual)</option>
              <option value="florian" disabled>Florian (aviat)</option>
              <option value="katja" disabled>Katja (aviat)</option>
            </select>
          </SettingRow>

          {hasMusic ? (
          <>
            <SettingRow
              id="setting-bgmusic-enabled"
              icon={Music2}
              title="Música ambient de fons"
              description="Un bucle suau mentre estudies. Quan sona un àudio alemany, la música s'abaixa sola perquè no es trepitgin."
            >
              <Toggle
                checked={bgMusicEnabled}
                onChange={setBgMusicEnabled}
                label="Música ambient de fons"
                id="setting-bgmusic-enabled"
              />
            </SettingRow>

            {bgMusicEnabled ? (
              <>
                <SettingRow
                  id="setting-bgmusic-track"
                  icon={ListMusic}
                  title="Pista"
                >
                  <select
                    id="setting-bgmusic-track"
                    value={bgMusicTrack || musicManifest.tracks[0].id}
                    onChange={(e) => setBgMusicTrack(e.target.value)}
                    className="font-mono text-[11px] bg-reader-paper border border-reader-rule text-reader-ink px-2 py-1 rounded-sm"
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
                  title="Volum música"
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
          </>
        ) : null}
        </section>

        <section className="mt-12 pt-8 border-t border-reader-rule">
          <SectionHeading>{t('settings.reset.title')}</SectionHeading>
          <div className="flex items-center justify-between gap-4">
            <p className="font-serif text-sm text-reader-ink-2 max-w-[28ch]">
              {t('settings.reset.description')}
            </p>
            <button
              type="button"
              onClick={reset}
              className={[
                'inline-flex items-center gap-2 px-3 py-2 rounded-sm',
                'border border-reader-ink text-reader-ink',
                'font-mono text-[10px] uppercase tracking-wider',
                'hover:bg-reader-ink hover:text-reader-paper',
                'transition-colors duration-fast ease-standard flex-shrink-0',
              ].join(' ')}
            >
              <RotateCcw size={13} aria-hidden="true" />
              {t('settings.reset.button')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
