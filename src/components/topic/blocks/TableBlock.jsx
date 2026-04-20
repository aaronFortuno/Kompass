import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * ContentBlock type="table" (DATA-MODEL §3.2).
 * Cel·les poden ser string o { text, rowspan, colspan, emphasis, align }.
 * Les cel·les "tapades" per un rowspan/colspan previ s'ometen de la fila.
 */

function cellClasses({ emphasis, align = 'left' }) {
  return [
    'border-b border-border px-3 py-2 align-top',
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    emphasis === 'header' && 'font-semibold text-content',
    emphasis === 'muted' && 'text-content-muted',
    emphasis === 'accent' && 'text-accent font-semibold',
  ]
    .filter(Boolean)
    .join(' ');
}

function Cell({ cell }) {
  if (typeof cell === 'string') {
    return (
      <td className={cellClasses({})}>
        <InlineRichText text={cell} />
      </td>
    );
  }
  const { text, rowspan, colspan } = cell;
  return (
    <td
      rowSpan={rowspan}
      colSpan={colspan}
      className={cellClasses(cell)}
    >
      <InlineRichText text={text} />
    </td>
  );
}

export function TableBlock({ block }) {
  const { title, caption, headers, rows } = block;
  return (
    <figure className="space-y-2">
      {title && (
        <figcaption className="text-base font-semibold text-content">
          {title}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          {headers && headers.length > 0 && (
            <thead className="bg-surface-raised">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left border-b border-border px-3 py-2 font-semibold text-content-muted"
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <Cell key={ci} cell={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="text-sm text-content-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
