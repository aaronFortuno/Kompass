import { z } from 'zod';
import { ContentBlockSchema } from './contentBlock.js';

/*
 * Schema de Topic (DATA-MODEL §3.1).
 * El camp schemaVersion és a l'arrel per futures migracions (§2).
 */

const TOPIC_ID_REGEX = /^A\d[ab]-\d+$/;
const EXERCISE_ID_REGEX = /^A\d[ab]-\d+-ex-\d+$/;

export const TopicSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(TOPIC_ID_REGEX, 'Format esperat: A1a-14, A1b-19…'),
  level: z.string(),
  sublevel: z.string().optional(),
  number: z.number().int().min(1),
  title: z.string(),
  shortTitle: z.string(),
  description: z.string(),
  axes: z.array(z.string()),
  prerequisites: z.array(z.string().regex(TOPIC_ID_REGEX)).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  content: z.array(ContentBlockSchema),
  exerciseIds: z.array(z.string().regex(EXERCISE_ID_REGEX)).default([]),
});
