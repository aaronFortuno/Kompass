import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/*
 * UserProgress store · DATA-MODEL §3.5 + ARCHITECTURE §6.1
 *
 * Persistit a localStorage amb clau 'kompass.progress.v1'.
 *
 * Amplia el DATA-MODEL amb `visitedStepIds` dins de cada topic (set
 * d'ids de step visitats) i `lastAttemptCorrect` dins de cada
 * exercici — aquest últim permet el matís "consolidat":
 *   - firstCorrectAt: primera vegada que s'ha resolt correctament
 *     (es guarda per sempre un cop s'arriba).
 *   - lastAttemptCorrect: resultat de l'últim intent. Si reintentes i
 *     falles, torna a false. És el que fa servir la UI per marcar
 *     "pendent de consolidar" (warning).
 *
 * Els attempts es truncuen als 10 últims per no fer créixer el blob.
 */

const INITIAL_STATE = {
  schemaVersion: 1,
  createdAt: null,
  lastUpdated: null,
  topics: {},
  exercises: {},
};

const MAX_ATTEMPTS = 10;

function nowIso() {
  return new Date().toISOString();
}

function getOrCreateTopic(state, topicId, now) {
  return (
    state.topics[topicId] ?? {
      status: 'in-progress',
      firstVisitedAt: now,
      visitedStepIds: [],
      exercisesCompleted: [],
    }
  );
}

export const useProgressStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      markStepVisited: (topicId, stepId) => {
        if (!topicId || !stepId) return;
        set((state) => {
          const now = nowIso();
          const topic = getOrCreateTopic(state, topicId, now);
          if (topic.visitedStepIds.includes(stepId)) {
            // Ja visitat; no cal tornar a escriure-ho.
            return state;
          }
          return {
            ...state,
            createdAt: state.createdAt ?? now,
            lastUpdated: now,
            topics: {
              ...state.topics,
              [topicId]: {
                ...topic,
                visitedStepIds: [...topic.visitedStepIds, stepId],
              },
            },
          };
        });
      },

      recordExerciseAttempt: (topicId, exerciseId, correct) => {
        if (!topicId || !exerciseId) return;
        set((state) => {
          const now = nowIso();
          const existing = state.exercises[exerciseId] ?? {
            attempts: [],
            attemptCount: 0,
            firstCorrectAt: null,
            lastAttemptCorrect: null,
          };
          const attempts = [
            ...existing.attempts,
            { at: now, correct },
          ].slice(-MAX_ATTEMPTS);
          const exerciseNext = {
            attempts,
            attemptCount: existing.attemptCount + 1,
            firstCorrectAt: existing.firstCorrectAt ?? (correct ? now : null),
            lastAttemptCorrect: correct,
          };

          const topic = getOrCreateTopic(state, topicId, now);
          const exercisesCompleted = correct
            ? topic.exercisesCompleted.includes(exerciseId)
              ? topic.exercisesCompleted
              : [...topic.exercisesCompleted, exerciseId]
            : topic.exercisesCompleted;

          return {
            ...state,
            createdAt: state.createdAt ?? now,
            lastUpdated: now,
            topics: {
              ...state.topics,
              [topicId]: { ...topic, exercisesCompleted },
            },
            exercises: {
              ...state.exercises,
              [exerciseId]: exerciseNext,
            },
          };
        });
      },

      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'kompass.progress.v1',
      version: 1,
      // Futures migracions:
      //   migrate: (persistedState, fromVersion) => {
      //     if (fromVersion === 0) { ... }
      //     return persistedState;
      //   },
    }
  )
);

/**
 * Lookup directe de l'estat d'un exercici (pot ser null).
 */
export function useExerciseProgress(exerciseId) {
  return useProgressStore((s) =>
    exerciseId ? s.exercises[exerciseId] ?? null : null
  );
}

/**
 * Lookup directe de l'estat d'un topic (pot ser null).
 */
export function useTopicProgress(topicId) {
  return useProgressStore((s) =>
    topicId ? s.topics[topicId] ?? null : null
  );
}
