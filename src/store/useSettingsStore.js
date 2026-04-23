import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/*
 * Settings globals · ARCHITECTURE §17.8
 *
 * Persistit a localStorage sota la clau 'kompass.settings'.
 * Gestiona les preferències que afecten el reader i la UI: mode de tema,
 * escala tipogràfica, mode d'estudi (fragment vs full), typewriter i
 * animació de taules.
 *
 * Sincronització cross-pestanya: emetem un CustomEvent cada vegada que
 * canviem l'estat, i escoltem l'event 'storage' per reaccionar a canvis
 * d'altres pestanyes (Zustand persist no ho fa sol).
 */

const SCHEMA_VERSION = 1;

export const TEXT_SCALE_VALUES = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25];

export const DEFAULT_SETTINGS = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'light',
  textScale: 1.0,
  studyMode: 'fragment',
  typewriter: true,
  typewriterSpeed: 3, // 1 (ràpid) – 5 (lent); vegeu beatTransitions.js
  tableAnim: true,
  autoPlay: false,
  // Velocitat base d'auto-advance, 1 (ràpid) – 5 (lent). El FocusReader
  // escala amb la llargada del beat: el nivell fixa el temps d'un beat
  // "típic" de 50 chars. Nivell 3 = ~3s/50chars (mitjà).
  autoPlayDelay: 3,
  // Configs d'àudio · §98
  // audioAutoplay: reprodueix automàticament l'àudio alemany dels
  //   beats a mesura que apareixen (pendent wiring sequencial amb el
  //   typewriter per beats multi-pill; el single-pill ja funciona).
  // audioSpeed: velocitat de reproducció de l'MP3 (0.8 → 1.2). Passa
  //   directament a audio.playbackRate sense re-encoding.
  // audioVoice: per un futur selector quan hi hagi més d'una veu.
  //   De moment només 'seraphina'.
  audioAutoplay: false,
  audioSpeed: 1.0,
  audioVoice: 'seraphina',
  // Focus mode · §103: oculta header, peu, sidebar, counter i barra
  // d'autoplay — només resta el contingut central. Toggle amb "f" o al
  // drawer de Settings.
  focusMode: false,
  // Música ambient de fons · §111. Off per defecte; quan s'activa
  // requereix un gest d'usuari per arrencar (autoplay policy del
  // navegador). Volum 0-1. Track apunta a un id del music-manifest.
  //   - bgMusicEnabled: boolean
  //   - bgMusicVolume: 0..1 (volum "normal" — es baixa a 0.15 durant
  //     reproducció d'àudio de veu i es restaura automàticament).
  //   - bgMusicTrack: id del track (p. ex. 'lofi', 'ambient', 'focus').
  //     Si és null, es tria la primera pista disponible del manifest.
  bgMusicEnabled: false,
  bgMusicVolume: 0.25,
  bgMusicTrack: null,
  // §112: modal d'ajustaments global. Transient (no persistit). Es
  // controla via setSettingsOpen / toggleSettings. El NAV/cog de header
  // i el cog del reader + tecla `c` comparteixen aquest flag perquè
  // hi hagi un únic punt d'obertura del modal.
  settingsOpen: false,
};

export const useSettingsStore = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => set({ theme }),
      setTextScale: (textScale) => {
        const clamped = TEXT_SCALE_VALUES.includes(textScale)
          ? textScale
          : Math.min(Math.max(textScale, 0.85), 1.25);
        set({ textScale: clamped });
      },
      setStudyMode: (studyMode) => set({ studyMode }),
      setTypewriter: (typewriter) => set({ typewriter }),
      setTypewriterSpeed: (typewriterSpeed) => {
        const n = Math.round(typewriterSpeed);
        set({ typewriterSpeed: Math.min(5, Math.max(1, n)) });
      },
      setTableAnim: (tableAnim) => set({ tableAnim }),
      setAutoPlay: (autoPlay) => set({ autoPlay: Boolean(autoPlay) }),
      setAutoPlayDelay: (autoPlayDelay) => {
        const n = Math.round(Number(autoPlayDelay));
        set({ autoPlayDelay: Math.min(5, Math.max(1, isNaN(n) ? 3 : n)) });
      },
      setAudioAutoplay: (audioAutoplay) =>
        set({ audioAutoplay: Boolean(audioAutoplay) }),
      setAudioSpeed: (audioSpeed) => {
        const n = Number(audioSpeed);
        set({ audioSpeed: Math.min(1.2, Math.max(0.8, isNaN(n) ? 1.0 : n)) });
      },
      setAudioVoice: (audioVoice) => set({ audioVoice: String(audioVoice) }),
      setFocusMode: (focusMode) => set({ focusMode: Boolean(focusMode) }),
      toggleFocusMode: () =>
        set((s) => ({ focusMode: !s.focusMode })),
      setBgMusicEnabled: (v) => set({ bgMusicEnabled: Boolean(v) }),
      setBgMusicVolume: (v) => {
        const n = Number(v);
        set({ bgMusicVolume: Math.min(1, Math.max(0, isNaN(n) ? 0.25 : n)) });
      },
      setBgMusicTrack: (track) =>
        set({ bgMusicTrack: track == null ? null : String(track) }),
      setSettingsOpen: (v) => set({ settingsOpen: Boolean(v) }),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'kompass.settings',
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        theme: state.theme,
        textScale: state.textScale,
        studyMode: state.studyMode,
        typewriter: state.typewriter,
        typewriterSpeed: state.typewriterSpeed,
        tableAnim: state.tableAnim,
        autoPlay: state.autoPlay,
        autoPlayDelay: state.autoPlayDelay,
        // §98: els nous settings d'àudio també han de persistir entre
        // sessions. Abans es perdien a cada reload perquè no figuraven a
        // l'allowlist del partialize i Zustand només persisteix el que
        // aquest retorna.
        audioAutoplay: state.audioAutoplay,
        audioSpeed: state.audioSpeed,
        audioVoice: state.audioVoice,
        // §103: el mode focus també persistit per consistència.
        focusMode: state.focusMode,
        // §111: música ambient.
        bgMusicEnabled: state.bgMusicEnabled,
        bgMusicVolume: state.bgMusicVolume,
        bgMusicTrack: state.bgMusicTrack,
      }),
      onRehydrateStorage: () => (state) => {
        // Notifica altres components que el hydrate s'ha completat per si
        // depenen de valors reals (p. ex. aplicar data-theme immediatament).
        if (typeof window !== 'undefined' && state) {
          window.dispatchEvent(
            new CustomEvent('kompass-settings-change', { detail: state }),
          );
        }
      },
    },
  ),
);

/*
 * Hook de conveniència: retorna només l'objecte de valors (sense setters)
 * per al consum a components de només-lectura. Els setters es recuperen
 * amb useSettingsStore.getState().setFoo() o useSettingsStore((s) => s.setFoo).
 */
export function useSettings() {
  return useSettingsStore((s) => ({
    theme: s.theme,
    textScale: s.textScale,
    studyMode: s.studyMode,
    typewriter: s.typewriter,
    typewriterSpeed: s.typewriterSpeed,
    tableAnim: s.tableAnim,
    autoPlay: s.autoPlay,
    autoPlayDelay: s.autoPlayDelay,
    audioAutoplay: s.audioAutoplay,
    audioSpeed: s.audioSpeed,
    audioVoice: s.audioVoice,
    focusMode: s.focusMode,
    bgMusicEnabled: s.bgMusicEnabled,
    bgMusicVolume: s.bgMusicVolume,
    bgMusicTrack: s.bgMusicTrack,
  }));
}

/*
 * Subscripció a canvis per sincronitzar-los amb `document.documentElement`
 * (data-theme, dark class, --kf-type-scale) + dispatchEvent.
 * Es crida una sola vegada des de <AppShell> via useEffect.
 */
export function applySettingsToDOM(settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme);
  root.classList.toggle('dark', settings.theme === 'dark');
  root.style.setProperty('--kf-type-scale', String(settings.textScale));
}
