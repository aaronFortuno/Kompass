import { useCallback, useEffect, useState } from 'react';

/*
 * useSpeakerDiscovered · §98 (tasca 4)
 *
 * Hook que gestiona l'estat "l'usuari ha descobert la interactivitat
 * dels SpeakableText" (ha clicat almenys un cop qualsevol pill).
 *
 * Fins que no es descobreix, els SpeakableText mostren la icona
 * <Volume2> com a pista visual. Un cop descobert (persistit a
 * localStorage), la icona desapareix a tots els pills de l'app; l'únic
 * senyal persistent que el span és clicable és el degradat de fons
 * subtil (.kf-speak) i el hover.
 *
 * Sincronització entre pestanyes via l'event 'storage'.
 *
 * Retorna { discovered, markDiscovered }.
 */

const STORAGE_KEY = 'kompass.speaker.discovered';

function readStorage() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSpeakerDiscovered() {
  const [discovered, setDiscovered] = useState(() => readStorage());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Escolta canvis des d'altres pestanyes.
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setDiscovered(e.newValue === 'true');
    };
    // Escolta un event custom intra-pestanya (quan un altre component
    // SpeakableText de la mateixa finestra crida markDiscovered).
    const onCustom = () => setDiscovered(readStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('kompass-speaker-discovered', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('kompass-speaker-discovered', onCustom);
    };
  }, []);

  const markDiscovered = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (readStorage()) return; // no repetir el write si ja hi és
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Sense localStorage (p. ex. mode incògnit estricte) deixem passar;
      // la icona continuarà apareixent cada sessió, però no és un error.
    }
    setDiscovered(true);
    // Notifiquem altres components muntats a la mateixa pestanya.
    window.dispatchEvent(new CustomEvent('kompass-speaker-discovered'));
  }, []);

  return { discovered, markDiscovered };
}
