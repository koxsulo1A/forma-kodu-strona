#!/usr/bin/env node
// Budżet JavaScriptu na stronę (decyzja 13: A na telefonie, B na komputerze). Bez zależności.
// Liczy rozmiar po kompresji gzip (tyle naprawdę przesyła sieć) dla każdej strony w dist:
//  - TELEFON  = skrypty ładowane zawsze + wyspy client:load/idle/visible (+ ich importy statyczne). Limit domyślny 50 kB.
//  - KOMPUTER = powyższe + wyspy client:media z warunkiem min-width ≥ 1024px.                       Limit domyślny 150 kB.
// GA4 nie wchodzi do budżetu: ładuje się dopiero po zgodzie, z serwera Google (ok. 150 kB, poza naszą kontrolą) [Ocena].
// Użycie: node scripts/sprawdz-budzet.mjs [dist] [limitTelefonKB] [limitKomputerKB]   Kod wyjścia 1 = przekroczony limit.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const [root = 'dist', limTel = '50', limPC = '150'] = process.argv.slice(2);
const LIMIT = { tel: +limTel * 1024, pc: +limPC * 1024 };
const strony = [];
(function przejdz(p) {
  for (const n of readdirSync(p)) {
    const f = join(p, n);
    if (statSync(f).isDirectory()) { if (!['_astro', 'admin'].includes(n)) przejdz(f); }
    else if (n.endsWith('.html')) strony.push(f);
  }
})(root);

const plik = (url) => join(root, url.split('?')[0].replace(/^\//, ''));
const gz = new Map();
const rozmiar = (f) => { if (!gz.has(f)) gz.set(f, existsSync(f) ? gzipSync(readFileSync(f)).length : 0); return gz.get(f); };
// Importy statyczne (bez dynamicznych import(), te ładują się dopiero na żądanie).
const importy = (f, zbior = new Set()) => {
  if (zbior.has(f) || !existsSync(f)) return zbior;
  zbior.add(f);
  const kod = readFileSync(f, 'utf8');
  for (const m of kod.matchAll(/(?:^|[;\n}])\s*(?:import|export)\s*(?:[\w*{}\s,$]+from\s*)?["']([^"']+\.m?js)["']/g)) {
    importy(m[1].startsWith('/') ? plik(m[1]) : resolve(dirname(f), m[1]), zbior);
  }
  return zbior;
};
const suma = (zbior) => [...zbior].reduce((a, f) => a + rozmiar(f), 0);
const kB = (b) => `${(b / 1024).toFixed(1)} kB`;

let bledy = 0;
for (const s of strony) {
  const h = readFileSync(s, 'utf8');
  const tel = new Set();
  const pc = new Set();
  let inline = 0;
  for (const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/application\/ld\+json/.test(m[1])) continue;
    const src = m[1].match(/\ssrc=["']([^"']+)["']/)?.[1];
    if (src && !/^https?:/.test(src)) importy(plik(src), tel);
    else if (!src) inline += gzipSync(Buffer.from(m[2])).length;
  }
  for (const m of h.matchAll(/<link\b[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/gi)) importy(plik(m[1]), tel);
  for (const m of h.matchAll(/<astro-island\b([^>]*)>/gi)) {
    const a = m[1];
    const klient = a.match(/\sclient=["']([^"']+)["']/)?.[1];
    const pliki = [a.match(/component-url=["']([^"']+)["']/)?.[1], a.match(/renderer-url=["']([^"']+)["']/)?.[1]].filter(Boolean);
    const opts = (a.match(/\sopts=["']([^"']+)["']/)?.[1] || '').replace(/&quot;/g, '"');
    const media = opts.match(/"value":"([^"]+)"/)?.[1] || '';
    const tylkoPC = klient === 'media' && /min-width:\s*(\d+)px/.test(media) && +media.match(/min-width:\s*(\d+)px/)[1] >= 1024;
    for (const u of pliki) importy(plik(u), tylkoPC ? pc : tel);
    if (klient === 'only') console.log(`  ⚠ ${s}: wyspa client:only nie ma treści w HTML (boty AI jej nie zobaczą)`);
  }
  for (const f of tel) pc.delete(f);
  const bTel = suma(tel) + inline;
  const bPC = bTel + suma(pc);
  const zle = [bTel > LIMIT.tel && `telefon ${kB(bTel)} > ${limTel} kB`, bPC > LIMIT.pc && `komputer ${kB(bPC)} > ${limPC} kB`].filter(Boolean);
  if (zle.length) bledy++;
  console.log(`${zle.length ? '✗' : '✓'} ${s}: telefon ${kB(bTel)}, komputer ${kB(bPC)}${zle.length ? `  (${zle.join('; ')})` : ''}`);
}
console.log(`Stron: ${strony.length}. Przekroczenia: ${bledy}. (gzip; limity: telefon ${limTel} kB, komputer ${limPC} kB)`);
if (bledy) process.exit(1);
