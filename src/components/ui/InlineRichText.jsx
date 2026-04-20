import { parseInlineRichText } from '@/lib/inlineRichText.js';

/*
 * Renderitza text amb inline rich text (DATA-MODEL §3.6).
 * Usat a cel·les de taula, cossos d'explicació, text d'exemples, feedback.
 */
export function InlineRichText({ text }) {
  const segments = parseInlineRichText(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'bold') return <strong key={i}>{seg.text}</strong>;
        if (seg.type === 'highlight') {
          return (
            <mark key={i} className="text-accent font-semibold">
              {seg.text}
            </mark>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}
