/*
 * Parseja un template de textWithBlanks (DATA-MODEL §5.2):
 * "Hallo, {{1}} heiße Marc." → [
 *   { type: 'text', text: 'Hallo, ' },
 *   { type: 'blank', id: '1' },
 *   { type: 'text', text: ' heiße Marc.' }
 * ]
 */
const BLANK_RE = /\{\{(\w+)\}\}/g;

export function parseTemplate(template) {
  if (!template) return [];
  const parts = [];
  let lastIndex = 0;
  BLANK_RE.lastIndex = 0;
  let m;
  while ((m = BLANK_RE.exec(template)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', text: template.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'blank', id: m[1] });
    lastIndex = BLANK_RE.lastIndex;
  }
  if (lastIndex < template.length) {
    parts.push({ type: 'text', text: template.slice(lastIndex) });
  }
  return parts;
}
