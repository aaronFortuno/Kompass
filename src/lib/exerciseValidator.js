/*
 * Validador d'exercicis (DATA-MODEL §7).
 * Rep exercise + response i retorna { correct: boolean }.
 * Aplica les regles de typeIn (caseSensitive, trimWhitespace) abans
 * de comparar amb les respostes esperades.
 */

function normalizeForInteraction(value, interaction) {
  if (value == null) return '';
  let v = String(value);
  if (interaction.type === 'typeIn') {
    const { caseSensitive = false, trimWhitespace = true } = interaction;
    if (trimWhitespace) v = v.trim();
    if (!caseSensitive) v = v.toLowerCase();
  }
  return v;
}

export function validateResponse(exercise, response) {
  const { interaction, validation } = exercise;

  if (validation.type === 'slotMap') {
    for (const [blankId, expected] of Object.entries(validation.answers)) {
      const actual = normalizeForInteraction(response[blankId], interaction);
      const target = normalizeForInteraction(expected, interaction);
      if (actual !== target) return { correct: false };
    }
    return { correct: true };
  }

  if (validation.type === 'slotMapMultiple') {
    for (const [blankId, accepted] of Object.entries(validation.answers)) {
      const actual = normalizeForInteraction(response[blankId], interaction);
      const normalizedAccepted = accepted.map((a) =>
        normalizeForInteraction(a, interaction)
      );
      if (!normalizedAccepted.includes(actual)) return { correct: false };
    }
    return { correct: true };
  }

  if (validation.type === 'exactMatch') {
    const actual = normalizeForInteraction(response, interaction);
    const target = normalizeForInteraction(validation.answer, interaction);
    return { correct: actual === target };
  }

  return { correct: false };
}
