/*
 * One-shot script: unifica "frase" → "oració" als JSONs de contingut,
 * amb atenció als apòstrofs ("la frase" → "l'oració", "de la frase" →
 * "de l'oració"). No toca "frase feta" (cas de locució) ja que no
 * apareix als continguts gramaticals, segons la revisió #93.
 *
 * Execució: node scripts/rename-frase-oracio.js
 */
import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

// Ordre important: casos específics primer, generals després.
const replacements = [
  // Casos amb apòstrof: "de la frase" → "de l'oració"
  [/\bde la frase\b/g, "de l'oració"],
  [/\bDe la frase\b/g, "De l'oració"],
  [/\bA la frase\b/g, "A l'oració"],
  [/\ba la frase\b/g, "a l'oració"],
  // "la frase" → "l'oració"
  [/\bla frase\b/g, "l'oració"],
  [/\bLa frase\b/g, "L'oració"],
  // Plural (sense apòstrof problems — "les oracions" no s'apostrofa)
  [/\bfrases\b/g, 'oracions'],
  [/\bFrases\b/g, 'Oracions'],
  // Singular fallback
  [/\bfrase\b/g, 'oració'],
  [/\bFrase\b/g, 'Oració'],
];

const dataDirs = ['src/data/topics', 'src/data/exercises'];
const files = [];
for (const d of dataDirs) {
  if (fs.existsSync(d)) files.push(...walk(d));
}

let totalChanges = 0;
let totalReplacements = 0;
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let next = original;
  let fileRepls = 0;
  for (const [re, rep] of replacements) {
    const matches = next.match(re);
    if (matches) {
      fileRepls += matches.length;
      next = next.replace(re, rep);
    }
  }
  if (next !== original) {
    fs.writeFileSync(file, next);
    console.log(`✓ ${file.replace(/\\/g, '/')}  (${fileRepls} replacements)`);
    totalChanges++;
    totalReplacements += fileRepls;
  }
}
console.log(`\n${totalChanges} files changed, ${totalReplacements} total replacements.`);
