// Sprawdza KAŻDY plik treści według schematu panelu Keystatic (keystatic.config.ts + src/keystatic/*).
// Łapie to, czego Zod nie widzi: treść segmentów stron (src/content/strony), zły klucz w JSON, za długi tekst, zła liczba elementów listy.
// Użycie: npx tsx scripts/sprawdz-tresc.ts   Kod wyjścia 1 = błędy. „brak pliku” = strona jeszcze bez treści (to nie błąd).
import { createReader } from '@keystatic/core/reader';
import cfg from '../keystatic.config';

const r = createReader(process.cwd(), cfg);
let bledy = 0;
for (const k of Object.keys(cfg.singletons ?? {})) {
  try { const v = await (r.singletons as any)[k].read(); console.log(`${v === null ? '·' : '✓'} ${k}${v === null ? ' (brak pliku)' : ''}`); }
  catch (e: any) { bledy++; console.error(`✗ ${k}: ${e.message}`); }
}
for (const k of Object.keys(cfg.collections ?? {})) {
  try { const v = await (r.collections as any)[k].all(); console.log(`✓ ${k} (${v.length})`); }
  catch (e: any) { bledy++; console.error(`✗ ${k}: ${e.message}`); }
}
// Zdjęcie główne realizacji: proporcja 2:1 (wzór karty z designsolutions.pl, Kacper 24.11). Tolerancja 2%.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp'; // jest w zależnościach Astro (domyślna obsługa obrazów)
const katalog = 'src/content/realizacje';
for (const f of existsSync(katalog) ? readdirSync(katalog).filter((n) => n.endsWith('.md')) : []) {
  const sciezka = readFileSync(`${katalog}/${f}`, 'utf8').match(/^zdjecie_glowne:\s*['"]?([^'"\n]+)/m)?.[1];
  const tekst = readFileSync(`${katalog}/${f}`, 'utf8');
  if (!/^typ:\s*['"]?przykład układu/m.test(tekst) && !tekst.replace(/^---[\s\S]*?\n---/, '').trim()) { bledy++; console.error(`✗ realizacje/${f}: brak opisu „O projekcie” (podstrona 31b)`); }
  if (!sciezka) { bledy++; console.error(`✗ realizacje/${f}: brak zdjęcia głównego`); continue; }
  const { width = 0, height = 1 } = await sharp(resolve(dirname(`${katalog}/${f}`), sciezka)).metadata();
  if (Math.abs(width / height - 2) > 0.04) { bledy++; console.error(`✗ realizacje/${f}: zdjęcie ${width}×${height}, potrzebna proporcja 2:1 (np. 1600×800)`); }
}
console.log(`Błędy: ${bledy}`);
if (bledy) process.exit(1);
