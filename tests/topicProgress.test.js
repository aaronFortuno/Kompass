import { describe, it, expect } from 'vitest';
import { computeTopicProgress } from '@/lib/topicProgress.js';

const topicWithExercises = {
  id: 'A1a-1',
  steps: [
    {
      id: 'intro',
      blocks: [{ type: 'explanation', body: 'Text' }],
    },
    {
      id: 'check-1',
      blocks: [
        { type: 'exercise', exerciseId: 'A1a-1-ex-01', variant: 'quick-check' },
      ],
    },
    {
      id: 'check-2',
      blocks: [
        { type: 'exercise', exerciseId: 'A1a-1-ex-02', variant: 'quick-check' },
        { type: 'explanation', body: 'Més text' },
      ],
    },
    {
      id: 'assessment',
      blocks: [
        { type: 'exercise', exerciseId: 'A1a-1-ex-03', variant: 'assessment' },
      ],
    },
  ],
};

const topicReadingOnly = {
  id: 'A1a-99',
  steps: [
    { id: 'intro', blocks: [{ type: 'explanation', body: 'Text' }] },
    { id: 'outro', blocks: [{ type: 'callout', body: 'Nota' }] },
  ],
};

describe('computeTopicProgress', () => {
  it('retorna pct=null i allDone=false si el topic no té exercicis', () => {
    const res = computeTopicProgress(topicReadingOnly, {});
    expect(res).toEqual({ total: 0, completed: 0, pct: null, allDone: false });
  });

  it('compta 0 completats si no hi ha estat al store', () => {
    const res = computeTopicProgress(topicWithExercises, {});
    expect(res.total).toBe(3);
    expect(res.completed).toBe(0);
    expect(res.pct).toBe(0);
    expect(res.allDone).toBe(false);
  });

  it('ignora exercicis amb lastAttemptCorrect === false', () => {
    const state = {
      'A1a-1-ex-01': { lastAttemptCorrect: false, firstCorrectAt: null },
    };
    const res = computeTopicProgress(topicWithExercises, state);
    expect(res.completed).toBe(0);
    expect(res.pct).toBe(0);
    expect(res.allDone).toBe(false);
  });

  it('compta només els que tenen lastAttemptCorrect === true', () => {
    const state = {
      'A1a-1-ex-01': { lastAttemptCorrect: true, firstCorrectAt: 'x' },
      'A1a-1-ex-02': { lastAttemptCorrect: false, firstCorrectAt: 'y' },
      'A1a-1-ex-03': { lastAttemptCorrect: null, firstCorrectAt: null },
    };
    const res = computeTopicProgress(topicWithExercises, state);
    expect(res.total).toBe(3);
    expect(res.completed).toBe(1);
    expect(res.pct).toBe(33);
    expect(res.allDone).toBe(false);
  });

  it('marca allDone=true quan tots estan consolidats', () => {
    const state = {
      'A1a-1-ex-01': { lastAttemptCorrect: true },
      'A1a-1-ex-02': { lastAttemptCorrect: true },
      'A1a-1-ex-03': { lastAttemptCorrect: true },
    };
    const res = computeTopicProgress(topicWithExercises, state);
    expect(res.total).toBe(3);
    expect(res.completed).toBe(3);
    expect(res.pct).toBe(100);
    expect(res.allDone).toBe(true);
  });

  it('tolera exercisesState undefined/null', () => {
    const res = computeTopicProgress(topicWithExercises, undefined);
    expect(res.completed).toBe(0);
    expect(res.pct).toBe(0);
  });

  it('tolera topic sense steps', () => {
    const res = computeTopicProgress({}, {});
    expect(res).toEqual({ total: 0, completed: 0, pct: null, allDone: false });
  });

  it('ignora blocks que no són de tipus exercise', () => {
    const mixed = {
      steps: [
        {
          id: 's1',
          blocks: [
            { type: 'explanation', body: 'T' },
            { type: 'callout', body: 'C' },
            { type: 'exercise', exerciseId: 'X-1', variant: 'quick-check' },
          ],
        },
      ],
    };
    const res = computeTopicProgress(mixed, {
      'X-1': { lastAttemptCorrect: true },
    });
    expect(res.total).toBe(1);
    expect(res.completed).toBe(1);
    expect(res.pct).toBe(100);
    expect(res.allDone).toBe(true);
  });
});
