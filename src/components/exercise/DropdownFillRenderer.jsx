import { TextWithBlanksInteractive } from './TextWithBlanksInteractive.jsx';

function slotBorderClass(perBlank, blankId) {
  if (!perBlank || !perBlank[blankId]) {
    return 'border-border focus:ring-accent';
  }
  return perBlank[blankId].correct
    ? 'border-success focus:ring-success'
    : 'border-danger focus:ring-danger';
}

export function DropdownFillRenderer({
  exercise,
  response,
  onUpdate,
  disabled,
  perBlank,
}) {
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
            className={`bg-surface text-content border ${slotBorderClass(perBlank, blankId)} rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 disabled:opacity-70`}
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
