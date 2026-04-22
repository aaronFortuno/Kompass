/*
 * Parser d'inline rich text · DATA-MODEL §3.6
 *
 * Admet quatre operadors (amb anidament bàsic):
 *   **text**   → <strong>
 *   ==text==   → <mark class="k-mark">       (highlight cromàtic)
 *   _text_     → <em>
 *   `text`     → <code>
 *
 * Escapament: \**  \==  \_  \`  \\
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
 *
 * Pure functions.
 */

import { createElement } from 'react';

const TOKEN_RE =
  /(\\[\\*=_`])|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(==[^=]+==)|(_[^_]+_)|(`[^`]+`)/g;

// Profunditat màxima de la recursió per render. Els casos didàctics
// reals usen com a molt 2 nivells (p. ex. `_wohn**en**_` o
// `**_wohn-_**`). 6 dóna marge ampli i evita stack overflow si hi ha
// un patró inesperat al contingut autoral.
const MAX_DEPTH = 6;

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
    const subTokens = tokenizeInline(recurseContent);
    // Protecció: si el tokenitzador retorna un únic token idèntic al
    // passat (ex: un token sospitós que no redueix el text), tallem.
    const sameAsSelf =
      subTokens.length === 1 &&
      subTokens[0].type !== 'text' &&
      subTokens[0].content === tok.content;
    if (!sameAsSelf) {
      children = renderTokensDepth(subTokens, Number.POSITIVE_INFINITY, depth + 1);
    }
  }
  switch (tok.type) {
    case 'strong':
      return createElement('strong', { key }, children);
    case 'em':
      return createElement('em', { key }, children);
    case 'mark':
      return createElement('mark', { key, className: 'k-mark' }, children);
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
