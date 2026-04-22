#!/usr/bin/env node
/*
 * Genera l'SVG del codi QR de l'adreça Lightning Network (V4V) i el
 * desa a public/qr-lightning.svg perquè el modal "Sobre" l'inclogui
 * com a asset estàtic. Script one-shot: s'executa un cop via
 * `node scripts/generate-ln-qr.js` i el resultat es commita al repo.
 * No afecta el bundle del runtime — qrcode és devDep.
 *
 * Adreça hardcoded perquè és pública i forma part del pacte V4V.
 * Si canvia, torna a executar aquest script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '..', 'public', 'qr-lightning.svg');
const ADDR = 'aptswim903@walletofsatoshi.com';

// Format compatible amb la majoria de wallets Lightning: "lightning:address".
const value = `lightning:${ADDR}`;

const svg = await QRCode.toString(value, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 2,
  color: {
    // Usem currentColor per heretar el color del tema al render al modal.
    // La lib no ho permet directament, així que usem ink editorial fix.
    dark: '#1b1d22', // reader-ink (aproximat)
    light: '#ffffff00', // transparent perquè combini amb paper
  },
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg, 'utf8');
console.log(`✓ QR Lightning generat a ${outPath} (${svg.length} bytes)`);
console.log(`  Valor: ${value}`);
