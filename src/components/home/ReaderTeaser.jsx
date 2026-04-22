import { useEffect, useRef, useState } from 'react';
import { Typed } from '@/components/reader/Typed.jsx';
import { SpeakableText } from '@/components/reader/SpeakableText.jsx';
import { prefersReducedMotion } from '@/lib/reader/beatTransitions.js';
import { useT } from '@/i18n';

/*
 * ReaderTeaser · maqueta viva del Focus Reader a la home.
 *
 * Renderitza dins un "frame" editorial paper-2 quatre "beats"
 * representatius del reader real, amb Typed (typewriter) i
 * SpeakableText (pill audible). El bucle avança cada ~4.5s amb un
 * fade molt curt entre beats.
 *
 * No carrega cap topic ni cap schema: els strings alemanys estan
 * codificats aquí perquè tenen MP3 prerecorded verificat al manifest
 * d'àudio (hash 59d9…, f3c1…, ea7d…). Si calgués canviar-los, cal
 * triar-ne uns altres que també existeixin al manifest.
 *
 * Accessibilitat: respecta prefers-reduced-motion. Si és true, mostra
 * un únic beat estàtic (el heading) amb el text complet, sense
 * typewriter ni bucle. No es canvia cap setting persistit.
 */

// Beats del demo. Mantenim el contingut alemany al component perquè
// és contingut "teaser", no lliçó real: NO ha d'anar als JSON de data.
// Els textos alemanys són strings netes (no cal markup de parseInline
// perquè Typed els tracta com a plain text; els injectem al SpeakableText
// via children ja renderitzats quan volem el pill).
const BEATS = [
  {
    kind: 'heading',
    // Títol de la lliçó · mostra estil heading
    de: 'Wie heißt du?',
    // Gloss catalana, petita, italic
    gloss: 'Com et dius?',
  },
  {
    kind: 'example',
    de: 'Hallo, ich bin Anna.',
    gloss: 'Hola, sóc l\'Anna.',
  },
  {
    kind: 'syn-table',
    // Taula mini: pronom + verb (sein, present)
    title: 'sein · ser',
    rows: [
      ['ich', 'bin'],
      ['du', 'bist'],
      ['er/sie', 'ist'],
    ],
  },
  {
    kind: 'example',
    de: 'Mein Name ist Marc.',
    gloss: 'El meu nom és Marc.',
  },
];

// Durada per beat (ms). El typewriter triga ~42ms/char; la frase més
// llarga són ~20 chars → ~850ms escrivint + ~3s de pausa abans d'avançar.
const BEAT_MS = 4500;
// Durada del fade entre beats.
const FADE_MS = 220;

export function ReaderTeaser() {
  const { t } = useT();
  const [reducedMotion] = useState(() => prefersReducedMotion());
  const [beatIdx, setBeatIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) return undefined;
    // Bucle cíclic: cada BEAT_MS, fade-out, canvi de beat, fade-in.
    intervalRef.current = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setBeatIdx((i) => (i + 1) % BEATS.length);
        setVisible(true);
      }, FADE_MS);
    }, BEAT_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [reducedMotion]);

  // Sota reduced-motion mostrem només el primer beat, estàtic.
  const beat = reducedMotion ? BEATS[0] : BEATS[beatIdx];
  const active = !reducedMotion && visible;

  return (
    <div
      className={[
        'kf-teaser-frame',
        'bg-reader-paper-2 border border-reader-rule',
        'px-6 py-7 sm:px-10 sm:py-8',
        'min-h-[320px] sm:min-h-[380px]',
        'flex flex-col',
      ].join(' ')}
      aria-label={t('home.teaserAria')}
    >
      {/* Kicker editorial: imita l'encapçalament del reader */}
      <div className="flex items-center justify-between mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-reader-muted">
          {t('home.teaserKicker')}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-reader-muted">
          {reducedMotion ? '01 / 01' : `0${beatIdx + 1} / 0${BEATS.length}`}
        </p>
      </div>

      {/* Stage del beat actiu */}
      <div
        className={[
          'flex-1 flex flex-col justify-center',
          'transition-opacity ease-standard',
          active ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        // Clau única per beat: força que Typed es reinicii quan canvia
        // el beatIdx; altrament React reutilitza el mateix component i
        // el typewriter no es torna a disparar.
        key={`${beatIdx}-${reducedMotion ? 'static' : 'anim'}`}
      >
        {beat.kind === 'heading' && (
          <div className="space-y-4">
            {reducedMotion ? (
              <h3 className="font-serif font-medium text-reader-ink text-4xl sm:text-5xl leading-[1.04] tracking-tight max-w-[18ch]">
                <SpeakableText text={beat.de}>{beat.de}</SpeakableText>
              </h3>
            ) : (
              <h3 className="font-serif font-medium text-reader-ink text-4xl sm:text-5xl leading-[1.04] tracking-tight max-w-[18ch]">
                <SpeakableText text={beat.de}>
                  <Typed
                    as="span"
                    text={beat.de}
                    speed={52}
                    startDelay={120}
                    active
                  />
                </SpeakableText>
              </h3>
            )}
            <p className="font-serif italic text-lg text-reader-ink-2">
              {beat.gloss}
            </p>
          </div>
        )}

        {beat.kind === 'example' && (
          <div className="space-y-4">
            {/* SpeakableText envolta el text alemany perquè el pill
                audible quedi visible. El typewriter "escriu" el text,
                i SpeakableText acull els children amb el wrapper
                clicable. */}
            {reducedMotion ? (
              <p className="font-serif font-medium text-reader-ink text-3xl sm:text-4xl leading-[1.12] tracking-tight">
                <SpeakableText text={beat.de}>{beat.de}</SpeakableText>
              </p>
            ) : (
              <p className="font-serif font-medium text-reader-ink text-3xl sm:text-4xl leading-[1.12] tracking-tight">
                <SpeakableText text={beat.de}>
                  <Typed
                    as="span"
                    text={beat.de}
                    speed={48}
                    startDelay={150}
                    active
                  />
                </SpeakableText>
              </p>
            )}
            <p className="font-serif italic text-base text-reader-ink-2 opacity-90">
              {beat.gloss}
            </p>
          </div>
        )}

        {beat.kind === 'syn-table' && (
          <div className="space-y-4">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
              {beat.title}
            </h4>
            <table className="font-serif text-reader-ink">
              <tbody>
                {beat.rows.map(([p, v], i) => (
                  <tr key={i} className="kf-row-reveal" style={{ animationDelay: `${i * 90}ms` }}>
                    <td className="pr-8 py-1.5 text-xl sm:text-2xl text-reader-ink-2 italic">
                      {p}
                    </td>
                    <td className="py-1.5 text-xl sm:text-2xl font-medium">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Peu del frame: imita la barra inferior del reader (passos). */}
      <div
        className="mt-8 pt-4 border-t border-reader-rule flex items-center gap-2"
        aria-hidden="true"
      >
        {BEATS.map((_, i) => (
          <span
            key={i}
            className={[
              'h-[3px] flex-1 transition-colors duration-base ease-standard',
              i === beatIdx
                ? 'bg-reader-ink'
                : i < beatIdx
                ? 'bg-reader-ink-2 opacity-60'
                : 'bg-reader-rule',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
