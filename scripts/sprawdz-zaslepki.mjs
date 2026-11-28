#!/usr/bin/env node
// Blokada publikacji (decyzja R21 C): szuka zaślepek w nawiasach kwadratowych w treści i w gotowej stronie.
// Użycie: node scripts/sprawdz-zaslepki.mjs [katalog...]   (domyślnie: src/content dist public)
// Kod wyjścia 1 = znaleziono zaślepki → produkcja się nie buduje. Na wersji testowej uruchamiaj z --tylko-raport.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { zmienne } from '../src/lib/zmienne.mjs';

const args = process.argv.slice(2);
const tylkoRaport = args.includes('--tylko-raport');
const katalogi = args.filter((a) => !a.startsWith('--'));
const cele = katalogi.length ? katalogi : ['src/content', 'dist', 'public'];
const ROZSZERZENIA = new Set(['.md', '.mdx', '.json', '.html', '.txt', '.xml', '.yml', '.yaml', '.webmanifest', '']);
const POMIN = new Set(['node_modules', '.git', '_astro', 'admin']);
// [tekst] z co najmniej jedną literą; pomija składnię Markdown linków [tekst](url), checkboxy [ ] / [x] i tablice JSON.
const WZOR = /\[(?!\s?\]|x\])([^\]\n"{}]*\p{L}[^\]\n"{}]*)\](?!\()/gu;

const wyniki = [];
function przejdz(p) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const n of readdirSync(p)) if (!POMIN.has(n)) przejdz(join(p, n));
    return;
  }
  if (!ROZSZERZENIA.has(extname(p))) return;
  let tresc = readFileSync(p, 'utf8');
  // W HTML pomijamy kod (style i skrypty poza JSON-LD): selektory [data-…] i kod JS dają fałszywe trafienia (test 24.11).
  // Zachowujemy podział na linie, żeby numery linii się zgadzały.
  if (extname(p) === '.html') {
    const wyczysc = (m) => m.replace(/[^\n]/g, ' ');
    tresc = tresc.replace(/<style[\s\S]*?<\/style>/gi, wyczysc).replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, wyczysc);
  }
  const linie = tresc.split('\n');
  linie.forEach((l, i) => {
    if (l.trimStart().startsWith('<!--') || l.trimStart().startsWith('#')) return; // komentarze HTML i robots/llms nagłówki
    for (const m of l.matchAll(WZOR)) wyniki.push(`${p}:${i + 1}  ${m[0]}`);
  });
}
cele.forEach(przejdz);

// Zmienne (src/lib/zmienne.mjs): pusta wartość użyta w treści to też zaślepka, nawet gdy komponent pokazuje ją jako „do uzupełnienia”.
{
  const uzyte = new Set();
  (function znaczniki(p) {
    if (!existsSync(p)) return;
    if (statSync(p).isDirectory()) { for (const n of readdirSync(p)) if (!POMIN.has(n)) znaczniki(join(p, n)); return; }
    if (/\.(json|md|mdx)$/.test(p)) for (const m of readFileSync(p, 'utf8').matchAll(/\{\{([a-z0-9_]+)(\|slownie)?\}\}/g)) uzyte.add(m[1]);
  })('src/content');
  for (const [klucz, z] of zmienne()) if (uzyte.has(klucz) && !z.wartosc) wyniki.push(`zmienna {{${klucz}}} (panel: Zmienne)  [${z.opis}]`);
}

if (wyniki.length) {
  console.error(`Zaślepki do uzupełnienia: ${wyniki.length}`);
  for (const w of wyniki) console.error('  ' + w);
  if (!tylkoRaport) process.exit(1);
} else {
  console.log('Zaślepki: 0. Można publikować.');
}
