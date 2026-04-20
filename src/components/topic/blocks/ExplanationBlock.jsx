import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/components/topic/markdownComponents.jsx';

/*
 * ContentBlock type="explanation" (DATA-MODEL §3.2).
 * body admet Markdown complet + la subsintaxi ==highlight==.
 */
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
