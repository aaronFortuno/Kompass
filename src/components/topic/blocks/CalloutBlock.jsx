import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Info, Lightbulb, AlertTriangle, AlertOctagon, BookOpen } from 'lucide-react';
import { markdownComponents } from '@/components/topic/markdownComponents.jsx';

/*
 * ContentBlock type="callout" (DATA-MODEL §3.2).
 * Nota destacada amb icona, color i vora segons variant.
 */

const VARIANTS = {
  info: {
    Icon: Info,
    border: 'border-accent',
    iconColor: 'text-accent',
  },
  tip: {
    Icon: Lightbulb,
    border: 'border-success',
    iconColor: 'text-success',
  },
  warning: {
    Icon: AlertTriangle,
    border: 'border-warning',
    iconColor: 'text-warning',
  },
  danger: {
    Icon: AlertOctagon,
    border: 'border-danger',
    iconColor: 'text-danger',
  },
  example: {
    Icon: BookOpen,
    border: 'border-border',
    iconColor: 'text-content-muted',
  },
};

export function CalloutBlock({ block }) {
  const { variant, title, body } = block;
  const { Icon, border, iconColor } = VARIANTS[variant] ?? VARIANTS.info;

  return (
    <aside
      role="note"
      className={`relative bg-surface-raised ${border} border-l-4 rounded-r-md py-3 pl-4 pr-4 my-2 flex gap-3`}
    >
      <Icon
        size={20}
        className={`${iconColor} shrink-0 mt-1`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 callout-body">
        {title && (
          <p className="font-semibold text-content m-0 mb-1 leading-snug">
            {title}
          </p>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {body}
        </ReactMarkdown>
      </div>
    </aside>
  );
}
