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
 * Retorna un array de fills React llestos per renderitzar directament
 * dins de qualsevol element. Cada fragment de text pla queda com string,
 * els emfàticas com <strong/mark/em/code>.
 *
 * Pure function, sense React estat. Els tests viuen a tests/parseInline.test.js.
 */

import { createElement } from 'react';

const TOKEN_RE = /(\\[\\*=_`])|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(==[^=]+==)|(_[^_]+_)|(`[^`]+`)/g;

export function parseInline(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  let key = 0;
  let m;

  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('\\')) {
      // Caràcter escapat: afegim només el segon char.
      out.push(tok.slice(1));
    } else if (tok.startsWith('**')) {
      out.push(createElement('strong', { key: key++ }, tok.slice(2, -2)));
    } else if (tok.startsWith('==')) {
      out.push(createElement('mark', { key: key++, className: 'k-mark' }, tok.slice(2, -2)));
    } else if (tok.startsWith('_')) {
      out.push(createElement('em', { key: key++ }, tok.slice(1, -1)));
    } else if (tok.startsWith('`')) {
      out.push(createElement('code', { key: key++ }, tok.slice(1, -1)));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
