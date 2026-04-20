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

  it('accepta resposta correcta', () => {
    expect(validateResponse(exercise, { 1: 'Mein', 2: 'Meine' }).correct).toBe(true);
  });

  it('rebutja si un slot falla', () => {
    expect(validateResponse(exercise, { 1: 'Meine', 2: 'Meine' }).correct).toBe(false);
  });

  it('rebutja si un slot és buit', () => {
    expect(validateResponse(exercise, { 1: 'Mein' }).correct).toBe(false);
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

  it('accepta exactament igual', () => {
    expect(validateResponse(exercise, { 1: 'ich', 2: 'Sie' }).correct).toBe(true);
  });

  it('accepta amb espais en blanc extra (trim)', () => {
    expect(validateResponse(exercise, { 1: '  ich ', 2: 'Sie' }).correct).toBe(true);
  });

  it('rebutja diferència de cas quan caseSensitive', () => {
    expect(validateResponse(exercise, { 1: 'Ich', 2: 'Sie' }).correct).toBe(false);
    expect(validateResponse(exercise, { 1: 'ich', 2: 'sie' }).correct).toBe(false);
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

  it('accepta qualsevol variant de cas', () => {
    expect(validateResponse(exercise, { 1: 'WOHNE' }).correct).toBe(true);
    expect(validateResponse(exercise, { 1: 'Wohne' }).correct).toBe(true);
    expect(validateResponse(exercise, { 1: 'wohne' }).correct).toBe(true);
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

  it('accepta qualsevol forma de la llista', () => {
    expect(validateResponse(exercise, { 1: 'am' }).correct).toBe(true);
    expect(validateResponse(exercise, { 1: 'an dem' }).correct).toBe(true);
  });

  it('rebutja formes fora de la llista', () => {
    expect(validateResponse(exercise, { 1: 'auf dem' }).correct).toBe(false);
  });
});
