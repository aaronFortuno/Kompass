import { describe, it, expect } from 'vitest';
import { validateResponse } from '@/lib/exerciseValidator.js';

function makeExercise({ interaction, validation }) {
  return { interaction, validation };
}

describe('validateResponse · slotMap + dropdownFill', () => {
  const exercise = makeExercise({
    interaction: { type: 'dropdownFill', slots: [] },
    validation: {
      type: 'slotMap',
      answers: { 1: 'Mein', 2: 'Meine' },
    },
  });

  it('correctOverall=true si tots els slots coincideixen', () => {
    const r = validateResponse(exercise, { 1: 'Mein', 2: 'Meine' });
    expect(r.correctOverall).toBe(true);
    expect(r.perBlank['1'].correct).toBe(true);
    expect(r.perBlank['2'].correct).toBe(true);
  });

  it('marca només el slot que falla', () => {
    const r = validateResponse(exercise, { 1: 'Meine', 2: 'Meine' });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank['1'].correct).toBe(false);
    expect(r.perBlank['1'].actual).toBe('Meine');
    expect(r.perBlank['1'].expected).toBe('Mein');
    expect(r.perBlank['2'].correct).toBe(true);
  });

  it('tracta slot buit com incorrecte', () => {
    const r = validateResponse(exercise, { 1: 'Mein' });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank['2'].correct).toBe(false);
    expect(r.perBlank['2'].actual).toBe('');
  });
});

describe('validateResponse · slotMap + typeIn caseSensitive', () => {
  const exercise = makeExercise({
    interaction: { type: 'typeIn', slots: [], caseSensitive: true, trimWhitespace: true },
    validation: {
      type: 'slotMap',
      answers: { 1: 'ich', 2: 'Sie' },
    },
  });

  it('accepta exacte', () => {
    const r = validateResponse(exercise, { 1: 'ich', 2: 'Sie' });
    expect(r.correctOverall).toBe(true);
  });

  it('trim aplicat', () => {
    const r = validateResponse(exercise, { 1: '  ich ', 2: 'Sie' });
    expect(r.correctOverall).toBe(true);
    expect(r.perBlank['1'].actual).toBe('  ich ');
    expect(r.perBlank['1'].expected).toBe('ich');
  });

  it('diferencia majúscules quan caseSensitive', () => {
    const r = validateResponse(exercise, { 1: 'Ich', 2: 'Sie' });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank['1'].correct).toBe(false);
  });
});

describe('validateResponse · slotMap + typeIn case-insensitive', () => {
  const exercise = makeExercise({
    interaction: { type: 'typeIn', slots: [], caseSensitive: false, trimWhitespace: true },
    validation: {
      type: 'slotMap',
      answers: { 1: 'wohne' },
    },
  });

  it('accepta variants de cas', () => {
    expect(validateResponse(exercise, { 1: 'WOHNE' }).correctOverall).toBe(true);
    expect(validateResponse(exercise, { 1: 'Wohne' }).correctOverall).toBe(true);
  });
});

describe('validateResponse · slotMapMultiple', () => {
  const exercise = makeExercise({
    interaction: { type: 'typeIn', slots: [], caseSensitive: false, trimWhitespace: true },
    validation: {
      type: 'slotMapMultiple',
      answers: { 1: ['am', 'an dem'] },
    },
  });

  it('accepta qualsevol forma', () => {
    const r = validateResponse(exercise, { 1: 'am' });
    expect(r.correctOverall).toBe(true);
  });

  it('expected concatena formes', () => {
    const r = validateResponse(exercise, { 1: 'auf dem' });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank['1'].expected).toBe('am / an dem');
    expect(r.perBlank['1'].actual).toBe('auf dem');
  });
});

describe('validateResponse · exactMatch', () => {
  const exercise = makeExercise({
    interaction: { type: 'typeIn', slots: [], caseSensitive: false, trimWhitespace: true },
    validation: { type: 'exactMatch', answer: 'b' },
  });

  it('no té perBlank', () => {
    const r = validateResponse(exercise, 'b');
    expect(r.correctOverall).toBe(true);
    expect(r.perBlank).toEqual({});
  });
});

describe('validateResponse · exactMatch amb singleChoice', () => {
  const exercise = makeExercise({
    interaction: {
      type: 'singleChoice',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    },
    validation: { type: 'exactMatch', answer: 'b' },
  });

  it('accepta l\'id correcte', () => {
    const r = validateResponse(exercise, 'b');
    expect(r.correctOverall).toBe(true);
    expect(r.perBlank).toEqual({});
  });

  it('rebutja un altre id', () => {
    const r = validateResponse(exercise, 'a');
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank).toEqual({});
  });

  it('rebutja resposta buida', () => {
    const r = validateResponse(exercise, '');
    expect(r.correctOverall).toBe(false);
  });
});

describe('validateResponse · truthMap', () => {
  const exercise = makeExercise({
    interaction: {
      type: 'trueFalse',
      statements: [
        { id: 's1', text: 'Afirmació 1' },
        { id: 's2', text: 'Afirmació 2' },
        { id: 's3', text: 'Afirmació 3' },
      ],
    },
    validation: {
      type: 'truthMap',
      answers: { s1: true, s2: false, s3: true },
    },
  });

  it('correctOverall=true si totes les afirmacions tenen el valor esperat', () => {
    const r = validateResponse(exercise, { s1: true, s2: false, s3: true });
    expect(r.correctOverall).toBe(true);
    expect(r.perBlank.s1.correct).toBe(true);
    expect(r.perBlank.s2.correct).toBe(true);
    expect(r.perBlank.s3.correct).toBe(true);
  });

  it('marca nomes els statements que fallen', () => {
    const r = validateResponse(exercise, { s1: true, s2: true, s3: false });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank.s1.correct).toBe(true);
    expect(r.perBlank.s2.correct).toBe(false);
    expect(r.perBlank.s2.actual).toBe('true');
    expect(r.perBlank.s2.expected).toBe('false');
    expect(r.perBlank.s3.correct).toBe(false);
  });

  it('statement no respost es tracta com a incorrecte amb actual buit', () => {
    const r = validateResponse(exercise, { s1: true, s2: false });
    expect(r.correctOverall).toBe(false);
    expect(r.perBlank.s3.correct).toBe(false);
    expect(r.perBlank.s3.actual).toBe('');
    expect(r.perBlank.s3.expected).toBe('true');
  });
});

describe('validateResponse · pairMap', () => {
  const exercise = makeExercise({
    interaction: { type: 'matchPairs' },
    validation: {
      type: 'pairMap',
      pairs: [
        ['c1', 'c2'],
        ['c3', 'c4'],
        ['c5', 'c6'],
      ],
    },
  });

  it('accepta totes les parelles correctes en qualsevol ordre', () => {
    const r = validateResponse(exercise, [
      ['c3', 'c4'],
      ['c2', 'c1'],
      ['c5', 'c6'],
    ]);
    expect(r.correctOverall).toBe(true);
    expect(Object.values(r.perBlank).every((b) => b.correct)).toBe(true);
  });

  it('marca només les parelles que falten', () => {
    const r = validateResponse(exercise, [
      ['c1', 'c2'],
      ['c3', 'c6'], // incorrecta: c3 hauria d'anar amb c4
    ]);
    expect(r.correctOverall).toBe(false);
    const c1c2 = r.perBlank['c1|c2'];
    const c3c4 = r.perBlank['c3|c4'];
    const c5c6 = r.perBlank['c5|c6'];
    expect(c1c2.correct).toBe(true);
    expect(c3c4.correct).toBe(false);
    expect(c5c6.correct).toBe(false);
  });

  it('parelles extres no esperades invaliden tot i tot que hi siguin les correctes', () => {
    const r = validateResponse(exercise, [
      ['c1', 'c2'],
      ['c3', 'c4'],
      ['c5', 'c6'],
      ['c1', 'c6'], // extra no esperada
    ]);
    expect(r.correctOverall).toBe(false);
  });

  it('resposta buida produeix tot incorrecte', () => {
    const r = validateResponse(exercise, []);
    expect(r.correctOverall).toBe(false);
    expect(Object.values(r.perBlank).every((b) => !b.correct)).toBe(true);
    expect(r.perBlank['c1|c2'].expected).toBe('c1 ↔ c2');
  });

  it('expected usa sempre l\'ordre definit al JSON (no canònic)', () => {
    // Definit com ['c3','c4'] al JSON → expected llegible com "c3 ↔ c4"
    const r = validateResponse(exercise, []);
    expect(r.perBlank['c3|c4'].expected).toBe('c3 ↔ c4');
  });
});
