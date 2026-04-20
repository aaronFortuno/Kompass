import { ExplanationBlock } from '@/components/topic/blocks/ExplanationBlock.jsx';
import { TableBlock } from '@/components/topic/blocks/TableBlock.jsx';

/*
 * Dispatcher per a ContentBlock (DATA-MODEL §3.2).
 * Afegeix aquí nous tipus a mesura que es vagin incorporant al schema.
 */
export function ContentBlock({ block }) {
  switch (block.type) {
    case 'explanation':
      return <ExplanationBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    default:
      if (import.meta.env?.DEV) {
        console.warn(`[ContentBlock] tipus desconegut: ${block.type}`);
      }
      return null;
  }
}
