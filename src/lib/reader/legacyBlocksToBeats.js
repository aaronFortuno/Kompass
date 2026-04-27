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

function hasUnclosedMarker(str) {
  return (str.match(/\*\*/g) || []).length % 2 !== 0
      || (str.match(/==/g) || []).length % 2 !== 0;
}

function splitSentences(text) {
  if (!text) return [];
  const parts = text
    .split(/(?<=(?<!\d)[.!?…])\s+(?=\p{Lu}|[*_]{1,2}\p{Lu})/u)
    .map((s) => s.trim())
    .filter(Boolean);
  // Reagrupa parts amb marcadors de format desaparellats (** o ==).
  const merged = [];
  for (const part of parts) {
    if (merged.length > 0 && hasUnclosedMarker(merged[merged.length - 1])) {
      merged[merged.length - 1] += ' ' + part;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

function parseMarkdownTable(tableLines) {
  // Separa una línia de taula en cel·les, eliminant les barres exteriors.
  const parseCells = (line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = parseCells(tableLines[0]);
  // Saltem la línia separadora (|---|---|)
  const startIdx = tableLines[1] && /^[\s|:-]+$/.test(tableLines[1]) ? 2 : 1;
  const rows = tableLines.slice(startIdx).map(parseCells);
  return { headers, rows };
}

function markdownToBeats(body) {
  const beats = [];
  if (!body) return beats;

  const lines = body.split(/\n/);
  let paragraphBuffer = [];
  let tableBuffer = [];

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

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const table = parseMarkdownTable(tableBuffer);
    tableBuffer = [];
    beats.push({ type: 'syn-table', table });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushTable();
      flushParagraph();
      continue;
    }
    // Taula markdown: línies que comencen i acaben amb |
    if (/^\|.*\|$/.test(line)) {
      flushParagraph();
      tableBuffer.push(line);
      continue;
    }
    // Si veníem d'una taula i ara no és taula, tanquem-la
    flushTable();
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
  flushTable();
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
  // Si el step té heading propi (usat amb pitfalls estructurats)
  if (step.heading) {
    beats.push({ type: 'heading', text: step.heading, kicker: step.id });
  }
  for (const block of step.blocks) {
    beats.push(...blockToBeats(block));
  }
  // Pitfalls estructurats (format ric dins de step llegat)
  if (Array.isArray(step.pitfalls) && step.pitfalls.length) {
    step.pitfalls.forEach((p, i) => {
      beats.push({ type: 'pitfall', pit: p, idx: i + 1, total: step.pitfalls.length });
    });
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
