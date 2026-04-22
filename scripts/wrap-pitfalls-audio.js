#!/usr/bin/env node
/*
 * Envolta els camps `bad` i `good` de pitfalls (format ric) i de blocs
 * `type: "pitfall"` (format llegat) amb `!!...!!` perquè tinguin àudio
 * associat. L'usuari ha de poder escoltar la versió incorrecta i la
 * correcta per contrastar-les auditivament. §98 polit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '..', 'src', 'data', 'topics', 'a1a');

/*
 * Envolta un string amb !!...!! si encara no ho està i no conté `!` al
 * mig (limitacio del tokenizer). Conserva tot el format rich interior.
 */
function wrap(s) {
  if (typeof s !== 'string' || !s.trim()) return s;
  if (s.includes('!!')) return s; // ja està embolcallat (parcial o total)
  if (s.match(/^\s*!?\s*$/)) return s;
  // No embolcallar si conté un `!` al mig — el tokenizer del scanner
  // no ho suporta (regex `!![^!]+!!`). Els exemples en alemany solen
  // tenir `!` només al final; ho acceptem.
  const body = s;
  return `!!${body}!!`;
}

function processTopic(obj) {
  let changes = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    // Format ric: objecte amb bad/good/why i potser altres.
    // Format llegat: type === 'pitfall' amb mateixos camps.
    const hasBadGood = typeof node.bad === 'string' && typeof node.good === 'string';
    if (hasBadGood) {
      const newBad = wrap(node.bad);
      const newGood = wrap(node.good);
      if (newBad !== node.bad) { node.bad = newBad; changes += 1; }
      if (newGood !== node.good) { node.good = newGood; changes += 1; }
    }
    for (const k of Object.keys(node)) walk(node[k]);
  };
  walk(obj);
  return changes;
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
let totalChanges = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const raw = fs.readFileSync(p, 'utf8');
  const obj = JSON.parse(raw);
  const n = processTopic(obj);
  if (n > 0) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
    totalChanges += n;
    console.log(`✓ ${f}: ${n} camps envoltats`);
  }
}
console.log(`Total: ${totalChanges} camps bad/good ara audibles`);
