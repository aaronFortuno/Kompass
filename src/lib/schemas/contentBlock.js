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
  headers: z.array(z.string()).optional(),
  rows: z.array(RowSchema),
  caption: z.string().optional(),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  ExplanationBlockSchema,
  TableBlockSchema,
]);
