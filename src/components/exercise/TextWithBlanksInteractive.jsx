import { parseTemplate } from '@/lib/templateParser.js';

/*
 * Renderitza un template "Hallo, {{1}} heiße Marc." amb els buits
 * reemplaçats per un input/select/… via render prop `renderBlank`.
 * El parser pla preserva whitespace i salts de línia. Al whitespace
 * respectem new lines amb whitespace-pre-line.
 */
export function TextWithBlanksInteractive({ template, renderBlank }) {
  const parts = parseTemplate(template);
  return (
    <div className="text-content leading-loose whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.text}</span>;
        return (
          <span key={i} className="inline-block align-middle mx-0.5">
            {renderBlank(part.id)}
          </span>
        );
      })}
    </div>
  );
}
