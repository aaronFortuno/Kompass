#!/usr/bin/env node
/*
 * Valida tots els JSON de contingut contra els seus schemes Zod.
 * Cridable via `npm run validate-content`.
 * Surt amb exit 1 si alguna validació falla.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TopicSchema } from '../src/lib/schemas/topic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

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

async function validateFiles(dirLabel, dirPath, schema) {
  const files = await walkJson(dirPath);
  let errors = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let data;
    try {
      data = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      console.error(`✗ ${rel}: JSON invàlid — ${err.message}`);
      errors += 1;
      continue;
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error(`✗ ${rel}:`);
      for (const issue of result.error.issues) {
        const p = issue.path.join('.');
        console.error(`    · ${p || '(arrel)'}: ${issue.message}`);
      }
      errors += 1;
    } else {
      console.log(`✓ ${rel}`);
    }
  }
  if (!files.length) {
    console.log(`  (${dirLabel}: cap fitxer encara)`);
  }
  return errors;
}

async function main() {
  console.log('Validant contingut…');
  const topicErrors = await validateFiles(
    'topics',
    path.join(DATA_DIR, 'topics'),
    TopicSchema
  );
  // Exercicis i rutes es validaran quan tinguem els seus schemas.
  const total = topicErrors;
  if (total > 0) {
    console.error(`\n${total} fitxer(s) amb errors.`);
    process.exit(1);
  }
  console.log('\nTot el contingut és vàlid.');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
