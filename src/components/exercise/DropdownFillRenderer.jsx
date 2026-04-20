import { TextWithBlanksInteractive } from './TextWithBlanksInteractive.jsx';

export function DropdownFillRenderer({ exercise, response, onUpdate, disabled }) {
  const { stimulus, interaction } = exercise;
  const slotByBlank = Object.fromEntries(
    interaction.slots.map((s) => [s.blankId, s])
  );

  return (
    <TextWithBlanksInteractive
      template={stimulus.template}
      renderBlank={(blankId) => {
        const slot = slotByBlank[blankId];
        if (!slot) return <code>{`{{${blankId}}}`}</code>;
        const value = response[blankId] ?? '';
        return (
          <select
            value={value}
            onChange={(e) => onUpdate(blankId, e.target.value)}
            disabled={disabled}
            aria-label={`Buit ${blankId}`}
            className="bg-surface text-content border border-border rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
          >
            <option value="">—</option>
            {slot.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }}
    />
  );
}
