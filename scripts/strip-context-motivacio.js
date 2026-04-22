#!/usr/bin/env node
/* One-shot: elimina "Context i motivació" com a heading inicial dels
 * intros de les lliçons A1a. Dos patrons: ric (heading field) i llegat
 * (prefix "#### Context i motivació\n\n" al body markdown). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '..', 'src', 'data', 'topics', 'a1a');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const RIC_RE = /^\s*"heading":\s*"Context i motivació",?\s*$/m;
// Literal backslash-n al JSON origen (no un newline real).
const LLEGAT_RE = /("body":\s*")#### Context i motivació\\n\\n/g;
let fixed = 0;
for (const f of files) {
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, 'utf8');
  let changed = false;
  if (RIC_RE.test(s)) {
    s = s.replace(RIC_RE, '').replace(/,(\s*\n\s*)"lead"/, '$1"lead"');
    // Ajusta comes si queda un trailing ,
    s = s.replace(/,(\s*}\s*[,\]])/, '$1');
    changed = true;
  }
  if (LLEGAT_RE.test(s)) {
    s = s.replace(LLEGAT_RE, '$1');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(p, s);
    fixed += 1;
    console.log('✓', f);
  }
}
console.log('Total:', fixed);
