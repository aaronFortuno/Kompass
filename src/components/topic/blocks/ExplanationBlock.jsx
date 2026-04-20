import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * ContentBlock type="explanation" (DATA-MODEL §3.2).
 * L'MVP tracta el body com a paràgraf amb inline rich text.
 * Markdown multilinia (llistes, subtítols) s'afegirà quan faci falta.
 */
export function ExplanationBlock({ block }) {
  const { title, body } = block;
  return (
    <section className="space-y-2">
      {title && (
        <h3 className="text-xl font-semibold text-content">{title}</h3>
      )}
      <p className="text-content leading-relaxed whitespace-pre-line">
        <InlineRichText text={body} />
      </p>
    </section>
  );
}
