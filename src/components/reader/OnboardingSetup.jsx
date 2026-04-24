import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  X as CloseIcon,
  Settings2,
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore.js';
import { Toggle, TypewriterPreview } from '@/components/settings/controls.jsx';
import musicManifest from '@/audio/music-manifest.json';

/*
 * OnboardingSetup · configuració tècnica inicial guiada
 *
 * Dos components públics:
 *
 *   1. <OnboardingSetup />        — contingut inline del beat
 *      "onboarding-setup" de la lliçó A1a-0. És un card compacte
 *      amb un botó que obre el modal global. No gestiona cap input
 *      de teclat propi perquè no ha de competir amb la navegació
 *      del reader (fletxes, scroll, "p"…).
 *
 *   2. <OnboardingSetupModal />   — modal global, muntat una sola
 *      vegada al shell de l'app. Quan s'obre, captura Escape per
 *      tancar-se i bloqueja les fletxes/scroll perquè no arribin
 *      al reader de sota. Hi viu el wizard de 4 passos.
 *
 * Els 4 passos del wizard:
 *
 *   1. Efecte màquina d'escriure  (typewriter + typewriterSpeed)
 *   2. Mode automàtic              (autoPlay + autoPlayDelay)
 *   3. Àudio natiu                 (audioAutoplay + audioSpeed)
 *   4. Música de fons              (bgMusicEnabled + bgMusicTrack + bgMusicVolume)
 *
 * En completar-lo es marca onboardingCompleted = true al settings store
 * (persistit). Obrir el modal amb el flag ja a true mostra una
 * introducció curta: "Tornem a configurar". Tot és reconfigurable des
 * del ⚙️ global o la tecla 'c'.
 */

const SAMPLE_AUDIO_URL = '/Kompass/audio/aa196176db6c431983ae61e2ea54892890ed07a9.mp3';
const SAMPLE_AUDIO_TEXT = 'Hallo, ich bin Anna.';

const SAMPLE_TYPEWRITER_TEXT =
  'El reader mostra una idea alhora, amb tipografia de paper i ritme de llibre.';

// ─────────────────────────────────────── component inline del beat

export function OnboardingSetup() {
  const completed = useSettingsStore((s) => s.onboardingCompleted);
  const openModal = useSettingsStore((s) => s.setOnboardingSetupOpen);

  return (
    <div className="kf-ex-wrap">
      <div className="kf-ex-card">
        <div className="kf-ex-header">
          <span className="kf-ex-chip">Configuració inicial</span>
          <h3 className="kf-ex-title">
            {completed
              ? 'Ja tens l\'experiència configurada'
              : 'Abans de començar, com vols estudiar?'}
          </h3>
        </div>

        {completed ? (
          <>
            <div className="mt-4 flex items-start gap-3">
              <Check
                size={20}
                className="mt-0.5 flex-shrink-0 text-reader-accent"
                aria-hidden="true"
              />
              <p className="font-serif text-reader-ink-2 leading-relaxed">
                Vas passar pel wizard en una sessió anterior. Les teves preferències es mantenen
                desades al navegador i pots canviar-les quan vulguis.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 font-serif text-reader-ink-2 leading-relaxed">
            Un wizard breu t'ajudarà a triar les preferències bàsiques d'estudi — efecte màquina
            d'escriure, mode automàtic, velocitat de l'àudio i música de fons. Tot amb exemples
            audibles i previsualitzacions, i tot canviable després des de{' '}
            <span className="font-mono text-xs">⚙️ Ajustaments</span>.
          </p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => openModal(true)}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] px-4 py-2.5 bg-reader-ink text-reader-paper rounded-sm hover:opacity-90 transition-opacity duration-fast ease-standard"
          >
            <Settings2 size={14} aria-hidden="true" />
            {completed ? 'Tornar a configurar' : 'Configurar l\'experiència'}
          </button>
        </div>

        <p className="mt-4 font-serif text-xs text-reader-muted">
          Pots saltar-t'ho ara i configurar-ho més tard des del menú o amb la tecla{' '}
          <span className="font-mono">c</span>.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────── modal global

export function OnboardingSetupModal() {
  const open = useSettingsStore((s) => s.onboardingSetupOpen);
  const close = useSettingsStore((s) => s.setOnboardingSetupOpen);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      // Tanca amb Escape i captura les tecles de navegació del reader
      // (fletxes, p, PageUp/Down, c) perquè no arribin al reader de
      // sota — el wizard té la seva navegació interna amb els botons
      // de Anterior/Continuar.
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
        return;
      }
      const blocked = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        ' ',
      ];
      if (blocked.includes(e.key)) {
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <div
        className={['settings-backdrop', open ? 'is-open' : ''].join(' ')}
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div
        className={['settings-modal onboarding-setup-modal', open ? 'is-open' : ''].join(' ')}
        role="dialog"
        aria-modal={open}
        aria-labelledby="onboarding-setup-title"
        aria-hidden={!open}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-modal-header">
          <h2 id="onboarding-setup-title" className="settings-modal-title">
            <Settings2 size={18} aria-hidden="true" strokeWidth={1.75} />
            <span>Configuració inicial</span>
          </h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={() => close(false)}
            aria-label="Tancar wizard"
          >
            <CloseIcon size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="settings-modal-body">
          {open ? <OnboardingWizard onFinish={() => close(false)} /> : null}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────── wizard intern

function OnboardingWizard({ onFinish }) {
  const [stepIdx, setStepIdx] = useState(0);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const steps = [
    { key: 'typewriter', title: 'Efecte màquina d\'escriure', Render: TypewriterStep },
    { key: 'autoplay', title: 'Mode automàtic', Render: AutoPlayStep },
    { key: 'audio', title: 'Àudio en alemany', Render: AudioStep },
    { key: 'music', title: 'Música de fons', Render: MusicStep },
  ];

  const total = steps.length;
  const isLast = stepIdx === total - 1;
  const { Render } = steps[stepIdx];

  const finish = () => {
    setOnboardingCompleted(true);
    onFinish?.();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-serif text-reader-ink-2 leading-relaxed mb-4">
        Tries com vols que es vegi i soni el reader. Cada opció té una previsualització:
        experimenta fins que et sigui còmoda.
      </p>

      <ol className="flex gap-1.5" aria-label="Passos del wizard">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={[
              'h-1 flex-1 rounded-full transition-colors duration-base ease-standard',
              i <= stepIdx ? 'bg-reader-ink' : 'bg-reader-rule',
            ].join(' ')}
            aria-current={i === stepIdx ? 'step' : undefined}
          />
        ))}
      </ol>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
        Pas {stepIdx + 1} de {total} · {steps[stepIdx].title}
      </p>

      <div className="mt-6">
        <Render />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className={[
            'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]',
            'px-3 py-2 border border-reader-rule rounded-sm',
            'transition-colors duration-fast ease-standard',
            stepIdx === 0
              ? 'opacity-40 pointer-events-none'
              : 'hover:bg-reader-paper-2 text-reader-ink-2',
          ].join(' ')}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Anterior
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] px-4 py-2 bg-reader-ink text-reader-paper rounded-sm hover:opacity-90 transition-opacity duration-fast ease-standard"
          >
            Començar a estudiar
            <Check size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.min(total - 1, i + 1))}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] px-4 py-2 bg-reader-ink text-reader-paper rounded-sm hover:opacity-90 transition-opacity duration-fast ease-standard"
          >
            Continuar
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-4 font-serif text-xs text-reader-muted">
        Podràs canviar aquests ajustaments quan vulguis des de{' '}
        <span className="font-mono">⚙️ Ajustaments</span> o amb la tecla{' '}
        <span className="font-mono">c</span>.
      </p>
    </div>
  );
}

// ─────────────────────────────────────── step 1: typewriter

function TypewriterStep() {
  const typewriter = useSettingsStore((s) => s.typewriter);
  const typewriterSpeed = useSettingsStore((s) => s.typewriterSpeed);
  const setTypewriter = useSettingsStore((s) => s.setTypewriter);
  const setTypewriterSpeed = useSettingsStore((s) => s.setTypewriterSpeed);

  return (
    <div>
      <p className="font-serif text-reader-ink leading-relaxed">
        L'efecte <b>màquina d'escriure</b> fa aparèixer el text progressivament, caràcter a
        caràcter, quan arribes a cada fragment. Dona ritme de lectura; sense ell, tot el text
        surt de cop.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 py-3 border-b border-reader-rule">
        <label
          htmlFor="ob-tw-toggle"
          className="flex-1 font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2"
        >
          Activar l'efecte
        </label>
        <Toggle
          id="ob-tw-toggle"
          checked={typewriter}
          onChange={setTypewriter}
          label="Activar l'efecte màquina d'escriure"
        />
      </div>

      <div
        className={[
          'mt-4 transition-opacity duration-base ease-standard',
          typewriter ? 'opacity-100' : 'opacity-50 pointer-events-none',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2">
            Velocitat
          </span>
          <span className="font-mono text-xs text-reader-muted">
            {typewriterSpeed === 1 ? 'lent' : typewriterSpeed === 5 ? 'ràpid' : 'mitjà'} ·{' '}
            {typewriterSpeed}/5
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={typewriterSpeed}
          onChange={(e) => setTypewriterSpeed(Number(e.target.value))}
          className="w-full accent-reader-ink"
          aria-label="Velocitat del typewriter"
        />
        <TypewriterPreview
          active={typewriter}
          speedLevel={typewriterSpeed}
          text={SAMPLE_TYPEWRITER_TEXT}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────── step 2: autoPlay

function AutoPlayStep() {
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const autoPlayDelay = useSettingsStore((s) => s.autoPlayDelay);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const setAutoPlayDelay = useSettingsStore((s) => s.setAutoPlayDelay);

  return (
    <div>
      <p className="font-serif text-reader-ink leading-relaxed">
        El <b>mode automàtic</b> fa que, un cop un fragment s'ha mostrat del tot, el reader
        avanci tot sol al següent després d'un breu temps d'espera. Els exercicis sempre pausen
        l'avanç automàtic fins que els resols.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 py-3 border-b border-reader-rule">
        <label
          htmlFor="ob-ap-toggle"
          className="flex-1 font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2"
        >
          Activar el mode automàtic
        </label>
        <Toggle
          id="ob-ap-toggle"
          checked={autoPlay}
          onChange={setAutoPlay}
          label="Activar mode automàtic"
        />
      </div>

      <div
        className={[
          'mt-4 transition-opacity duration-base ease-standard',
          autoPlay ? 'opacity-100' : 'opacity-50 pointer-events-none',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2">
            Temps entre fragments
          </span>
          <span className="font-mono text-xs text-reader-muted">
            {autoPlayDelay === 1 ? 'ràpid' : autoPlayDelay === 5 ? 'lent' : 'mitjà'} ·{' '}
            {autoPlayDelay}/5
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={autoPlayDelay}
          onChange={(e) => setAutoPlayDelay(Number(e.target.value))}
          className="w-full accent-reader-ink"
          aria-label="Temps entre fragments"
        />
        <p className="mt-4 p-4 bg-reader-paper-2 border border-reader-rule font-serif text-sm text-reader-ink-2 leading-relaxed">
          Amb nivell <b>{autoPlayDelay}</b>, el reader fa una pausa{' '}
          <b>
            {autoPlayDelay === 1
              ? 'molt curta'
              : autoPlayDelay === 2
                ? 'curta'
                : autoPlayDelay === 3
                  ? 'mitjana'
                  : autoPlayDelay === 4
                    ? 'llarga'
                    : 'molt llarga'}
          </b>{' '}
          abans d'avançar. Pots interrompre l'avanç automàtic amb la tecla{' '}
          <span className="font-mono text-xs">p</span> o tocant la pantalla.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────── step 3: audio

function AudioStep() {
  const audioAutoplay = useSettingsStore((s) => s.audioAutoplay);
  const audioSpeed = useSettingsStore((s) => s.audioSpeed);
  const setAudioAutoplay = useSettingsStore((s) => s.setAudioAutoplay);
  const setAudioSpeed = useSettingsStore((s) => s.setAudioSpeed);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playSample = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SAMPLE_AUDIO_URL);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => setPlaying(false);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = audioSpeed || 1.0;
      const p = audioRef.current.play();
      setPlaying(true);
      if (p && typeof p.catch === 'function') {
        p.catch(() => setPlaying(false));
      }
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div>
      <p className="font-serif text-reader-ink leading-relaxed">
        El <b>contingut alemany té pronunciació gravada</b>. Pots clicar cada paraula o frase
        per escoltar-la, i també pots activar la <b>reproducció automàtica</b> perquè soni tota
        sola quan apareix cada fragment.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 py-3 border-b border-reader-rule">
        <label
          htmlFor="ob-aa-toggle"
          className="flex-1 font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2"
        >
          Reproducció automàtica de l'àudio
        </label>
        <Toggle
          id="ob-aa-toggle"
          checked={audioAutoplay}
          onChange={setAudioAutoplay}
          label="Reproducció automàtica de l'àudio"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2">
            Velocitat de la veu
          </span>
          <span className="font-mono text-xs text-reader-muted">
            {audioSpeed.toFixed(2)}×
          </span>
        </div>
        <input
          type="range"
          min="0.8"
          max="1.2"
          step="0.05"
          value={audioSpeed}
          onChange={(e) => setAudioSpeed(Number(e.target.value))}
          className="w-full accent-reader-ink"
          aria-label="Velocitat de la veu"
        />
        <div className="mt-4 p-4 bg-reader-paper-2 border border-reader-rule flex items-center gap-4">
          <button
            type="button"
            onClick={playSample}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] px-3 py-2 border border-reader-rule rounded-sm bg-reader-paper hover:bg-reader-paper-2 transition-colors duration-fast ease-standard"
          >
            <Play size={14} aria-hidden="true" />
            {playing ? 'Reproduint...' : 'Escolta la mostra'}
          </button>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
              Mostra
            </p>
            <p className="font-serif text-reader-ink italic">{SAMPLE_AUDIO_TEXT}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────── step 4: music

function MusicStep() {
  const bgMusicEnabled = useSettingsStore((s) => s.bgMusicEnabled);
  const bgMusicVolume = useSettingsStore((s) => s.bgMusicVolume);
  const bgMusicTrack = useSettingsStore((s) => s.bgMusicTrack);
  const setBgMusicEnabled = useSettingsStore((s) => s.setBgMusicEnabled);
  const setBgMusicVolume = useSettingsStore((s) => s.setBgMusicVolume);
  const setBgMusicTrack = useSettingsStore((s) => s.setBgMusicTrack);

  const tracks = Array.isArray(musicManifest?.tracks) ? musicManifest.tracks : [];
  const currentTrackId = bgMusicTrack || tracks[0]?.id;
  const currentTrack = tracks.find((t) => t.id === currentTrackId) || tracks[0];

  const previewRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    return () => {
      previewRef.current?.pause();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  const stopPreview = () => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
    }
    setPreviewing(false);
  };

  const togglePreview = () => {
    if (previewing) {
      stopPreview();
      return;
    }
    if (!currentTrack) return;
    try {
      previewRef.current = new Audio(currentTrack.src);
      previewRef.current.loop = true;
      previewRef.current.volume = bgMusicVolume;
      previewRef.current.onended = () => setPreviewing(false);
      previewRef.current.onerror = () => setPreviewing(false);
      const p = previewRef.current.play();
      setPreviewing(true);
      if (p && typeof p.catch === 'function') {
        p.catch(() => setPreviewing(false));
      }
    } catch {
      setPreviewing(false);
    }
  };

  const pickTrack = (id) => {
    setBgMusicTrack(id);
    if (previewing) stopPreview();
  };

  return (
    <div>
      <p className="font-serif text-reader-ink leading-relaxed">
        Pots tenir una <b>música ambient</b> sonant de fons mentre estudies. Quan sona un àudio
        en alemany, la música s'abaixa automàticament perquè no et destorbi.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 py-3 border-b border-reader-rule">
        <label
          htmlFor="ob-m-toggle"
          className="flex-1 font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2"
        >
          Activar la música de fons
        </label>
        <Toggle
          id="ob-m-toggle"
          checked={bgMusicEnabled}
          onChange={(v) => {
            setBgMusicEnabled(v);
            if (!v) stopPreview();
          }}
          label="Activar la música de fons"
        />
      </div>

      <div
        className={[
          'mt-4 transition-opacity duration-base ease-standard',
          bgMusicEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none',
        ].join(' ')}
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2 mb-3">
          Tria una pista
        </p>
        <div className="space-y-2">
          {tracks.map((track) => {
            const active = track.id === currentTrackId;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => pickTrack(track.id)}
                className={[
                  'w-full text-left p-3 border rounded-sm transition-colors duration-fast ease-standard',
                  active
                    ? 'bg-reader-paper-2 border-reader-ink'
                    : 'bg-reader-paper border-reader-rule hover:bg-reader-paper-2',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border',
                      active ? 'border-reader-ink bg-reader-ink' : 'border-reader-rule',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <p className="font-serif text-reader-ink">{track.title}</p>
                    <p className="font-serif text-sm text-reader-muted mt-0.5">
                      {track.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 mt-5 mb-3">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-reader-ink-2">
            Volum
          </span>
          <span className="font-mono text-xs text-reader-muted">
            {Math.round(bgMusicVolume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeX size={14} className="flex-shrink-0 text-reader-muted" aria-hidden="true" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bgMusicVolume}
            onChange={(e) => setBgMusicVolume(Number(e.target.value))}
            className="flex-1 accent-reader-ink"
            aria-label="Volum de la música"
          />
          <Volume2 size={14} className="flex-shrink-0 text-reader-muted" aria-hidden="true" />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={togglePreview}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] px-3 py-2 border border-reader-rule rounded-sm bg-reader-paper hover:bg-reader-paper-2 transition-colors duration-fast ease-standard"
          >
            {previewing ? (
              <>
                <Pause size={14} aria-hidden="true" />
                Atura la mostra
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" />
                Escolta la pista
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
