import { z } from 'zod';
import { RichStringSchema } from './richText.js';

/*
 * Schemes de ContentBlock (DATA-MODEL §3.2).
 * De moment només explanation i table (suficients per a A1a-1).
 * Els altres tipus (lerntipp, example, audio, video) s'afegiran quan calgui.
 */

const CellObjectSchema = z.object({
  text: RichStringSchema,
  rowspan: z.number().int().min(1).optional(),
  colspan: z.number().int().min(1).optional(),
  emphasis: z.enum(['header', 'accent', 'muted']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const CellSchema = z.union([RichStringSchema, CellObjectSchema]);

const RowSchema = z.array(CellSchema);

const ExplanationBlockSchema = z.object({
  type: z.literal('explanation'),
  title: z.string().optional(),
  body: RichStringSchema,
});

const TableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  headers: z.array(CellSchema).optional(),
  rows: z.array(RowSchema),
  caption: z.string().optional(),
});

const EXERCISE_ID_REGEX = /^A\d[ab]-\d+-ex-\d+$/;

const ExerciseBlockSchema = z.object({
  type: z.literal('exercise'),
  exerciseId: z.string().regex(EXERCISE_ID_REGEX),
  variant: z.enum(['quick-check', 'assessment']).default('quick-check').optional(),
});

const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['info', 'tip', 'warning', 'danger', 'example']),
  title: z.string().optional(),
  body: RichStringSchema,
});

// Wizard d'inici: apareix com un únic beat que ocupa tota la pantalla
// del reader i permet configurar typewriter, autoplay, velocitat d'àudio
// i música de fons amb previsualitzacions. No té camps propis —
// l'estat el gestiona el component a partir del settings store.
const OnboardingSetupBlockSchema = z.object({
  type: z.literal('onboardingSetup'),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  ExplanationBlockSchema,
  TableBlockSchema,
  ExerciseBlockSchema,
  CalloutBlockSchema,
  OnboardingSetupBlockSchema,
]);
