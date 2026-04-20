import { TextWithBlanksInteractive } from './TextWithBlanksInteractive.jsx';

function slotBorderClass(perBlank, blankId) {
  if (!perBlank || !perBlank[blankId]) {
    return 'border-border focus:ring-accent';
  }
  return perBlank[blankId].correct
    ? 'border-success focus:ring-success'
    : 'border-danger focus:ring-danger';
}

export function TypeInRenderer({
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
        const value = response[blankId] ?? '';
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onUpdate(blankId, e.target.value)}
            placeholder={slot?.placeholder ?? ''}
            disabled={disabled}
            aria-label={`Buit ${blankId}`}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`bg-surface text-content border ${slotBorderClass(perBlank, blankId)} rounded-sm px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 disabled:opacity-70`}
          />
        );
      }}
    />
  );
}
