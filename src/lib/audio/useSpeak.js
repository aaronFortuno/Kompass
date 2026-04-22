import { useCallback, useEffect, useState } from 'react';

/*
 * useSpeak · Fase 1 Web Speech API · §92
 *
 * Retorna un callback speak(text, lang?) que reprodueix el text via
 * speechSynthesis del navegador. Zero cost, zero dependències, funciona
 * offline amb les veus natives del SO.
 *
 * Estratègia de selecció de veu:
 *   - Prefereix veus amb prefix "de-DE" (català del territori).
 *   - Si no hi ha cap de-DE, qualsevol veu 'de' genèrica.
 *   - Preferència qualitativa: natural/neural en cas de disponibilitat
 *     (noms que continguin "Neural", "Natural", "Premium", "Enhanced").
 *
 * Compatibilitat:
 *   - Retorna { speak, isReady, isSupported }. Si isSupported=false, la
 *     UI pot ocultar els botons d'audio elegantment.
 *   - Al primer mount, les veus tarden uns ms a carregar-se (esdeveniment
 *     'voiceschanged'); per això isReady és false inicialment.
 */
export function useSpeak() {
  const [voices, setVoices] = useState([]);
  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return undefined;
    const syn = window.speechSynthesis;
    const load = () => setVoices(syn.getVoices());
    load();
    syn.addEventListener('voiceschanged', load);
    return () => syn.removeEventListener('voiceschanged', load);
  }, [isSupported]);

  const pickVoice = useCallback(
    (lang = 'de-DE') => {
      if (!voices.length) return null;
      const prefix = lang.split('-')[0]; // "de"
      const strict = voices.filter((v) => v.lang && v.lang.toLowerCase() === lang.toLowerCase());
      const loose = voices.filter((v) =>
        v.lang && v.lang.toLowerCase().startsWith(prefix.toLowerCase()),
      );
      const candidates = strict.length ? strict : loose;
      if (!candidates.length) return null;
      // Prefereix veus amb paraules clau que indiquin qualitat neural.
      const qualityKeywords = /neural|natural|premium|enhanced|studio|wavenet|online/i;
      const preferred = candidates.find((v) => qualityKeywords.test(v.name));
      return preferred || candidates[0];
    },
    [voices],
  );

  const speak = useCallback(
    (text, lang = 'de-DE', opts = {}) => {
      if (!isSupported || !text) return;
      const syn = window.speechSynthesis;
      // Talla qualsevol reproducció en curs abans d'iniciar-ne una nova.
      syn.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const voice = pickVoice(lang);
      if (voice) u.voice = voice;
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 1.0;
      u.volume = opts.volume ?? 1.0;
      syn.speak(u);
    },
    [isSupported, pickVoice],
  );

  return {
    speak,
    isReady: voices.length > 0,
    isSupported,
  };
}
