/*
 * Parser d'inline rich text · DATA-MODEL §3.6
 *
 * Admet cinc operadors (amb anidament bàsic):
 *   **text**   → <strong>
 *   ==text==   → <mark class="k-mark">       (highlight cromàtic)
 *   _text_     → <em>
 *   `text`     → <code>
 *   !!text!!   → <SpeakableText>             (àudio alemany · §98)
 *
 * Escapament: \**  \==  \_  \`  \!  \\
 *
 * Aquest mòdul exposa:
 *   1. `tokenizeInline(text)` → retorna una llista plana de tokens
 *      `{ type, content }` del nivell més extern (sense recursió).
 *      Aquesta és la representació "de seguiment": el typewriter itera
 *      sobre els caràcters _visibles_ (ja sense els delimitadors).
 *   2. `parseInline(text)` → retorna un array de fills React amb
 *      anidament (els `content` de strong/em/mark tornen a passar per
 *      parseInline, limitat a 6 nivells de profunditat com a defensa).
 *   3. `renderTokensUpTo(tokens, n)` → renderitza només els primers `n`
 *      caràcters visibles. S'usa al component <Typed /> per escriure
 *      text formatat progressivament sense mostrar els símbols de
 *      sintaxi.
 *   4. `stripRichMarkers(text)` → elimina els delimitadors rich del text
 *      i retorna la cadena neta. S'usa sobretot per al `text` prop de
 *      SpeakableText (el motor TTS ha de rebre alemany net, no **bold**).
 *
 * Pure functions.
 */

import { createElement } from 'react';
import { SpeakableText } from '@/components/reader/SpeakableText.jsx';

/*
 * Elimina els delimitadors d'inline rich text del text donat, retornant
 * una cadena neta. Útil per:
 *   - passar el text al motor TTS (el Web Speech i l'MP3 prerecorded han
 *     de rebre alemany net, sense markers).
 *   - generar aria-labels o hashes deterministes a partir del contingut.
 *
 * No intenta validar la sintaxi: aplica les mateixes regex que el
 * tokenitzador i descarta tant els delimitadors com les barres
 * d'escapament.
 */
export function stripRichMarkers(text) {
  if (!text) return '';
  const tokens = tokenizeInline(text);
  let out = '';
  for (const tok of tokens) {
    if (tok.type === 'text' || tok.type === 'code') {
      out += tok.content;
    } else if (tok.type === 'speakable') {
      out += stripRichMarkers(tok.content);
    } else {
      out += stripRichMarkers(tok.content);
    }
  }
  return out;
}

// Nota: el patró `!!...!!` prohibeix `!` dins del cos per evitar
// backtracking catastròfic amb regex (un text ple de `!` pot
// disparar explosió exponencial amb alternatives tipus `[^!]|!(?!!)`).
// A la pràctica els strings alemanys que volem fer pronunciar no
// contenen `!` enmig (només al final: "Hallo!"). Si calgués
// literalitzar un `!` dins, s'usa l'escapament `\!`.
const TOKEN_RE =
  /(\\[\\*=_`!])|(!![^!]+!!)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(==[^=]+==)|(_[^_]+_)|(`[^`]+`)/g;

// Profunditat màxima de la recursió per render. Els casos didàctics
// reals usen com a molt 2 nivells (p. ex. `_wohn**en**_` o
// `**_wohn-_**`). 6 dóna marge ampli i evita stack overflow si hi ha
// un patró inesperat al contingut autoral.
const MAX_DEPTH = 6;

/*
 * Elimina l'últim marcador orfe d'un tipus (sense parell de tancament)
 * del text. S'usa durant el typewriter: mentre un token s'escriu
 * caràcter a caràcter, el contingut partial pot tenir un `!!` (o `**`,
 * `==`) d'obertura pendent de tancar-se. Si no el despullem, el
 * tokenitzador el rendereix com a text literal i l'usuari veu els
 * símbols uns mil·lisegons fins al tancament. La funció només treu
 * l'últim orfe; els parells complets ja formats es conserven.
 */
export function stripOrphanMarkers(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  for (const marker of ['!!', '**', '==']) {
    const parts = out.split(marker);
    // parts.length === occurrences + 1.
    // Si el nombre d'ocurrències és senar → últim orfe.
    const count = parts.length - 1;
    if (count % 2 === 1) {
      const last = parts.pop();
      parts[parts.length - 1] += last;
      out = parts.join(marker);
    }
  }
  return out;
}

export function tokenizeInline(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) {
      out.push({ type: 'text', content: text.slice(last, m.index) });
    }
    const tok = m[0];
    if (tok.startsWith('\\')) {
      out.push({ type: 'text', content: tok.slice(1) });
    } else if (tok.startsWith('!!')) {
      out.push({ type: 'speakable', content: tok.slice(2, -2) });
    } else if (tok.startsWith('**')) {
      out.push({ type: 'strong', content: tok.slice(2, -2) });
    } else if (tok.startsWith('==')) {
      out.push({ type: 'mark', content: tok.slice(2, -2) });
    } else if (tok.startsWith('_')) {
      out.push({ type: 'em', content: tok.slice(1, -1) });
    } else if (tok.startsWith('`')) {
      out.push({ type: 'code', content: tok.slice(1, -1) });
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    out.push({ type: 'text', content: text.slice(last) });
  }
  return out;
}

export function visibleLength(tokens) {
  let len = 0;
  for (const tok of tokens) len += tok.content.length;
  return len;
}

function renderTokenDepth(tok, content, key, depth) {
  // `code` es tracta com a literal: dins seu no s'interpreten altres
  // operadors.
  if (tok.type === 'code') {
    return createElement('code', { key }, content);
  }
  // Si el content coincideix amb si mateix (protecció idempotent) o
  // hem excedit la profunditat màxima, retornem text literal.
  const recurseContent = depth < MAX_DEPTH ? content : null;
  let children = content;
  if (recurseContent != null) {
    // Fix §98: mentre el typewriter escriu un token que conté operadors
    // niats (p. ex. `==!!Ich!!==` o `**!!Mein Name!!**`), el partial
    // mid-typing pot tenir un `!!`, `**` o `==` orfe (obertura sense
    // tancament). Re-tokenitzar-lo literalment feia veure els marcadors
    // durant uns instants fins a revelar el tancament. Els despullem
    // abans de passar-los al tokenitzador perquè la vista intermèdia
    // no mostri símbols que mai haurien de ser visibles.
    const stripped = stripOrphanMarkers(recurseContent);
    const subTokens = tokenizeInline(stripped);
    const sameAsSelf =
      subTokens.length === 1 &&
      subTokens[0].type !== 'text' &&
      subTokens[0].content === tok.content;
    if (!sameAsSelf) {
      children = renderTokensDepth(subTokens, Number.POSITIVE_INFINITY, depth + 1);
    } else {
      children = stripped;
    }
  }
  switch (tok.type) {
    case 'strong':
      return createElement('strong', { key }, children);
    case 'em':
      return createElement('em', { key }, children);
    case 'mark':
      return createElement('mark', { key, className: 'k-mark' }, children);
    case 'speakable':
      // El TTS ha de rebre text net (sense **, ==, _, `); els `children`,
      // en canvi, mantenen el format visual intern (ex: bold dins del pill).
      return createElement(
        SpeakableText,
        { key, text: stripRichMarkers(tok.content) },
        children
      );
    default:
      return content;
  }
}

function renderTokensDepth(tokens, n, depth) {
  const out = [];
  let acc = 0;
  let key = 0;
  for (const tok of tokens) {
    const len = tok.content.length;
    if (acc >= n) break;
    const visibleHere = acc + len <= n ? tok.content : tok.content.slice(0, n - acc);
    out.push(renderTokenDepth(tok, visibleHere, key++, depth));
    acc += len;
  }
  return out;
}

export function renderTokensUpTo(tokens, n) {
  return renderTokensDepth(tokens, n, 0);
}

export function parseInline(text) {
  return renderTokensDepth(tokenizeInline(text), Number.POSITIVE_INFINITY, 0);
}
