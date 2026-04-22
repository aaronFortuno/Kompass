/*
 * topicProgress · helper pur per calcular el progrés d'un topic a
 * partir de la seva estructura (steps/blocks) i de l'estat dels
 * exercicis al store.
 *
 * Decisió: fem servir `lastAttemptCorrect === true` com a criteri de
 * "consolidat", per coherència amb StepProgress (opció B). Un
 * exercici que s'havia resolt correctament però que s'ha reintentat
 * i ha fallat, torna a comptar com no consolidat. Si més endavant es
 * volgués una mètrica menys exigent, es pot canviar a
 * `firstCorrectAt != null` i documentar-ho.
 */

function collectExerciseIds(topic) {
  const ids = [];
  for (const step of topic?.steps ?? []) {
    // Format ric (§66): step.kind === 'exercise' amb exerciseId pla.
    // Sense això, els temes en format ric (p. ex. A1a-1, A1a-2) no
    // exposaven cap exercici i el progrés sortia a 0 a tot arreu.
    if (step?.kind === 'exercise' && step.exerciseId) {
      ids.push(step.exerciseId);
      continue;
    }
    // Format llegat: step.blocks[*].type === 'exercise'.
    for (const block of step?.blocks ?? []) {
      if (block?.type === 'exercise' && block.exerciseId) {
        ids.push(block.exerciseId);
      }
    }
  }
  return ids;
}

/**
 * Calcula el progrés d'un topic.
 *
 * @param {object} topic - Objecte Topic (amb steps[*].blocks[*]).
 * @param {object} exercisesState - Map id→estat d'exercici del store
 *   (forma: `{ [exerciseId]: { lastAttemptCorrect, firstCorrectAt, ... } }`).
 * @returns {{ total: number, completed: number, pct: number|null, allDone: boolean }}
 *   - total: nombre d'exercicis referenciats al topic.
 *   - completed: nombre d'exercicis amb lastAttemptCorrect === true.
 *   - pct: percentatge enter 0..100, o null si total === 0.
 *   - allDone: true si total > 0 i completed === total.
 */
export function computeTopicProgress(topic, exercisesState) {
  const ids = collectExerciseIds(topic);
  const total = ids.length;
  if (total === 0) {
    return { total: 0, completed: 0, pct: null, allDone: false };
  }
  const state = exercisesState ?? {};
  let completed = 0;
  for (const id of ids) {
    if (state[id]?.lastAttemptCorrect === true) completed += 1;
  }
  const pct = Math.round((completed / total) * 100);
  return { total, completed, pct, allDone: completed === total };
}
