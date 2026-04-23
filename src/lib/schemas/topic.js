import { z } from 'zod';
import { ContentBlockSchema } from './contentBlock.js';

/*
 * Schema de Topic (DATA-MODEL §3.1).
 *
 * Els temes s'organitzen en steps (píndoles) que el Focus Reader
 * presenta beat a beat (ARCHITECTURE §18). Cada step pot venir en dos
 * formats durant el període de migració:
 *
 *   1. Format ric (preferent):  step.kind ∈ {narrative, synthesis, exercise}
 *      amb camps plans per tipus (heading/lead/body/points/tabs/…).
 *   2. Format llegat:  step.blocks[] amb ContentBlock[] (explanation,
 *      table, exercise, callout). Suportat via adapter legacyBlocksToBeats.
 *
 * Un tema ha de ser tot d'un format o tot de l'altre.
 */

// Accepta tant ids de gramàtica (A1a-14, A1b-19…) com de vocabulari
// (A1a-V3, A1b-V2…). El prefix "V" s'usa per marcar temes lèxics
// temàtics interliveats dins dels blocs de gramàtica.
const TOPIC_ID_REGEX = /^A\d[ab]-(V?\d+)$/;
const STEP_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/;

// ─────────────────────────────── format llegat

const LegacyStepSchema = z.object({
  id: z.string().regex(STEP_ID_REGEX, 'kebab-case, comença amb alfanumèric').optional(),
  blocks: z.array(ContentBlockSchema).min(1),
});

// ─────────────────────────────── format ric: peces

// TabImage · DATA-MODEL §3.10
// Miniatura il·lustrativa inline dins d'un beat `pron` o `example`.
// Diferent de Visual (§3.9): sempre raster, sempre petita, mai genera
// un beat propi — es renderitza al costat del text del beat pare.
const TabImageSchema = z.object({
  src: z.string().min(1),
  srcset: z.string().optional(),
  sizes: z.string().optional(),
  alt: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
  width: z.number().int().min(80).max(480).optional(),
});

const ExampleSchema = z.object({
  de: z.string(),
  ca: z.string().optional(),
  note: z.string().optional(),
  image: TabImageSchema.optional(),
});

const TabSchema = z.object({
  pron: z.string(),
  gloss: z.string().optional(),
  note: z.string().optional(),
  example: z
    .object({
      de: z.string(),
      ca: z.string().optional(),
    })
    .optional(),
  image: TabImageSchema.optional(),
});

const PairSchema = z.object({
  personal: z.string(),
  possessive: z.string(),
  gloss: z.string().optional(),
});

const CompareRowSchema = z.object({
  es: z.string().optional(),
  ca: z.string().optional(),
  de: z.string().optional(),
  en: z.string().optional(),
});

const PitfallSchema = z.object({
  bad: z.string(),
  good: z.string(),
  why: z.string().optional(),
});

const RichCalloutSchema = z.object({
  variant: z.enum(['info', 'tip', 'warning', 'danger', 'example']),
  title: z.string().optional(),
  body: z.string(),
});

// Cel·la d'una taula de síntesi al format ric: string o {text: string}
const CellSchema = z.union([z.string(), z.object({ text: z.string() })]);
const SynTableSchema = z.object({
  title: z.string().optional(),
  headers: z.array(CellSchema).optional(),
  rows: z.array(z.array(CellSchema)).min(1),
});

// Element visual (imatge o SVG inline) · DATA-MODEL §3.9
const VisualSchema = z
  .object({
    src: z.string().optional(),
    srcset: z.string().optional(),
    sizes: z.string().optional(),
    svg: z.string().optional(),
    alt: z.string(),
    caption: z.string().optional(),
    credit: z.string().optional(),
    width: z.number().int().positive().optional(),
  })
  .refine((v) => Boolean(v.src) || Boolean(v.svg), {
    message: 'Visual ha de tenir `src` o `svg` (un dels dos).',
  });

// ─────────────────────────────── format ric: steps

const RichExerciseStepSchema = z.object({
  id: z.string().regex(STEP_ID_REGEX).optional(),
  kind: z.literal('exercise'),
  exerciseId: z.string(),
  variant: z.enum(['quick-check', 'assessment']).optional(),
});

const RichContentStepSchema = z.object({
  id: z.string().regex(STEP_ID_REGEX).optional(),
  kind: z.enum(['narrative', 'synthesis']),
  heading: z.string().optional(),
  lead: z.string().optional(),
  body: z.string().optional(),
  points: z.array(z.string()).optional(),
  examples: z.array(ExampleSchema).optional(),
  tabs: z.array(TabSchema).optional(),
  pairs: z.array(PairSchema).optional(),
  rule: z.array(z.string()).optional(),
  comparison: z.array(CompareRowSchema).optional(),
  pitfalls: z.array(PitfallSchema).optional(),
  callout: RichCalloutSchema.optional(),
  tables: z.array(SynTableSchema).optional(),
  visuals: z.array(VisualSchema).optional(),
});

/*
 * Discriminated union fina: tot step ric té `kind`; el llegat no. Zod
 * no suporta un discriminador "absent vs present" directament, així que
 * usem un z.union amb refinements. El rendiment n'és el mateix en
 * pràctica (validació pure-JS per lliçó, cops a l'any).
 */
const StepSchema = z.union([
  RichExerciseStepSchema,
  RichContentStepSchema,
  LegacyStepSchema,
]);

// ─────────────────────────────── Topic

export const TopicSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(TOPIC_ID_REGEX, 'Format esperat: A1a-14, A1b-19…'),
    level: z.string(),
    sublevel: z.string().optional(),
    number: z.number().int().min(0),
    title: z.string(),
    shortTitle: z.string(),
    description: z.string(),
    axes: z.array(z.string()),
    category: z.enum(['grammar', 'vocabulary']).optional(),
    prerequisites: z.array(z.string().regex(TOPIC_ID_REGEX)).optional(),
    estimatedMinutes: z.number().int().min(1).optional(),
    // §113: marca de revisió pedagògica finalitzada. Quan no hi és o
    // val false, el reader mostra un avís "provisional · en revisió"
    // i el temari afegeix un badge discret al títol. Només es marca
    // a true quan l'Aarón ha validat el capítol sencer.
    reviewed: z.boolean().optional(),
    steps: z.array(StepSchema).min(1),
  })
  .superRefine((topic, ctx) => {
    // Ids d'step únics dins del tema.
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

    // Coherència de format: tots els steps del tema han de ser del mateix
    // estil (tots rics o tots llegats).
    const hasRich = topic.steps.some((s) => typeof s.kind === 'string');
    const hasLegacy = topic.steps.some((s) => Array.isArray(s.blocks));
    if (hasRich && hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps'],
        message:
          'Un tema no pot barrejar format ric (kind) i format llegat (blocks[]). Migra-ho tot a un sol format.',
      });
    }
  });
