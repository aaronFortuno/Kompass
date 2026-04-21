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
 * Per a `truthMap`, cada statement és un slot i `expected`/`actual` són
 * "true" o "false" com a string per uniformitat amb la resta de tipus.
 * Per a `pairMap`, cada parella esperada és un slot amb clau `idA|idB`
 * (ordenada alfabèticament); `expected` és el parell canònic "a ↔ b".
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

function canonicalPairKey(a, b) {
  return [a, b].sort().join('|');
}

function formatPairLabel(a, b) {
  return `${a} ↔ ${b}`;
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

  if (validation.type === 'truthMap') {
    const perBlank = {};
    for (const [statementId, expected] of Object.entries(validation.answers)) {
      const raw = response?.[statementId];
      const answered = raw === true || raw === false;
      const correct = answered && raw === expected;
      perBlank[statementId] = {
        correct,
        actual: answered ? String(raw) : '',
        expected: String(expected),
      };
    }
    const correctOverall = Object.values(perBlank).every((b) => b.correct);
    return { correctOverall, perBlank };
  }

  if (validation.type === 'pairMap') {
    const expectedPairs = validation.pairs;
    const userPairs = Array.isArray(response) ? response : [];
    // Indexem les parelles de l'usuari per clau canònica (ordre irrellevant).
    const userPairSet = new Set(
      userPairs
        .filter((p) => Array.isArray(p) && p.length === 2 && p[0] && p[1])
        .map(([a, b]) => canonicalPairKey(a, b))
    );
    const perBlank = {};
    for (const [a, b] of expectedPairs) {
      const key = canonicalPairKey(a, b);
      const matched = userPairSet.has(key);
      perBlank[key] = {
        correct: matched,
        actual: matched ? formatPairLabel(a, b) : '',
        expected: formatPairLabel(a, b),
      };
    }
    // Globalment és correcte si cada parella esperada està present I
    // l'usuari no ha creat parelles extres incorrectes.
    const expectedKeys = new Set(
      expectedPairs.map(([a, b]) => canonicalPairKey(a, b))
    );
    const hasAllExpected = Object.values(perBlank).every((b) => b.correct);
    const hasNoExtras = [...userPairSet].every((k) => expectedKeys.has(k));
    return {
      correctOverall: hasAllExpected && hasNoExtras,
      perBlank,
    };
  }

  return { correctOverall: false, perBlank: {} };
}
