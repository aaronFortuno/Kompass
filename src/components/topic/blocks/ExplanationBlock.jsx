import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * ContentBlock type="explanation" (DATA-MODEL §3.2).
 * body admet Markdown complet (paràgrafs, llistes, subtítols, bold,
 * italic, blockquote, taules simples) + la subsintaxi ==highlight==
 * del projecte.
 */

function hasInlineMarkers(value) {
  return typeof value === 'string' && (value.includes('==') || value.includes('\\'));
}

// Els strings amb tokens propis (==highlight==, \\*, \\=) passen pel
// nostre parser; la resta es respecten tal qual. Els elements React ja
// generats per react-markdown (strong, em, a…) es deixen intactes.
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

const markdownComponents = {
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
    <blockquote className="border-l-4 border-border pl-4 my-3 text-content-muted">
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
  // Taules GFM — útils per a llistats breus dins d'explanation. Les
  // taules grans es fan com a bloc `table` separat.
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

export function ExplanationBlock({ block }) {
  const { title, body } = block;
  return (
    <section className="space-y-2">
      {title && (
        <h2 className="text-2xl font-semibold text-content">{title}</h2>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {body}
      </ReactMarkdown>
    </section>
  );
}
