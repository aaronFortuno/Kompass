import { useEffect, useRef, useState } from 'react';
import { parseInline } from '@/lib/reader/parseInline.js';

/*
 * Typed · typewriter reutilitzable · ARCHITECTURE §17.6
 *
 * Mostra `text` caràcter a caràcter. Aplica `parseInline` al text visible
 * perquè els emfàticas (**, ==, _, `) s'animin correctament.
 *
 * Props:
 *   - text: string
 *   - speed: ms per caràcter (42 per defecte, resol-se amb
 *     resolveTypewriterSpeed(settings.typewriterSpeed))
 *   - startDelay: ms abans de començar
 *   - active: si false, mostra el text complet immediatament (equival a
 *     la transició fade-in)
 *   - as: tag HTML de l'arrel ('p', 'h1', 'span'…). Per defecte 'span'.
 *   - className: classes extra per a l'arrel
 *   - onDone: callback opcional quan acaba l'animació
 *
 * Mostra un caret parpellejant només mentre l'animació està activa.
 */
export function Typed({
  text = '',
  speed = 42,
  startDelay = 120,
  active = true,
  as = 'span',
  className,
  onDone,
}) {
  const [n, setN] = useState(active ? 0 : text.length);
  const [done, setDone] = useState(!active);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setN(text.length);
      setDone(true);
      if (onDone) onDone();
      return undefined;
    }
    setN(0);
    setDone(false);
    const total = text.length;
    let start = null;
    const step = (t) => {
      if (!start) start = t + startDelay;
      const elapsed = Math.max(0, t - start);
      const c = Math.min(total, Math.floor(elapsed / speed));
      setN(c);
      if (c < total) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDone(true);
        if (onDone) onDone();
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, startDelay, active, onDone]);

  const shown = active ? text.slice(0, n) : text;
  const showCaret = active && !done;
  const Tag = as;

  return (
    <Tag className={className}>
      <span className={showCaret ? 'kf-caret' : undefined}>{parseInline(shown)}</span>
    </Tag>
  );
}
