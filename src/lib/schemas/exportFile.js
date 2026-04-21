import { z } from 'zod';

/*
 * Schema d'ExportFile · DATA-MODEL §3.7.
 *
 * Valida el fitxer JSON que l'usuari descarrega/importa per portar el seu
 * progrés entre dispositius o fer-ne còpia de seguretat.
 *
 * També valida (de manera permissiva) l'objecte UserProgress persistit
 * per Zustand (§3.5). Permissiva perquè el store pot guardar claus
 * internes noves en versions futures que no han de trencar imports antics:
 * fem strict només al que és obligatori per reconstruir l'estat i
 * deixem la resta com a `passthrough()` per reenviar-ho tal qual.
 */

// Un topic dins del progrés. Ampliable; alguns camps són específics del
// nostre store (visitedStepIds, exercisesCompleted).
const ProgressTopicSchema = z
  .object({
    status: z.enum(['in-progress', 'completed']).optional(),
    firstVisitedAt: z.string().datetime().nullable().optional(),
    completedAt: z.string().datetime().nullable().optional(),
    visitedStepIds: z.array(z.string()).optional(),
    exercisesCompleted: z.array(z.string()).optional(),
  })
  .passthrough();

const ProgressExerciseAttemptSchema = z
  .object({
    at: z.string().datetime(),
    correct: z.boolean(),
  })
  .passthrough();

const ProgressExerciseSchema = z
  .object({
    attempts: z.array(ProgressExerciseAttemptSchema).optional(),
    attemptCount: z.number().int().min(0).optional(),
    firstCorrectAt: z.string().datetime().nullable().optional(),
    lastAttemptCorrect: z.boolean().nullable().optional(),
  })
  .passthrough();

export const UserProgressSchema = z
  .object({
    schemaVersion: z.literal(1),
    createdAt: z.string().datetime().nullable().optional(),
    lastUpdated: z.string().datetime().nullable().optional(),
    topics: z.record(z.string(), ProgressTopicSchema).optional(),
    exercises: z.record(z.string(), ProgressExerciseSchema).optional(),
    activePathId: z.string().nullable().optional(),
    pathPositions: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export const ExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.literal('userProgressExport'),
  exportedAt: z.string().datetime(),
  appVersion: z.string().min(1),
  progress: UserProgressSchema,
});
