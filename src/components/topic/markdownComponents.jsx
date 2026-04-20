import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * Mapa de components de Markdown compartit per ExplanationBlock,
 * CalloutBlock i qualsevol altre bloc que renderitzi Markdown amb
 * les nostres convencions (DATA-MODEL §3.2 + §3.6):
 *  - subtítols ### / ####
 *  - subsintaxi ==highlight== i escapaments dins dels strings
 *  - tokens semàntics per colors i estils
 */

function hasInlineMarkers(value) {
  return typeof value === 'string' && (value.includes('==') || value.includes('\\'));
}

function processChildren(children) {
  if (children == null) return children;
  if (typeof children === 'string') {
    if (!hasInlineMarkers(children)) return children;
    return <InlineRichText text={children} />;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string' && hasInlineMarkers(child)) {
        return <InlineRichText key={i} text={child} />;
      }
      return child;
    });
  }
  return children;
}

export const markdownComponents = {
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-content mt-6 mb-2">
      {processChildren(children)}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-semibold text-content mt-4 mb-2">
      {processChildren(children)}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-content leading-relaxed my-3">
      {processChildren(children)}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-1 my-3 text-content">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-1 my-3 text-content">{children}</ol>
  ),
  li: ({ children }) => <li>{processChildren(children)}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-content">
      {processChildren(children)}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic">{processChildren(children)}</em>
  ),
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded-sm bg-surface-raised text-sm font-mono">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="relative border-l-4 border-accent bg-surface-raised rounded-r-md pl-4 pr-3 py-2 my-3 text-content">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline hover:opacity-80"
    >
      {processChildren(children)}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-md border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-raised">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left border-b border-border px-3 py-2 font-semibold text-content">
      {processChildren(children)}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-2 align-top">
      {processChildren(children)}
    </td>
  ),
};
