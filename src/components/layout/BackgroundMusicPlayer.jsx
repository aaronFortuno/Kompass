import { useEffect, useRef } from 'react';
import { useSettings } from '@/store/useSettingsStore.js';
import musicManifest from '@/audio/music-manifest.json';

/*
 * BackgroundMusicPlayer · §111
 *
 * Reproductor d'àudio ambient per a sessions d'estudi. Muntat a
 * AppShell perquè sobrevisqui a la navegació entre rutes — la música
 * no es talla en canviar de pàgina ni de lliçó.
 *
 * Característiques clau:
 *
 *   1. **Gating d'autoplay**: la majoria de navegadors requereixen un
 *      gest d'usuari abans de reproduir àudio. Per això el play només
 *      s'intenta quan l'usuari activa explícitament el toggle a
 *      Settings (primer click = gest vàlid); si el `.play()` retorna
 *      rejected, apaguem el flag i deixem al user tornar-ho a
 *      intentar.
 *
 *   2. **Auto-ducking**: durant la reproducció d'àudio de veu (events
 *      `kompass:speakable-activated`), el volum baixa al 30% del
 *      configurat. Es restaura al 100% quan es dispara
 *      `kompass:speakable-ended` o `kompass:beat-audio-complete`.
 *      També recupera si `kompass:speak-stop` (p. ex. barra d'espai).
 *      Transició suau via requestAnimationFrame.
 *
 *   3. **Loop** amb `audio.loop = true`.
 *
 *   4. **Fade-in/out** quan s'activa/desactiva el reproductor (evita
 *      salts secs).
 *
 * Si el manifest no té cap pista (p. ex. durant el desenvolupament
 * abans que el pipeline de selecció de música hagi aportat fitxers),
 * el component no renderitza res i tot el sistema queda inert.
 */

const DUCK_RATIO = 0.3; // Volum durant audio de veu (×volumeTarget)
const FADE_MS = 400;    // Durada del fade-in/out general
const DUCK_MS = 180;    // Transició ràpida al baixar/pujar volum
// Escalat global del volum efectiu vs el valor UI. La música és de
// fons per concentrar-se, no per escoltar, per això el 100% UI
// només correspon al 35% real del <audio>. Així els sliders tenen
// marge alt sense mai competir amb la veu dels pills.
const VOLUME_SCALE = 0.35;

function pickTrack(preferredId) {
  const tracks = Array.isArray(musicManifest?.tracks) ? musicManifest.tracks : [];
  if (!tracks.length) return null;
  if (preferredId) {
    const hit = tracks.find((t) => t.id === preferredId);
    if (hit) return hit;
  }
  return tracks[0];
}

/*
 * Anima el volum d'un HTMLAudioElement de `from` a `to` en `durationMs`.
 * Retorna una funció de cancel·lació (si cal aturar l'anim mid-fade).
 */
function animateVolume(audio, from, to, durationMs) {
  const start = performance.now();
  let raf = 0;
  audio.volume = Math.max(0, Math.min(1, from));
  const tick = (now) => {
    const t = Math.min(1, (now - start) / Math.max(1, durationMs));
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}

export function BackgroundMusicPlayer() {
  const settings = useSettings();
  const audioRef = useRef(null);
  const cancelFadeRef = useRef(null);
  // Volum "target" de fons: el valor UI escalat per VOLUME_SCALE.
  // Es baixa durant àudio de veu però aquest valor es manté perquè
  // sabem a què tornar.
  const targetVolumeRef = useRef(settings.bgMusicVolume * VOLUME_SCALE);
  // Flag: estem "amagats" per àudio de veu.
  const isDuckedRef = useRef(false);

  const track = pickTrack(settings.bgMusicTrack);

  // Mantenim targetVolumeRef sincronitzat amb settings, aplicant
  // l'escalat global.
  useEffect(() => {
    const effectiveTarget = settings.bgMusicVolume * VOLUME_SCALE;
    targetVolumeRef.current = effectiveTarget;
    const audio = audioRef.current;
    if (!audio) return;
    // Si no estem ducked, apliquem el volum target directament (sense
    // fade perquè és una acció explícita de l'usuari al slider).
    if (!isDuckedRef.current) {
      audio.volume = effectiveTarget;
    } else {
      // Si estem ducked, ajustem el nivell ducked també.
      audio.volume = effectiveTarget * DUCK_RATIO;
    }
  }, [settings.bgMusicVolume]);

  // Arranca/atura segons bgMusicEnabled. Si l'autoplay està bloquejat
  // pel navegador, no desactivem el toggle — ens enganxem al proper
  // pointerdown/keydown/touchstart global per reintentar el play.
  // Així l'usuari no perd la intenció i la música arrenca en el
  // proper gest que faci a la pàgina.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return undefined;

    if (!settings.bgMusicEnabled) {
      // Fade-out + pause
      if (!audio.paused) {
        if (cancelFadeRef.current) cancelFadeRef.current();
        cancelFadeRef.current = animateVolume(audio, audio.volume, 0, FADE_MS);
        const stopTimer = window.setTimeout(() => {
          try {
            audio.pause();
          } catch {
            /* noop */
          }
        }, FADE_MS + 30);
        return () => window.clearTimeout(stopTimer);
      }
      return undefined;
    }

    audio.loop = true;
    let cancelled = false;
    let retryListener = null;

    const fadeIn = () => {
      if (cancelFadeRef.current) cancelFadeRef.current();
      cancelFadeRef.current = animateVolume(
        audio,
        audio.volume,
        targetVolumeRef.current,
        FADE_MS,
      );
    };

    const attemptPlay = () => {
      if (cancelled) return;
      // Només arrenquem si encara està pausat (un reintent anterior
      // podria haver funcionat).
      if (!audio.paused) return;
      audio.volume = 0;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!cancelled) fadeIn();
        }).catch(() => {
          // Bloquejat. Registrem listener one-shot per reintentar al
          // proper gest de l'usuari.
          if (cancelled || retryListener) return;
          retryListener = () => {
            window.removeEventListener('pointerdown', retryListener);
            window.removeEventListener('keydown', retryListener);
            window.removeEventListener('touchstart', retryListener);
            retryListener = null;
            attemptPlay();
          };
          window.addEventListener('pointerdown', retryListener, { once: true });
          window.addEventListener('keydown', retryListener, { once: true });
          window.addEventListener('touchstart', retryListener, { once: true });
        });
      } else {
        // Navegadors molt antics sense Promise a .play() — assumim èxit.
        fadeIn();
      }
    };

    attemptPlay();

    return () => {
      cancelled = true;
      if (retryListener) {
        window.removeEventListener('pointerdown', retryListener);
        window.removeEventListener('keydown', retryListener);
        window.removeEventListener('touchstart', retryListener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.bgMusicEnabled, track?.id]);

  // Auto-ducking per àudio de veu.
  useEffect(() => {
    if (!settings.bgMusicEnabled) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    const duck = () => {
      if (isDuckedRef.current) return;
      isDuckedRef.current = true;
      if (cancelFadeRef.current) cancelFadeRef.current();
      cancelFadeRef.current = animateVolume(
        audio,
        audio.volume,
        targetVolumeRef.current * DUCK_RATIO,
        DUCK_MS,
      );
    };
    const restore = () => {
      if (!isDuckedRef.current) return;
      isDuckedRef.current = false;
      if (cancelFadeRef.current) cancelFadeRef.current();
      cancelFadeRef.current = animateVolume(
        audio,
        audio.volume,
        targetVolumeRef.current,
        DUCK_MS,
      );
    };

    window.addEventListener('kompass:speakable-activated', duck);
    window.addEventListener('kompass:speakable-ended', restore);
    window.addEventListener('kompass:beat-audio-complete', restore);
    window.addEventListener('kompass:speak-stop', restore);
    return () => {
      window.removeEventListener('kompass:speakable-activated', duck);
      window.removeEventListener('kompass:speakable-ended', restore);
      window.removeEventListener('kompass:beat-audio-complete', restore);
      window.removeEventListener('kompass:speak-stop', restore);
    };
  }, [settings.bgMusicEnabled]);

  if (!track) return null;

  // Renderitzem un element <audio> ocult. Ni controls ni estil — el
  // control viu a Settings. aria-hidden perquè no aparegui als lectors
  // de pantalla com a "reproductor extra".
  return (
    <audio
      ref={audioRef}
      src={track.src}
      preload="none"
      aria-hidden="true"
      style={{ display: 'none' }}
    />
  );
}
