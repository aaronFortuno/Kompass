import { useEffect, useMemo, useRef, useState } from 'react';
import {
  tokenizeInline,
  visibleLength,
  renderTokensUpTo,
} from '@/lib/reader/parseInline.js';

/*
 * Typed · typewriter reutilitzable · ARCHITECTURE §17.6
 *
 * Escriu `text` caràcter a caràcter aplicant el format inline ja des del
 * primer caràcter. El component mai mostra els símbols de sintaxi
 * markdown (**, ==, _, `) mentre va escrivint; els caràcters formatats
 * apareixen directament amb el seu estil final (negreta, cursiva,
 * highlight o codi). Això evita el "redibuixat" que es produïa abans,
 * quan el delimitador de tancament feia desaparèixer els símbols ja
 * escrits.
 *
 * Props:
 *   - text: string (amb inline rich text markup)
 *   - speed: ms per caràcter _visible_ (42 per defecte, resol-se amb
 *     resolveTypewriterSpeed(settings.typewriterSpeed))
 *   - startDelay: ms abans de començar
 *   - active: si false, mostra el text complet immediatament (equival a
 *     la transició fade-in)
 *   - as: tag HTML de l'arrel ('p', 'h1', 'span'…). Per defecte 'span'.
 *   - className: classes extra per a l'arrel
 *   - onDone: callback opcional quan acaba l'animació
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
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  const total = useMemo(() => visibleLength(tokens), [tokens]);
  const [n, setN] = useState(active ? 0 : total);
  const [done, setDone] = useState(!active);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setN(total);
      setDone(true);
      if (onDone) onDone();
      return undefined;
    }
    setN(0);
    setDone(false);
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
  }, [tokens, total, speed, startDelay, active, onDone]);

  const visibleN = active ? n : total;
  const shown = renderTokensUpTo(tokens, visibleN);
  const showCaret = active && !done;
  const Tag = as;

  return (
    <Tag className={className}>
      <span className={showCaret ? 'kf-caret' : undefined}>{shown}</span>
    </Tag>
  );
}
