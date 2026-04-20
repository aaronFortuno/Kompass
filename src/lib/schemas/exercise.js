import { z } from 'zod';
import { RichStringSchema } from './richText.js';

/*
 * Schema d'Exercise (DATA-MODEL §3.3 + §5-§8).
 * MVP cobreix els tipus necessaris per al primer tema (A1a-1):
 *   - Stimulus: text, textWithBlanks
 *   - Interaction: dropdownFill, typeIn
 *   - Validation: slotMap, slotMapMultiple, exactMatch
 * Els altres tipus s'afegiran a mesura que toquin.
 */

const EXERCISE_ID_REGEX = /^A\d[ab]-\d+-ex-\d+$/;
const TOPIC_ID_REGEX = /^A\d[ab]-\d+$/;

// ─── Stimulus ────────────────────────────────────────────────

const TextStimulusSchema = z.object({
  type: z.literal('text'),
  content: RichStringSchema,
});

const TextWithBlanksStimulusSchema = z.object({
  type: z.literal('textWithBlanks'),
  template: z.string(),
  blanks: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().optional(),
      })
    )
    .min(1),
});

const StimulusSchema = z.discriminatedUnion('type', [
  TextStimulusSchema,
  TextWithBlanksStimulusSchema,
]);

// ─── Interaction ─────────────────────────────────────────────

const DropdownFillInteractionSchema = z.object({
  type: z.literal('dropdownFill'),
  slots: z
    .array(
      z.object({
        blankId: z.string().min(1),
        options: z.array(z.string()).min(2),
      })
    )
    .min(1),
});

const TypeInInteractionSchema = z.object({
  type: z.literal('typeIn'),
  slots: z
    .array(
      z.object({
        blankId: z.string().min(1),
        placeholder: z.string().optional(),
      })
    )
    .min(1),
  caseSensitive: z.boolean().optional().default(false),
  trimWhitespace: z.boolean().optional().default(true),
});

const InteractionSchema = z.discriminatedUnion('type', [
  DropdownFillInteractionSchema,
  TypeInInteractionSchema,
]);

// ─── Validation ──────────────────────────────────────────────

const SlotMapValidationSchema = z.object({
  type: z.literal('slotMap'),
  answers: z.record(z.string()),
});

const SlotMapMultipleValidationSchema = z.object({
  type: z.literal('slotMapMultiple'),
  answers: z.record(z.array(z.string()).min(1)),
});

const ExactMatchValidationSchema = z.object({
  type: z.literal('exactMatch'),
  answer: z.string(),
});

const ValidationSchema = z.discriminatedUnion('type', [
  SlotMapValidationSchema,
  SlotMapMultipleValidationSchema,
  ExactMatchValidationSchema,
]);

// ─── Feedback ────────────────────────────────────────────────

const FeedbackReferenceSchema = z.string().regex(TOPIC_ID_REGEX);

const FeedbackSchema = z.object({
  correct: z.object({
    message: RichStringSchema,
    references: z.array(FeedbackReferenceSchema).optional(),
  }),
  incorrect: z.object({
    default: RichStringSchema,
    byResponse: z
      .array(
        z.object({
          match: z.record(z.any()),
          message: RichStringSchema,
          references: z.array(FeedbackReferenceSchema).optional(),
        })
      )
      .optional(),
  }),
});

// ─── Exercise ────────────────────────────────────────────────

export const ExerciseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(EXERCISE_ID_REGEX, 'Format esperat: A1a-1-ex-01'),
  topicId: z.string().regex(TOPIC_ID_REGEX),
  title: z.string(),
  prompt: z.string(),
  difficulty: z.number().int().min(1).max(3).optional(),
  tags: z.array(z.string()).optional(),
  stimulus: StimulusSchema,
  interaction: InteractionSchema,
  validation: ValidationSchema,
  feedback: FeedbackSchema,
  hint: z.string().optional(),
  relatedTopicIds: z.array(z.string().regex(TOPIC_ID_REGEX)).optional(),
});
