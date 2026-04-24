/*
 * legacyBlocksToBeats · DATA-MODEL §3.8
 *
 * Adapter que converteix un step en format llegat (`blocks[]` amb tipus
 * explanation/table/exercise/callout) a una llista de beats equivalents,
 * perquè el Focus Reader pugui pintar les 77 lliçons antigues sense
 * esperar la migració al format ric.
 *
 * Regles:
 *   - Un bloc exclusiu `exercise` → beat 'exercise' (el step entera n'és un).
 *   - Un bloc `explanation` → encapçalaments (###, ####) esdevenen beats
 *     'heading'; la resta de Markdown es simplifica a paràgrafs i cada
 *     paràgraf es fragmenta per frases en beats 'body'.
 *   - Un bloc `table` → beat 'syn-table' (taula amb estructura convencional).
 *     Si la taula té exactament els headers ES/CA/DE/EN detectats, esdevé
 *     un beat 'compare'.
 *   - Un bloc `callout` → beat 'callout'.
 *
 * L'adapter és pragmàtic: si un Markdown és molt ric (llistes, blockquotes,
 * subtítols intercalats...), simplifica. El resultat és usable però menys
 * pausat que una lliçó migrada al format ric. És un pont, no una destinació.
 */

const COMPARE_HEADER_SETS = [
  new Set(['es', 'ca', 'de', 'en']),
  new Set(['castellà', 'català', 'alemany', 'anglès']),
  new Set(['castellano', 'catalán', 'alemán', 'inglés']),
  new Set(['spanish', 'catalan', 'german', 'english']),
];

function normalizeHeader(h) {
  if (typeof h === 'object' && h !== null) return (h.text || '').toString().toLowerCase().trim();
  return (h || '').toString().toLowerCase().trim();
}

function looksLikeCompareTable(table) {
  if (!table || !Array.isArray(table.headers) || table.headers.length !== 4) return false;
  const norm = table.headers.map(normalizeHeader);
  return COMPARE_HEADER_SETS.some((set) =>
    norm.every((h) => Array.from(set).some((k) => h.startsWith(k))),
  );
}

function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function markdownToBeats(body) {
  const beats = [];
  if (!body) return beats;

  const lines = body.split(/\n/);
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const paragraph = paragraphBuffer.join(' ').trim();
    paragraphBuffer = [];
    if (!paragraph) return;
    // Fragmentem per frases dins del paràgraf, una frase per beat body.
    splitSentences(paragraph).forEach((sentence) => {
      beats.push({ type: 'body', text: sentence });
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      continue;
    }
    // Encapçalaments markdown ### / #### → beat heading
    const headingMatch = /^(#{3,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      beats.push({ type: 'heading', text: headingMatch[2] });
      continue;
    }
    // Llistes amb "- " o "1. " → cada ítem com a beat point (simplificació)
    const listMatch = /^(?:[-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      flushParagraph();
      beats.push({ type: 'body', text: listMatch[1] });
      continue;
    }
    // Blockquote "> " → el tractem com a body simple
    const quoteMatch = /^>\s+(.*)$/.exec(line);
    if (quoteMatch) {
      paragraphBuffer.push(quoteMatch[1]);
      continue;
    }
    // Línia normal: s'acumula al paràgraf.
    paragraphBuffer.push(line);
  }
  flushParagraph();

  return beats;
}

function tableToBeat(table) {
  if (looksLikeCompareTable(table)) {
    // Convertim les files a forma { es, ca, de, en }.
    const rows = (table.rows || []).map((row) => {
      const cells = row.map((c) => (typeof c === 'object' && c !== null ? c.text || '' : c));
      return {
        es: cells[0] || '',
        ca: cells[1] || '',
        de: cells[2] || '',
        en: cells[3] || '',
      };
    });
    return { type: 'compare', rows };
  }
  return { type: 'syn-table', table };
}

function blockToBeats(block) {
  if (!block || !block.type) return [];
  switch (block.type) {
    case 'explanation':
      return markdownToBeats(block.body || '');
    case 'table':
      return [tableToBeat(block)];
    case 'callout':
      return [
        {
          type: 'callout',
          callout: {
            variant: block.variant || 'info',
            title: block.title || '',
            body: block.body || '',
          },
        },
      ];
    case 'exercise':
      return [
        {
          type: 'exercise',
          exerciseId: block.exerciseId,
          variant: block.variant || 'quick-check',
        },
      ];
    case 'onboardingSetup':
      return [{ type: 'onboarding-setup' }];
    default:
      return [];
  }
}

export function legacyBlocksToBeats(step) {
  if (!step || !Array.isArray(step.blocks)) return [];
  // Cas especial: un únic bloc exercise.
  if (step.blocks.length === 1 && step.blocks[0].type === 'exercise') {
    return blockToBeats(step.blocks[0]);
  }
  const beats = [];
  for (const block of step.blocks) {
    beats.push(...blockToBeats(block));
  }
  if (beats.length === 0) {
    beats.push({ type: 'heading', text: step.id || '(sense contingut)', kicker: '' });
  }
  return beats;
}

/*
 * Per coherència amb `buildBeats`, exportem un dispatcher conjunt
 * que tria entre ric i llegat.
 */
export function toBeats(step, buildRich) {
  if (!step) return [];
  if (typeof step.kind === 'string' && buildRich) {
    return buildRich(step);
  }
  return legacyBlocksToBeats(step);
}
