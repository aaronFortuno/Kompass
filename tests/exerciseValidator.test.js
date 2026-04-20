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
