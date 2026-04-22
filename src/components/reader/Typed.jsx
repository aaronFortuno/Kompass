import { useEffect, useMemo, useRef, useState } from 'react';
import {
  tokenizeInline,
  visibleLength,
  renderTokensUpTo,
} from '@/lib/reader/parseInline.js';

/*
 * Typed · typewriter reutilitzable · ARCHITECTURE §17.6 + §98 (audio)
 *
 * Escriu `text` caràcter a caràcter aplicant el format inline ja des del
 * primer caràcter. Integració àudio: si es passa `onSpeakableReached`,
 * el typewriter fa una pausa al final de cada span `!!...!!` i deixa
 * que el caller reprodueixi l'àudio; retornant una Promise, el caller
 * controla quan el typewriter continua. Així una frase tipus
 * "!!Mein Name!! · !!ist!! · !!Julia Schwaiger!!" s'escriu fins a la
 * primera pill, sona, pausa 200ms, segueix fins a la segona, sona,
 * etc. §98 polit del reader.
 *
 * Props:
 *   - text: string (amb inline rich text markup).
 *   - speed: ms per caràcter _visible_ (42 per defecte).
 *   - startDelay: ms abans de començar.
 *   - active: si false, mostra el text complet immediatament.
 *   - as: tag HTML de l'arrel ('p', 'h1', 'span'…). Per defecte 'span'.
 *   - className: classes extra per a l'arrel.
 *   - onDone: callback opcional quan acaba l'animació (incloent-hi
 *     àudios intermedis).
 *   - onSpeakableReached: (idx, totalSpeakables) => Promise<void> |
 *     void. Invocat quan el typewriter acaba d'escriure el pill
 *     audible número `idx` (0-indexat). El typewriter pausa fins que
 *     la Promise retornada es resol. Si el callback no es passa, el
 *     typewriter no fa cap pausa especial.
 */
export function Typed({
  text = '',
  speed = 42,
  startDelay = 120,
  active = true,
  as = 'span',
  className,
  onDone,
  onSpeakableReached,
}) {
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  const total = useMemo(() => visibleLength(tokens), [tokens]);

  // Calcula els punts d'aturada: per cada speakable, la posició `atN`
  // en què s'ha acabat d'escriure. Els speakables poden viure a primer
  // nivell (`!!X!!`) o dins d'un altre operador (`**!!X!!**`,
  // `==!!X!!==`, etc.). Busquem els dos casos:
  //   - top-level: tok.type === 'speakable' → atN = cum + tok.content.length.
  //   - nested: cerquem `!!...!!` amb regex dins del contingut dels
  //     tokens de tipus strong/mark/em i calculem la posició relativa.
  const stopPoints = useMemo(() => {
    const sp = [];
    let cum = 0;
    let sIdx = 0;
    for (const tok of tokens) {
      const len = tok.content.length;
      if (tok.type === 'speakable') {
        sp.push({ atN: cum + len, idx: sIdx });
        sIdx++;
      } else if (tok.type !== 'text' && tok.type !== 'code') {
        const re = /!!([^!]+?)!!/g;
        let m;
        while ((m = re.exec(tok.content))) {
          sp.push({ atN: cum + m.index + m[0].length, idx: sIdx });
          sIdx++;
        }
      }
      cum += len;
    }
    return sp;
  }, [tokens]);

  const [n, setN] = useState(active ? 0 : total);
  const [done, setDone] = useState(!active);

  // Estabilitzem callbacks en refs per evitar re-executar el loop a cada
  // render. onDone arriba sovint com a arrow inline (canvia referencia).
  const onDoneRef = useRef(onDone);
  const onSpeakableRef = useRef(onSpeakableReached);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { onSpeakableRef.current = onSpeakableReached; }, [onSpeakableReached]);

  useEffect(() => {
    if (!active) {
      setN(total);
      setDone(true);
      if (onDoneRef.current) onDoneRef.current();
      return undefined;
    }
    setN(0);
    setDone(false);

    let cancelled = false;
    function sleep(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async function run() {
      await sleep(startDelay);
      if (cancelled) return;
      let c = 0;
      let nextStop = 0; // índex dins de stopPoints
      while (c < total) {
        if (cancelled) return;
        c += 1;
        setN(c);
        // Si tenim un callback de speakable i hem arribat al final
        // d'un `!!...!!`, pausem i esperem que el caller digui
        // "continua" (la Promise es resol).
        if (
          onSpeakableRef.current
          && nextStop < stopPoints.length
          && stopPoints[nextStop].atN === c
        ) {
          try {
            await Promise.resolve(
              onSpeakableRef.current(stopPoints[nextStop].idx, stopPoints.length),
            );
          } catch { /* silenci */ }
          if (cancelled) return;
          nextStop += 1;
        } else {
          await sleep(speed);
        }
      }
      setDone(true);
      if (onDoneRef.current) onDoneRef.current();
    }

    run();
    return () => { cancelled = true; };
  }, [tokens, total, speed, startDelay, active, stopPoints]);

  const visibleN = active ? n : total;
  const shown = renderTokensUpTo(tokens, visibleN);
  // El caret es mostra mentre el Typed està "en mode typewriter" (active),
  // no només durant l'animació: un cop acabat, segueix parpellejant al
  // final del text com a senyal d'activitat del sistema.
  const showCaret = active;
  const Tag = as;

  return (
    <Tag className={className}>
      <span className={showCaret ? 'kf-caret' : undefined}>{shown}</span>
    </Tag>
  );
}
