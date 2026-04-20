/*
 * Parser d'inline rich text · DATA-MODEL §3.6
 * Sintaxi mínima: **bold**, ==highlight==, escapament amb \.
 * Sense niament: un token dins d'un altre es tracta com a text.
 */

const TOKEN_RE = /\\([*=\\])|\*\*(.+?)\*\*|==(.+?)==/g;

/**
 * @param {string} input
 * @returns {{ type: 'text' | 'bold' | 'highlight', text: string }[]}
 */
export function parseInlineRichText(input) {
  if (!input) return [];
  const segments = [];
  let lastIndex = 0;
  let match;
  TOKEN_RE.lastIndex = 0;

  const pushText = (text) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.type === 'text') {
      last.text += text;
    } else {
      segments.push({ type: 'text', text });
    }
  };

  while ((match = TOKEN_RE.exec(input)) !== null) {
    const [, escaped, bold, highlight] = match;
    if (match.index > lastIndex) {
      pushText(input.slice(lastIndex, match.index));
    }
    if (escaped !== undefined) {
      pushText(escaped);
    } else if (bold !== undefined) {
      segments.push({ type: 'bold', text: bold });
    } else if (highlight !== undefined) {
      segments.push({ type: 'highlight', text: highlight });
    }
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex < input.length) {
    pushText(input.slice(lastIndex));
  }
  return segments;
}
