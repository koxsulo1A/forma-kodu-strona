#!/usr/bin/env node
// Po `astro build`: tworzy wersje Markdown każdej strony (dist/<adres>.md, dist/index.md) i dist/llms-full.txt.
// Dla asystentów AI: Markdown to ok. 40× mniej tokenów niż HTML (pomiar DEV Community, 22.11.2026, dokumentacje frameworków).
// Zależność: npm i -D turndown   Użycie: node scripts/generuj-markdown.mjs [dist] [https://domena]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import TurndownService from 'turndown';
import { wstawCeny } from '../src/lib/ceny.mjs';
import { wstawZmienne, zmienne } from '../src/lib/zmienne.mjs';

const root = process.argv[2] || 'dist';
const domena = (process.argv[3] || 'https://[domena]').replace(/\/$/, '');
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
td.remove(['script', 'style', 'noscript', 'svg', 'template', 'form', 'button', 'iframe']);
td.addRule('ukryteDekoracje', { filter: (n) => n.getAttribute && n.getAttribute('aria-hidden') === 'true', replacement: () => '' });

// 1) Ceny z cennika (src/lib/ceny.mjs): znaczniki {{cena:…}} / {{Cena:…}} / {{kwota:…}} → kwoty, we wszystkich plikach tekstowych.
//    Zmienne (src/lib/zmienne.mjs): {{klucz}} / {{klucz|slownie}} → wartość z panelu „Zmienne” albo zaślepka „[opis]”.
const mapaZmiennych = zmienne();
(function ceny(p) {
  for (const n of readdirSync(p)) {
    const f = join(p, n);
    if (statSync(f).isDirectory()) { if (n !== '_astro') ceny(f); continue; }
    if (!/\.(html|txt|xml|json)$/.test(n)) continue;
    const t = readFileSync(f, 'utf8');
    if (t.includes('{{')) writeFileSync(f, wstawZmienne(wstawCeny(t), mapaZmiennych));
  }
})(root);

const strony = [];
(function przejdz(p) {
  for (const n of readdirSync(p)) {
    const f = join(p, n);
    if (statSync(f).isDirectory()) { if (!['_astro', 'admin', 'og', 'fonts'].includes(n)) przejdz(f); }
    else if (n === 'index.html') strony.push(f);
  }
})(root);

const wszystkie = [];
for (const f of strony.sort()) {
  const html = readFileSync(f, 'utf8');
  if (/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(html) || /404/.test(f)) continue;
  const tytul = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const opis = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
  const data = (html.match(/"dateModified":"([^"]+)"/) || [])[1] || '';
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  const katalog = relative(root, f).split(sep).slice(0, -1).join('/');
  const adres = katalog ? `/${katalog}` : '/';
  const md = [
    `<!-- ${tytul} -->`,
    `> ${opis}`,
    '',
    `Źródło: ${domena}${adres}${data ? `  \nAktualizacja: ${data}` : ''}`,
    '',
    td.turndown(main).replace(/\n{3,}/g, '\n\n').trim(),
    '',
  ].join('\n');
  const cel = katalog ? join(root, `${katalog}.md`) : join(root, 'index.md');
  writeFileSync(cel, md);
  wszystkie.push(md);
  console.log(`MD: ${cel}`);
}
writeFileSync(join(root, 'llms-full.txt'), wszystkie.join('\n\n---\n\n'));
console.log(`llms-full.txt: ${wszystkie.length} stron`);

// Żaden znacznik ceny nie może zostać w gotowej stronie (np. pole tekstowe bez podmiany).
const zostale = [];
(function szukaj(p) {
  for (const n of readdirSync(p)) {
    const f = join(p, n);
    if (statSync(f).isDirectory()) { if (n !== '_astro') szukaj(f); }
    else if (/\.(html|md|txt|xml)$/.test(n) && /\{\{(cena|Cena|kwota):|\{\{[a-z0-9_]+(\|slownie)?\}\}/.test(readFileSync(f, 'utf8'))) zostale.push(relative(root, f));
  }
})(root);
if (zostale.length) { console.error(`Niepodmienione znaczniki cen lub zmiennych w: ${zostale.join(', ')}`); process.exit(1); }
