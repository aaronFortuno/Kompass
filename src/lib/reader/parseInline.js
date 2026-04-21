/*
 * Parser d'inline rich text · DATA-MODEL §3.6
 *
 * Admet quatre operadors (no anidats amb superposició):
 *   **text**   → <strong>
 *   ==text==   → <mark class="k-mark">       (highlight cromàtic)
 *   _text_     → <em>
 *   `text`     → <code>
 *
 * Escapament: \**  \==  \_  \`  \\
 *
 * Aquest mòdul exposa dues capes:
 *   1. `tokenizeInline(text)` → retorna una llista de tokens
 *      `{ type, content }` on type ∈ {text|strong|em|mark|code}.
 *      Aquesta és la representació "de seguiment": el typewriter itera
 *      sobre els caràcters _visibles_ (ja sense els delimitadors markdown).
 *   2. `parseInline(text)` → retorna un array de fills React llestos per
 *      renderitzar. Utilitza tokenizeInline internament.
 *   3. `renderTokensUpTo(tokens, n)` → renderitza només els primers `n`
 *      caràcters visibles, preservant el format a cada segment. S'usa
 *      al component <Typed /> per escriure text formatat progressivament
 *      sense mostrar mai els símbols de sintaxi.
 *
 * Pure functions. Els tests viuen a tests/parseInline.test.js.
 */

import { createElement } from 'react';

const TOKEN_RE =
  /(\\[\\*=_`])|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(==[^=]+==)|(_[^_]+_)|(`[^`]+`)/g;

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

function renderToken(tok, content, key) {
  switch (tok.type) {
    case 'strong':
      return createElement('strong', { key }, content);
    case 'em':
      return createElement('em', { key }, content);
    case 'mark':
      return createElement('mark', { key, className: 'k-mark' }, content);
    case 'code':
      return createElement('code', { key }, content);
    default:
      return content;
  }
}

export function renderTokensUpTo(tokens, n) {
  const out = [];
  let acc = 0;
  let key = 0;
  for (const tok of tokens) {
    const len = tok.content.length;
    if (acc >= n) break;
    const visibleHere = acc + len <= n ? tok.content : tok.content.slice(0, n - acc);
    out.push(renderToken(tok, visibleHere, key++));
    acc += len;
  }
  return out;
}

export function parseInline(text) {
  return renderTokensUpTo(tokenizeInline(text), Number.POSITIVE_INFINITY);
}
