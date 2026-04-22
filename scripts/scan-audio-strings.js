#!/usr/bin/env node
/*
 * scan-audio-strings.js · §98
 *
 * ─────────────────────────────────────────────────────────────────────
 * Què fa
 * ─────────────────────────────────────────────────────────────────────
 *
 * Escaneja tots els JSON de tema sota `src/data/topics/**` i extreu els
 * strings alemanys que necessitaran àudio prerecorded. Per cada string
 * únic (normalitzat i despullat dels marcadors d'inline rich text)
 * calcula un hash SHA-1 i escriu `src/audio/manifest.json` amb el
 * mapping complet { hash → text + llista de llocs on apareix }.
 *
 * Ús:
 *   node scripts/scan-audio-strings.js            # escriu el manifest
 *   node scripts/scan-audio-strings.js --dry-run  # no escriu res
 *   node scripts/scan-audio-strings.js --verbose  # llista tots els extrets
 *
 * Disponible també com a:
 *   npm run scan-audio
 *
 * ─────────────────────────────────────────────────────────────────────
 * Fonts escanejades
 * ─────────────────────────────────────────────────────────────────────
 *
 * Format ric (DATA-MODEL §3.1.1):
 *   - step.tabs[].pron
 *   - step.tabs[].example.de
 *   - step.examples[].de
 *   - step.comparison[].de
 *   - step.pairs[].personal, step.pairs[].possessive
 *
 * Format llegat (DATA-MODEL §3.1.2, blocs):
 *   - block.type="table" amb cel·les estructurades amb camp `de` o
 *     amb string/object-text que formin part d'una fila (comparacions
 *     es/ca/de/en).
 *   - block.type="example" amb items[].de
 *
 * Inline rich (§3.6 + §98 tasca 1):
 *   - Qualsevol span `!!text!!` dins de camps amb inline rich:
 *     step.body, step.lead, step.points[], step.rules[],
 *     step.callout.body, step.pitfalls[].why, step.title, i
 *     equivalents del format llegat (explanation.body, callout.body,
 *     table cells…). Es busca amb regex global sobre TOT el text ric
 *     del tema per no haver de mantenir una llista exhaustiva.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Normalització
 * ─────────────────────────────────────────────────────────────────────
 *
 *   1. `.trim()` — elimina espais inicials/finals.
 *   2. Despulla marcadors d'inline rich (**bold**, ==hl==, _it_, `c`,
 *      !!a!!) amb el mateix algorisme que `stripRichMarkers` al client.
 *      Raó: el motor TTS ha de rebre text net.
 *   3. *No* es normalitza la puntuació: "Hallo" i "Hallo!" es tracten
 *      com a strings diferents. La pronúncia (entonació, cadència)
 *      canvia amb la puntuació — cal àudios separats.
 *   4. *No* es normalitza majúscula/minúscula: "ich" i "Ich" són
 *      strings diferents, perquè al principi d'oració el nom previ o
 *      la capitalització canvia l'èmfasi.
 *
 * Hash: SHA-1 hex del text net. Col·lisions irrellevants al volum
 * d'strings esperat (< 10 000). SHA-1 triat per longitud còmoda (40
 * hex chars cap de problema) i ser universal.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Contracte del manifest
 * ─────────────────────────────────────────────────────────────────────
 *
 * {
 *   "generatedAt": "2026-04-22T14:32:00Z",
 *   "totalStrings": 1234,
 *   "totalChars": 23456,
 *   "entries": [
 *     {
 *       "hash": "ab12…",
 *       "text": "Ich heiße Anna.",
 *       "sources": [
 *         { "topic": "A1a-1", "path": "steps[0].examples[0].de" },
 *         { "topic": "A1a-3", "path": "steps[2].tabs[1].example.de" }
 *       ]
 *     },
 *     …
 *   ]
 * }
 *
 * L'ordre de les entries és estable (ordenades per hash ascendent)
 * per fer les diffs del manifest llegibles entre execucions.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Ús futur: generador Azure TTS
 * ─────────────────────────────────────────────────────────────────────
 *
 * L'usuari principal escriurà un generador que:
 *   1. Llegeix aquest manifest.
 *   2. Per cada entry sense MP3 existent a `public/audio/<hash>.mp3`,
 *      crida Azure Speech Service amb veu alemanya neuronal (p. ex.
 *      de-DE-KatjaNeural) i el text com a input.
 *   3. Desa l'MP3 resultant a `public/audio/<hash>.mp3`.
 *   4. (Opcional) Anota al manifest l'estat `"status": "generated" |
 *      "missing"` per entry i la mida en bytes.
 *
 * Aquest script NO toca res d'Azure ni genera MP3. La infraestructura
 * és dedada: un mapping text→hash i un manifest versionable a git.
 *
 * ─────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOPICS_DIR = path.join(ROOT, 'src', 'data', 'topics');
const MANIFEST_PATH = path.join(ROOT, 'src', 'audio', 'manifest.json');

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const VERBOSE = ARGS.has('--verbose');

// ────────────────────────────────────────────────────────────────
// Neteja de marcadors rich (ha de mimetitzar stripRichMarkers del
// client, però en versió autònoma sense dependre del mòdul React).
// ────────────────────────────────────────────────────────────────

// Patró simplificat `!!...!!` (cos sense `!`) per evitar backtracking
// catastròfic. Veure comentari equivalent a parseInline.js.
//
// Nota important: el regex és `g` (global). En recursió NO el podem
// reutilitzar amb `exec()` perquè `lastIndex` és estat mutable
// compartit entre invocacions; això provoca loops infinits i OOM.
// Per això iterem amb `String.prototype.matchAll`, que retorna un
// iterador nou a cada crida i no toca estat global.
const RICH_TOKEN_SRC =
  /(\\[\\*=_`!])|(!![^!]+!!)|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(==[^=]+==)|(_[^_]+_)|(`[^`]+`)/;

function stripRichMarkers(text) {
  if (!text) return '';
  const re = new RegExp(RICH_TOKEN_SRC.source, 'g');
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out += text.slice(last, m.index);
    const tok = m[0];
    if (tok.startsWith('\\')) {
      out += tok.slice(1);
    } else if (tok.startsWith('!!')) {
      out += stripRichMarkers(tok.slice(2, -2));
    } else if (tok.startsWith('**')) {
      out += stripRichMarkers(tok.slice(2, -2));
    } else if (tok.startsWith('==')) {
      out += stripRichMarkers(tok.slice(2, -2));
    } else if (tok.startsWith('_')) {
      out += stripRichMarkers(tok.slice(1, -1));
    } else if (tok.startsWith('`')) {
      out += tok.slice(1, -1); // code: literal, sense recursió
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out += text.slice(last);
  return out;
}

// ────────────────────────────────────────────────────────────────
// Walk
// ────────────────────────────────────────────────────────────────

async function walkJson(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkJson(full)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Recol·lector
// ────────────────────────────────────────────────────────────────

/**
 * Normalitza un string candidat a àudio alemany i afegeix-lo al mapa
 * d'agregació. Filtra els buits post-neteja.
 *
 * @param {Map<string, {hash: string, text: string, sources: Array}>} map
 * @param {string} topicId
 * @param {string} path  — path JSON-like (ex: "steps[2].tabs[0].pron")
 * @param {string} rawText
 */
function addString(map, topicId, jsonPath, rawText) {
  if (typeof rawText !== 'string') return;
  const clean = stripRichMarkers(rawText).trim();
  if (!clean) return;
  const hash = crypto.createHash('sha1').update(clean).digest('hex');
  let entry = map.get(hash);
  if (!entry) {
    entry = { hash, text: clean, sources: [] };
    map.set(hash, entry);
  }
  entry.sources.push({ topic: topicId, path: jsonPath });
}

/**
 * Extreu tots els spans !!...!! d'un string (pot ser text ric), els
 * registra com a candidats d'àudio, i *no* retorna res.
 */
function addInlineSpeakables(map, topicId, jsonPath, rawText) {
  if (typeof rawText !== 'string') return;
  // Regex deliberadament senzilla i lineal (sense alternatives amb
  // lookahead) per evitar backtracking. Prohibim `!` dins del cos; si
  // cal un `!` literal, s'escapa amb `\!`.
  const re = /!!([^!]+)!!/g;
  let m;
  let idx = 0;
  while ((m = re.exec(rawText))) {
    addString(map, topicId, `${jsonPath}#inline[${idx}]`, m[1]);
    idx += 1;
  }
}

/**
 * Camps "estructurats" alemanys (example.de, tab.example.de, pair.*,
 * comparison.de, etc.): si el dev ha partit el contingut amb spans
 * `!!...!!`, extreu cada span individualment; si no, extreu la cadena
 * sencera. Aquest dual-mode casa amb el render del FocusReader, que
 * tampoc posa wrapper SpeakableText extern quan hi ha pills interiors.
 */
function addStringOrInline(map, topicId, jsonPath, rawText) {
  if (typeof rawText !== 'string') return;
  if (rawText.includes('!!')) {
    addInlineSpeakables(map, topicId, jsonPath, rawText);
  } else {
    addString(map, topicId, jsonPath, rawText);
  }
}

/**
 * Retorna el text d'una cel·la de taula (llegat o ric): admet string
 * directe o objecte { text }.
 */
function cellText(cell) {
  if (typeof cell === 'string') return cell;
  if (cell && typeof cell === 'object' && typeof cell.text === 'string') {
    return cell.text;
  }
  return null;
}

/**
 * Heurística per detectar files de taula comparativa tipus es/ca/de/en
 * on la columna d'alemany aporta una frase pronunciable.
 * Al format llegat, les taules no usen claus explícites; assumim que
 * la coincidència "es/ca/de/en" està codificada pel lloc (columna 2 o
 * 3 sol ser alemany a les comparatives). En dubte, no registrem — per
 * evitar soroll (textos no-alemanys al TTS).
 *
 * Heurística: si la taula té headers i un header inclou "Deutsch" o
 * "Alemany" o "DE" o "de", agafem la columna corresponent.
 */
/**
 * Heurística conservadora: només accepta headers que diguin
 * explícitament "Deutsch", "Alemany", "Alemán" o "German". "DE" o "de"
 * sols no són prou fiables (poden ser abreviatures d'altres columnes o
 * casuals). Els strings alemanys en taules llegades s'haurien de
 * marcar via `!!...!!` explícit en la migració a Fase 2.
 */
function germanColumnIndex(headers) {
  if (!Array.isArray(headers)) return -1;
  for (let i = 0; i < headers.length; i += 1) {
    const h = cellText(headers[i]);
    if (!h) continue;
    if (/\b(deutsch|alemany|alemán|german)\b/i.test(h.trim())) return i;
  }
  return -1;
}

// ────────────────────────────────────────────────────────────────
// Visita d'un step
// ────────────────────────────────────────────────────────────────

function visitStep(map, topicId, step, stepIdx) {
  const base = `steps[${stepIdx}]`;

  // ─── Format ric ───
  if (typeof step.kind === 'string') {
    // title/heading/lead/body no són alemany; el seu text ric pot
    // contenir !!...!! i per això cridem addInlineSpeakables a tots els
    // camps d'inline rich possibles.
    const richFields = [
      'heading',
      'lead',
      'body',
    ];
    for (const f of richFields) {
      addInlineSpeakables(map, topicId, `${base}.${f}`, step[f]);
    }
    if (Array.isArray(step.points)) {
      step.points.forEach((p, i) =>
        addInlineSpeakables(map, topicId, `${base}.points[${i}]`, p)
      );
    }
    if (Array.isArray(step.rule)) {
      step.rule.forEach((r, i) =>
        addInlineSpeakables(map, topicId, `${base}.rule[${i}]`, r)
      );
    }
    if (step.callout && typeof step.callout.body === 'string') {
      addInlineSpeakables(
        map,
        topicId,
        `${base}.callout.body`,
        step.callout.body
      );
    }
    if (Array.isArray(step.pitfalls)) {
      step.pitfalls.forEach((p, i) => {
        if (p && typeof p.why === 'string') {
          addInlineSpeakables(
            map,
            topicId,
            `${base}.pitfalls[${i}].why`,
            p.why
          );
        }
      });
    }

    // Pronoms destacats (tabs): camp `pron` + exemples
    if (Array.isArray(step.tabs)) {
      step.tabs.forEach((tab, i) => {
        addStringOrInline(map, topicId, `${base}.tabs[${i}].pron`, tab.pron);
        if (tab.example && typeof tab.example.de === 'string') {
          addStringOrInline(
            map,
            topicId,
            `${base}.tabs[${i}].example.de`,
            tab.example.de
          );
        }
        // Les notes poden contenir !!...!! també.
        addInlineSpeakables(map, topicId, `${base}.tabs[${i}].note`, tab.note);
      });
    }

    // Parelles pronom→possessiu
    if (Array.isArray(step.pairs)) {
      step.pairs.forEach((pair, i) => {
        addStringOrInline(
          map,
          topicId,
          `${base}.pairs[${i}].personal`,
          pair.personal
        );
        addStringOrInline(
          map,
          topicId,
          `${base}.pairs[${i}].possessive`,
          pair.possessive
        );
      });
    }

    // Exemples bilingües
    if (Array.isArray(step.examples)) {
      step.examples.forEach((ex, i) => {
        addStringOrInline(
          map,
          topicId,
          `${base}.examples[${i}].de`,
          ex.de
        );
      });
    }

    // Taula comparativa es/ca/de/en: columna `de`
    if (Array.isArray(step.comparison)) {
      step.comparison.forEach((row, i) => {
        addStringOrInline(
          map,
          topicId,
          `${base}.comparison[${i}].de`,
          row.de
        );
      });
    }

    // Pitfalls: bad / good són alemanys (formes errònies i correctes)
    if (Array.isArray(step.pitfalls)) {
      step.pitfalls.forEach((p, i) => {
        addString(map, topicId, `${base}.pitfalls[${i}].bad`, p.bad);
        addString(map, topicId, `${base}.pitfalls[${i}].good`, p.good);
      });
    }

    // Synthesis tables: cel·les. Assumim que cada cel·la pot contenir
    // text alemany; no obstant, les síntesi són mixtes (capçaleres en
    // català, etiquetes en alemany). El filtre raonable és registrar
    // només els !!...!! explícits de cada cel·la. Les cel·les "netes"
    // d'alemany que vulguin TTS hauran de portar !!...!!.
    if (Array.isArray(step.tables)) {
      step.tables.forEach((tbl, ti) => {
        if (Array.isArray(tbl.headers)) {
          tbl.headers.forEach((h, ci) => {
            addInlineSpeakables(
              map,
              topicId,
              `${base}.tables[${ti}].headers[${ci}]`,
              cellText(h)
            );
          });
        }
        if (Array.isArray(tbl.rows)) {
          tbl.rows.forEach((row, ri) => {
            row.forEach((cell, ci) => {
              addInlineSpeakables(
                map,
                topicId,
                `${base}.tables[${ti}].rows[${ri}][${ci}]`,
                cellText(cell)
              );
            });
          });
        }
      });
    }
    return;
  }

  // ─── Format llegat ───
  if (Array.isArray(step.blocks)) {
    step.blocks.forEach((block, bi) => {
      const bpath = `${base}.blocks[${bi}]`;
      if (block.type === 'explanation') {
        addInlineSpeakables(map, topicId, `${bpath}.body`, block.body);
      } else if (block.type === 'callout') {
        addInlineSpeakables(map, topicId, `${bpath}.body`, block.body);
      } else if (block.type === 'example') {
        if (Array.isArray(block.items)) {
          block.items.forEach((it, ii) => {
            addString(map, topicId, `${bpath}.items[${ii}].de`, it.de);
          });
        }
      } else if (block.type === 'table') {
        // Per taules llegades, anem a buscar (a) !!...!! explícits a
        // qualsevol cel·la, i (b) la columna alemanya si els headers
        // ho declaren.
        const deIdx = germanColumnIndex(block.headers);
        if (Array.isArray(block.rows)) {
          block.rows.forEach((row, ri) => {
            row.forEach((cell, ci) => {
              const txt = cellText(cell);
              addInlineSpeakables(
                map,
                topicId,
                `${bpath}.rows[${ri}][${ci}]`,
                txt
              );
              if (deIdx >= 0 && ci === deIdx) {
                // Text pla alemany detectat per header: el despullem de
                // marcadors rich (ex. *einen* → einen) abans d'hashar.
                addString(
                  map,
                  topicId,
                  `${bpath}.rows[${ri}][${ci}]`,
                  txt
                );
              }
            });
          });
        }
        if (Array.isArray(block.headers)) {
          block.headers.forEach((h, ci) => {
            addInlineSpeakables(
              map,
              topicId,
              `${bpath}.headers[${ci}]`,
              cellText(h)
            );
          });
        }
      } else if (block.type === 'lerntipp') {
        addInlineSpeakables(map, topicId, `${bpath}.body`, block.body);
      }
      // La resta de tipus (audio, video, exercise) no contenen alemany
      // pronunciable a la banda de dades — els MP3 propis són
      // estàtics, i els exercicis es gestionen per la seva banda.
    });
  }
}

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────

async function main() {
  const files = await walkJson(TOPICS_DIR);
  const map = new Map();

  let scannedCount = 0;
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      console.error(`✗ ${path.relative(ROOT, file)}: JSON invàlid — ${err.message}`);
      continue;
    }
    if (!data || !data.id || !Array.isArray(data.steps)) continue;
    const topicId = data.id;
    if (VERBOSE) console.log(`→ ${topicId}`);
    data.steps.forEach((step, i) => visitStep(map, topicId, step, i));
    scannedCount += 1;
  }

  // Ordena les entries per hash per a diffs estables.
  const entries = Array.from(map.values()).sort((a, b) =>
    a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0
  );
  // Dedup + ordena sources per lectura.
  for (const e of entries) {
    e.sources.sort((a, b) => {
      if (a.topic < b.topic) return -1;
      if (a.topic > b.topic) return 1;
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    });
  }

  const totalChars = entries.reduce((acc, e) => acc + e.text.length, 0);
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalStrings: entries.length,
    totalChars,
    entries,
  };

  console.log(`Fitxers escanejats: ${scannedCount}`);
  console.log(`Strings únics: ${entries.length}`);
  console.log(`Total caràcters: ${totalChars}`);

  if (VERBOSE) {
    console.log('\nTots els strings extrets:');
    for (const e of entries) {
      console.log(`  [${e.hash.slice(0, 8)}] (${e.sources.length}×) "${e.text}"`);
    }
  } else {
    // Top 10 duplicats (strings amb més aparicions).
    const topDups = [...entries]
      .filter((e) => e.sources.length > 1)
      .sort((a, b) => b.sources.length - a.sources.length)
      .slice(0, 10);
    if (topDups.length) {
      console.log('\nTop strings repetits:');
      for (const e of topDups) {
        console.log(`  ${e.sources.length}× "${e.text}"`);
      }
    }
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] no s\'ha escrit res.');
    return;
  }

  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Manifest escrit a ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
