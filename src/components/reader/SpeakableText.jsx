import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useSpeak } from '@/lib/audio/useSpeak.js';
import { useSpeakerDiscovered } from '@/lib/audio/useSpeakerDiscovered.js';
import { useSettings } from '@/store/useSettingsStore.js';

/*
 * SpeakableText · §92 + §98
 *
 * Envolta un text alemany amb un wrapper clickable (pill editorial)
 * que, al clicar, reprodueix l'àudio. Dues capes:
 *
 *   1. Si existeix un MP3 prerecorded a `/Kompass/audio/<sha1>.mp3`,
 *      es reprodueix amb qualitat consistent (Azure TTS curat).
 *   2. En cas contrari (404 o error) cau al Web Speech API del
 *      navegador (Fase 1) com a fallback. Si no hi ha ni Web Speech ni
 *      veu alemanya disponible, el text es mostra net sense interacció.
 *
 * Props:
 *   - text: string (alemany NET, sense markers rich). S'usa per al
 *     TTS, per calcular el hash SHA-1 i per a l'aria-label.
 *   - children: nodes React ja parsejats que es rendereixen dins del
 *     pill (preserven negretes, highlights, etc. interiors).
 *     Si no es passen, cau a `text` com a fallback.
 *   - as: tag HTML (per defecte 'span').
 *   - className: classes extra.
 *
 * Visual de discovery (§98, tasca 4):
 *   - Mentre l'usuari no hagi clicat cap SpeakableText, es mostra la
 *     icona <Volume2> al final del pill per indicar l'affordance.
 *   - Un cop descobert (persistit a localStorage.kompass.speaker.discovered),
 *     la icona desapareix a tots els pills; només queda el degradat
 *     subtil de fons + el hover com a senyal persistent.
 */
export function SpeakableText({
  text,
  children,
  as: Tag = 'span',
  className,
  autoPlay = false, // Si true, reprodueix automàticament un cop muntat
}) {
  const { speak, isSupported, hasGermanVoice } = useSpeak();
  const { discovered, markDiscovered } = useSpeakerDiscovered();
  const settings = useSettings();
  const [active, setActive] = useState(false);
  const [hash, setHash] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null); // null = no provat, '' = provat i no existeix
  const audioRef = useRef(null);

  // Calcula SHA-1 del text net de manera async un cop muntat. Si el
  // navegador no té subtle.crypto (entorns molt antics), deixem hash null
  // i el component farà servir només Web Speech.
  useEffect(() => {
    if (!text || typeof window === 'undefined') return;
    const subtle = window.crypto && window.crypto.subtle;
    if (!subtle) return;
    let cancelled = false;
    const bytes = new TextEncoder().encode(text);
    subtle
      .digest('SHA-1', bytes)
      .then((buf) => {
        if (cancelled) return;
        const arr = Array.from(new Uint8Array(buf));
        const hex = arr.map((b) => b.toString(16).padStart(2, '0')).join('');
        setHash(hex);
      })
      .catch(() => {
        // Silenci: sense hash, caiem a Web Speech.
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  // Un cop tenim el hash, provem si existeix el MP3 prerecorded. HEAD
  // seria més barat però alguns CDN no el suporten; fem un GET amb
  // mètode audio.src i deixem que el navegador faci el preflight.
  // En aquesta fase no hi ha fitxers reals, així que el 404 és
  // l'escenari habitual.
  useEffect(() => {
    if (!hash) return;
    const base = import.meta.env?.BASE_URL || '/';
    const url = `${base}audio/${hash}.mp3`;
    let cancelled = false;
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setAudioUrl(url);
        else setAudioUrl('');
      })
      .catch(() => {
        if (!cancelled) setAudioUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  // Si no hi ha cap manera de reproduir àudio (ni Web Speech ni possible
  // MP3), renderitzem com a text pla. Tanmateix, com que el hash + fetch
  // és async, per defecte assumim que pot arribar àudio i NO bloquegem
  // la interactivitat. Només degradem a text pla si:
  //   - el navegador no suporta speechSynthesis, i
  //   - el probe d'MP3 ha retornat negatiu.
  const canFallbackToSpeech = isSupported && hasGermanVoice;
  const mp3Probed = audioUrl !== null;
  const hasPrerecorded = audioUrl && audioUrl.length > 0;
  const cannotPlay = !canFallbackToSpeech && mp3Probed && !hasPrerecorded;

  if (cannotPlay) {
    return <Tag className={className}>{children ?? text}</Tag>;
  }

  // Reprodueix l'MP3 prerecorded si està disponible, o cau al fallback
  // de Web Speech.
  const playPrerecorded = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      }
      audioRef.current.currentTime = 0;
      // Velocitat de reproducció controlada pel slider a Settings (§98).
      // Rang 0.8–1.2; fora d'aquest marge el MP3 comença a sonar estrany.
      audioRef.current.playbackRate = settings.audioSpeed || 1.0;
      const p = audioRef.current.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Si la reproducció falla (p. ex. el fitxer existia al probe
          // però ara no es pot carregar), caiem al Web Speech.
          if (canFallbackToSpeech) speak(text);
        });
      }
      audioRef.current.onerror = () => {
        if (canFallbackToSpeech) speak(text);
      };
    } catch {
      if (canFallbackToSpeech) speak(text);
    }
  };

  const onActivate = () => {
    setActive(true);
    markDiscovered();
    if (hasPrerecorded) {
      playPrerecorded();
    } else if (canFallbackToSpeech) {
      speak(text);
    }
    // Reset del marcador visual "is-playing" després d'un temps estimat.
    window.setTimeout(() => setActive(false), Math.min(200 * text.length, 6000));
  };

  /*
   * Autoplay single-pill (§98): quan el parent passa autoPlay=true
   * (p. ex. ExampleBeat amb deDone=true + settings.audioAutoplay), el
   * pill es reprodueix automàticament 200ms després d'haver-se muntat
   * o del probe de l'MP3. Es dispara un cop per combinació text+autoPlay
   * per evitar bucles quan canvien les dependències.
   */
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (!autoPlay) {
      autoPlayedRef.current = false;
      return undefined;
    }
    if (autoPlayedRef.current) return undefined;
    // Esperem que mp3Probed o canFallbackToSpeech tinguin algun valor
    // vàlid (si cap dels dos, no podem fer res i saltem).
    if (!hasPrerecorded && !canFallbackToSpeech && mp3Probed) return undefined;
    const t = window.setTimeout(() => {
      autoPlayedRef.current = true;
      onActivate();
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hasPrerecorded, canFallbackToSpeech, mp3Probed]);

  return (
    <Tag
      className={[
        'kf-speak',
        active ? 'is-playing' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onActivate();
        }
      }}
      aria-label={`Escolta: ${text}`}
      title="Escolta la pronúncia"
    >
      {children ?? text}
      {!discovered && (
        <Volume2
          className="kf-speak-icon"
          size={12}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </Tag>
  );
}
