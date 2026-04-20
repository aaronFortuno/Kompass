/*
 * Validador d'exercicis (DATA-MODEL §7).
 * Retorna:
 *   {
 *     correctOverall: boolean,
 *     perBlank: {
 *       [blankId]: { correct, actual, expected }
 *     }
 *   }
 *
 * `expected` és sempre la forma original del JSON (amb majúscules reals);
 * `actual` és la resposta tal com l'usuari l'ha donada (abans de
 * normalitzar). La comparació interna sí normalitza segons els flags
 * de typeIn (caseSensitive, trimWhitespace).
 *
 * Per a `slotMapMultiple`, `expected` és les formes acceptades unides
 * per " / " per mostrar-les totes al feedback.
 * Per a `exactMatch` (una sola resposta sense slots) no hi ha
 * `perBlank`; tornem-lo buit.
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
    const perBlank = {};
    for (const [blankId, expected] of Object.entries(validation.answers)) {
      const actual = response?.[blankId] ?? '';
      const normActual = normalizeForInteraction(actual, interaction);
      const normTarget = normalizeForInteraction(expected, interaction);
      perBlank[blankId] = {
        correct: normActual === normTarget,
        actual,
        expected,
      };
    }
    const correctOverall = Object.values(perBlank).every((b) => b.correct);
    return { correctOverall, perBlank };
  }

  if (validation.type === 'slotMapMultiple') {
    const perBlank = {};
    for (const [blankId, accepted] of Object.entries(validation.answers)) {
      const actual = response?.[blankId] ?? '';
      const normActual = normalizeForInteraction(actual, interaction);
      const normAccepted = accepted.map((a) =>
        normalizeForInteraction(a, interaction)
      );
      perBlank[blankId] = {
        correct: normAccepted.includes(normActual),
        actual,
        expected: accepted.join(' / '),
      };
    }
    const correctOverall = Object.values(perBlank).every((b) => b.correct);
    return { correctOverall, perBlank };
  }

  if (validation.type === 'exactMatch') {
    const actual = response ?? '';
    const normActual = normalizeForInteraction(actual, interaction);
    const normTarget = normalizeForInteraction(validation.answer, interaction);
    return {
      correctOverall: normActual === normTarget,
      perBlank: {},
    };
  }

  return { correctOverall: false, perBlank: {} };
}
