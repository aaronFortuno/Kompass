import { z } from 'zod';
import { ContentBlockSchema } from './contentBlock.js';

/*
 * Schema de Topic (DATA-MODEL §3.1).
 * Els temes s'organitzen en steps (píndoles) que el reproductor
 * presenta un per un (ARCHITECTURE §18).
 */

const TOPIC_ID_REGEX = /^A\d[ab]-\d+$/;

const STEP_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

const StepSchema = z.object({
  id: z.string().regex(STEP_ID_REGEX, 'kebab-case, comença amb alfanumèric').optional(),
  blocks: z.array(ContentBlockSchema).min(1),
});

export const TopicSchema = z
  .object({
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
    steps: z.array(StepSchema).min(1),
  })
  .superRefine((topic, ctx) => {
    const seen = new Set();
    topic.steps.forEach((step, i) => {
      if (!step.id) return;
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', i, 'id'],
          message: `Step id duplicat: ${step.id}`,
        });
      }
      seen.add(step.id);
    });
  });
