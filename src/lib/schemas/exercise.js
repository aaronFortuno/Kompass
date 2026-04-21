import { z } from 'zod';
import { RichStringSchema } from './richText.js';

/*
 * Schema d'Exercise (DATA-MODEL §3.3 + §5-§8).
 * Cobreix els tipus implementats fins ara:
 *   - Stimulus: text, textWithBlanks, image, cardSet
 *   - Interaction: dropdownFill, typeIn, singleChoice, trueFalse, matchPairs
 *   - Validation: slotMap, slotMapMultiple, exactMatch, truthMap, pairMap
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

const ImageStimulusSchema = z.object({
  type: z.literal('image'),
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

// Contingut d'una card dins d'un cardSet: text o imatge.
const CardContentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: RichStringSchema,
  }),
  z.object({
    type: z.literal('image'),
    src: z.string().min(1),
    alt: z.string().min(1),
  }),
]);

const CardSetStimulusSchema = z.object({
  type: z.literal('cardSet'),
  cards: z
    .array(
      z.object({
        id: z.string().min(1),
        group: z.string().min(1),
        content: CardContentSchema,
      })
    )
    .min(2),
});

const StimulusSchema = z.discriminatedUnion('type', [
  TextStimulusSchema,
  TextWithBlanksStimulusSchema,
  ImageStimulusSchema,
  CardSetStimulusSchema,
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

const SingleChoiceInteractionSchema = z.object({
  type: z.literal('singleChoice'),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: RichStringSchema,
      })
    )
    .min(2),
});

const TrueFalseInteractionSchema = z.object({
  type: z.literal('trueFalse'),
  statements: z
    .array(
      z.object({
        id: z.string().min(1),
        text: RichStringSchema,
      })
    )
    .min(1),
});

const MatchPairsInteractionSchema = z.object({
  type: z.literal('matchPairs'),
  groupALabel: z.string().optional(),
  groupBLabel: z.string().optional(),
});

const InteractionSchema = z.discriminatedUnion('type', [
  DropdownFillInteractionSchema,
  TypeInInteractionSchema,
  SingleChoiceInteractionSchema,
  TrueFalseInteractionSchema,
  MatchPairsInteractionSchema,
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

const TruthMapValidationSchema = z.object({
  type: z.literal('truthMap'),
  answers: z.record(z.boolean()),
});

const PairMapValidationSchema = z.object({
  type: z.literal('pairMap'),
  pairs: z
    .array(z.tuple([z.string().min(1), z.string().min(1)]))
    .min(1),
});

const ValidationSchema = z.discriminatedUnion('type', [
  SlotMapValidationSchema,
  SlotMapMultipleValidationSchema,
  ExactMatchValidationSchema,
  TruthMapValidationSchema,
  PairMapValidationSchema,
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
