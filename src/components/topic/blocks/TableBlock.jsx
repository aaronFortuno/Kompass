import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * ContentBlock type="table" (DATA-MODEL §3.2).
 * Cel·les poden ser string o { text, rowspan, colspan, emphasis, align }.
 * Les cel·les "tapades" per un rowspan/colspan previ s'ometen de la fila.
 */

function cellClasses({ emphasis, align = 'left' }, { isHeader = false } = {}) {
  return [
    'border-b border-border px-3 py-2 align-top',
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    (isHeader || emphasis === 'header') && 'font-semibold text-content',
    emphasis === 'muted' && 'text-content-muted',
    emphasis === 'accent' && 'text-accent font-semibold',
  ]
    .filter(Boolean)
    .join(' ');
}

function Cell({ cell, as = 'td', ...rest }) {
  const Tag = as;
  const isHeader = as === 'th';
  if (typeof cell === 'string') {
    return (
      <Tag className={cellClasses({}, { isHeader })} {...rest}>
        <InlineRichText text={cell} />
      </Tag>
    );
  }
  const { text, rowspan, colspan } = cell;
  return (
    <Tag
      rowSpan={rowspan}
      colSpan={colspan}
      className={cellClasses(cell, { isHeader })}
      {...rest}
    >
      <InlineRichText text={text} />
    </Tag>
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
                  <Cell key={i} cell={h} as="th" scope="col" />
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
