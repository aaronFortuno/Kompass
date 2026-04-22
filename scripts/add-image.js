/*
 * add-image · Pipeline d'optimització d'imatges per al reader · §77
 *
 * Ús:
 *   npm run add-image -- <topicId> <sourceFile> <slug> [--credit="..."]
 *
 * Exemple:
 *   npm run add-image -- A1a-0 ~/Downloads/castell.jpg neuschwanstein \
 *     --credit="Detroit Publishing Co. · LOC · domini públic"
 *
 * Què fa:
 *  - Genera 3 variants responsives en WebP qualitat 82:
 *    - {slug}-640.webp  (mòbil)
 *    - {slug}-1280.webp (tablet/desktop)
 *    - {slug}-1920.webp (retina/wide)
 *  - Les desa a public/Kompass/images/{nivell}/{número}/.
 *  - Imprimeix el JSON snippet per afegir al visuals[] del topic.
 *
 * Sharp és una devDependency — només s'usa en aquest pipeline local.
 * A GitHub Pages només es serveixen els fitxers WebP resultants.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const WIDTHS = [640, 1280, 1920];
const QUALITY = 82;

function die(msg) {
  console.error(`Error: ${msg}`);
  console.error('\nUs: npm run add-image -- <topicId> <sourceFile> <slug> [--credit="..."]');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) die('Mancen arguments.');

  const [topicId, sourceFile, slug] = args;
  const creditArg = args.find((a) => a.startsWith('--credit='));
  const credit = creditArg ? creditArg.slice('--credit='.length) : null;

  // Parse topicId → level dir + número
  const match = /^([A-Z]\d)([a-z]?)-(\d+)$/.exec(topicId);
  if (!match) die(`topicId invàlid: ${topicId}. Format esperat: A1a-5, A1b-22, etc.`);
  const levelDir = (match[1] + (match[2] || '')).toLowerCase();
  const numberStr = String(parseInt(match[3], 10)).padStart(2, '0');

  if (!fs.existsSync(sourceFile)) die(`Fitxer no trobat: ${sourceFile}`);

  // Verifica que el slug sigui kebab-case
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    die(`slug invàlid: ${slug}. Ha de ser kebab-case ([a-z0-9-]).`);
  }

  const outDir = path.join('public', 'Kompass', 'images', levelDir, numberStr);
  fs.mkdirSync(outDir, { recursive: true });

  // Llegim metadades de la imatge original per saber la mida real.
  const meta = await sharp(sourceFile).metadata();
  console.log(`Origen: ${sourceFile}`);
  console.log(`  ${meta.width} × ${meta.height} · ${meta.format} · ${(fs.statSync(sourceFile).size / 1024).toFixed(1)} KB`);

  console.log(`\nProcessant a ${outDir}/:`);
  const generated = [];
  for (const w of WIDTHS) {
    // No amplliem: si la imatge original és més petita, fem servir la seva mida.
    if (meta.width && meta.width < w) {
      console.log(`  - ${w}w  saltat (original és més petit: ${meta.width}px)`);
      continue;
    }
    const outFile = path.join(outDir, `${slug}-${w}.webp`);
    await sharp(sourceFile)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outFile);
    const size = fs.statSync(outFile).size;
    console.log(`  ✓ ${slug}-${w}.webp  (${(size / 1024).toFixed(1)} KB)`);
    generated.push({ width: w, file: `${slug}-${w}.webp` });
  }

  if (generated.length === 0) die('No s\'ha generat cap variant. Imatge original massa petita?');

  // Snippet JSON per afegir al topic.
  const publicBase = `/Kompass/images/${levelDir}/${numberStr}`;
  const srcset = generated.map((g) => `${publicBase}/${g.file} ${g.width}w`).join(', ');
  const defaultVariant = generated.find((g) => g.width === 1280) || generated[0];

  const snippet = {
    src: `${publicBase}/${defaultVariant.file}`,
    srcset,
    sizes: '(max-width: 720px) 90vw, 720px',
    alt: '<descripció per accessibilitat — obligatòria>',
    ...(credit ? { credit } : { credit: '<autor · font · llicència>' }),
  };

  console.log('\n─── Snippet per al camp visuals[] del topic ───');
  console.log(JSON.stringify(snippet, null, 2));
  console.log('\nRecorda: l\'alt text és obligatori. Revisa-lo abans de commit.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
