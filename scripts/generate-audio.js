#!/usr/bin/env node
/*
 * Generador d'àudio TTS via Azure Cognitive Services Speech · §98
 *
 * Llegeix el manifest d'strings alemanys (produït per scan-audio-strings.js)
 * i crida l'API REST d'Azure Speech per cada entry sense MP3 existent a
 * public/audio/<hash>.mp3. Els fitxers es serveixen estàticament per Vite a
 * /kompass/audio/<hash>.mp3 — el component SpeakableText fa probe HEAD i
 * els reprodueix automàticament quan existeixen; si no, cau al Web Speech.
 *
 * Ús:
 *   node scripts/generate-audio.js                 # Genera només strings nous
 *   node scripts/generate-audio.js --topic=A1a-0   # Només strings d'aquest topic
 *   node scripts/generate-audio.js --limit=5       # Primer N (smoke test)
 *   node scripts/generate-audio.js --only=<hash>   # Només aquest hash
 *   node scripts/generate-audio.js --force         # Regenera tot
 *   node scripts/generate-audio.js --dry-run       # Mostra què faria
 *   node scripts/generate-audio.js --voice=<name>  # Override veu
 *
 * Credencials · a .env.local (gitignored):
 *   AZURE_SPEECH_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
 *   AZURE_SPEECH_REGION=westeurope
 *   AZURE_SPEECH_VOICE=de-DE-Seraphina:DragonHDLatestNeural  (opcional)
 *
 * Notes:
 * - Cache per existència de fitxer: si public/audio/<hash>.mp3 ja existeix,
 *   no es torna a trucar. Permet re-executar sense malgastar quota.
 * - Throttle 180ms entre crides — sobrat per al tier F0 (~20 RPS).
 * - Format sortida: audio-24khz-48kbitrate-mono-mp3 (~6 KB/segon d'àudio).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src/audio/manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'public/audio');

// ─── Carrega .env.local manualment (sense dependències externes) ──────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

// ─── Parse CLI flags ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name) { return args.includes('--' + name); }
function value(name) {
  const a = args.find((x) => x.startsWith('--' + name + '='));
  return a ? a.slice(name.length + 3) : undefined;
}

const force = flag('force');
const dryRun = flag('dry-run');
const verbose = flag('verbose');
const topicFilter = value('topic');
const onlyHash = value('only');
const limit = parseInt(value('limit') || '0', 10) || Infinity;
const voiceOverride = value('voice');

// ─── Config ───────────────────────────────────────────────────────────────
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
const VOICE = voiceOverride
  || process.env.AZURE_SPEECH_VOICE
  || 'de-DE-Seraphina:DragonHDLatestNeural';

if (!KEY || !REGION) {
  console.error(
    '✗ Falta AZURE_SPEECH_KEY i/o AZURE_SPEECH_REGION a .env.local',
  );
  process.exit(1);
}

// ─── Llegeix manifest ─────────────────────────────────────────────────────
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('✗ No existeix ' + MANIFEST_PATH);
  console.error('  Executa primer: npm run scan-audio');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Filtra entries segons flags ──────────────────────────────────────────
let entries = manifest.entries || [];
if (topicFilter) {
  entries = entries.filter(
    (e) => e.sources?.some((s) => s.topic === topicFilter),
  );
  console.log(`Filtre per topic="${topicFilter}": ${entries.length} entries`);
}
if (onlyHash) {
  entries = entries.filter((e) => e.hash.startsWith(onlyHash));
  console.log(`Filtre per hash="${onlyHash}": ${entries.length} entries`);
}

const pending = entries.filter((e) => {
  const file = path.join(OUTPUT_DIR, e.hash + '.mp3');
  return force || !fs.existsSync(file);
});

const toGenerate = pending.slice(0, limit);
const skipped = entries.length - pending.length;

console.log(
  `\nManifest: ${manifest.entries.length} strings totals · filtrats ${entries.length}`,
);
console.log(
  `  Existents (skip): ${skipped} · Per generar: ${toGenerate.length}`,
);
if (toGenerate.length === 0) {
  console.log('\nRes a fer.');
  process.exit(0);
}
console.log(`  Veu: ${VOICE}`);
console.log(`  Region: ${REGION}\n`);

if (dryRun) {
  console.log('--- Dry run ---');
  toGenerate.forEach((e) => {
    console.log(`  ${e.hash.slice(0, 8)}  ${JSON.stringify(e.text)}`);
  });
  process.exit(0);
}

// ─── SSML builder ─────────────────────────────────────────────────────────
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(text) {
  // Per a veus Dragon HD multilingües (Seraphina:DragonHDLatestNeural),
  // cal un <lang xml:lang="de-DE"> explícit dins del <voice>; si no,
  // el motor detecta idioma automàticament i en strings curts i
  // ambigus (p. ex. "Was?", que en anglès existeix com a past de "to be")
  // aplica fonètica anglesa. Forçar-ho garanteix pronúncia alemanya.
  // Ref: https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-voice#adjust-speaking-languages
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="${VOICE}"><lang xml:lang="de-DE">${escapeXml(text)}</lang></voice></speak>`;
}

// ─── Crida Azure REST ─────────────────────────────────────────────────────
const ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

async function synthesize(text) {
  const ssml = buildSSML(text);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kompass-audio-generator/1.0',
    },
    body: ssml,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} · ${body.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ─── Loop principal amb throttle ──────────────────────────────────────────
const t0 = Date.now();
let generated = 0;
let failed = 0;
let totalBytes = 0;

for (let i = 0; i < toGenerate.length; i++) {
  const entry = toGenerate[i];
  const file = path.join(OUTPUT_DIR, entry.hash + '.mp3');
  const label = `[${i + 1}/${toGenerate.length}]`;
  try {
    const mp3 = await synthesize(entry.text);
    fs.writeFileSync(file, mp3);
    generated++;
    totalBytes += mp3.length;
    const kb = (mp3.length / 1024).toFixed(1);
    console.log(`${label} ✓ ${entry.hash.slice(0, 8)} · ${kb} KB · ${JSON.stringify(entry.text)}`);
  } catch (err) {
    failed++;
    console.error(`${label} ✗ ${entry.hash.slice(0, 8)} · ${err.message}`);
    if (verbose) console.error(err.stack);
  }
  // Throttle — 180ms entre crides, sobrat per a F0 (~5.5 RPS sostinguts).
  if (i < toGenerate.length - 1) {
    await new Promise((r) => setTimeout(r, 180));
  }
}

const dt = ((Date.now() - t0) / 1000).toFixed(1);
const totalKb = (totalBytes / 1024).toFixed(1);
console.log(
  `\nFinalitzat en ${dt}s · ${generated} generat(s) · ${failed} fallit(s) · ${totalKb} KB total`,
);
if (failed > 0) process.exit(1);
