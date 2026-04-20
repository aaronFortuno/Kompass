import { TextWithBlanksInteractive } from './TextWithBlanksInteractive.jsx';

export function TypeInRenderer({ exercise, response, onUpdate, disabled }) {
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
            className="bg-surface text-content border border-border rounded-sm px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
          />
        );
      }}
    />
  );
}
