import { getExercise } from '@/lib/dataLoader.js';

export function useExercise(id) {
  return getExercise(id);
}
