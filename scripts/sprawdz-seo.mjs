#!/usr/bin/env node
// Kontrola SEO/GEO gotowej strony (katalog dist po `astro build`). Bez zależności.
// Sprawdza każdy plik .html: jeden <h1>, kolejność nagłówków, title/description/canonical/og, lang, JSON-LD (poprawny JSON),
// alt obrazów, dateModified = widoczna data, treść w HTML (nie tylko w JS), linki do .md i llms.txt,
// powielone tytuły i opisy między stronami oraz martwe linki wewnętrzne (testy wzorowane na @jdevalk/astro-seo-graph, zestaw 2 SEO, Kacper 26.11).
// Użycie: node scripts/sprawdz-seo.mjs [dist]   Kod wyjścia 1 = błędy.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] || 'dist';
const bledy = [];
const ostrzezenia = [];
const pliki = [];
(function przejdz(p) {
  for (const n of readdirSync(p)) {
    const f = join(p, n);
    if (statSync(f).isDirectory()) { if (n !== '_astro' && n !== 'admin') przejdz(f); }
    else if (n.endsWith('.html')) pliki.push(f);
  }
})(root);

// Adres strony z ścieżki pliku: index.html → /, oferta/index.html → /oferta (trailingSlash: 'never').
const adresPliku = (f) => '/' + relative(root, f).split(sep).join('/').replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
const tytuly = new Map(); // tekst → [adresy]
const opisy = new Map();
const linki = []; // [adres strony, href]
const dodaj = (mapa, klucz, adres) => mapa.set(klucz, [...(mapa.get(klucz) || []), adres]);

const tekst = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const meta = (h, attr, val) => (h.match(new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*>`, 'i')) || [''])[0].match(/content=["']([^"']*)["']/i)?.[1];

for (const f of pliki) {
  const h = readFileSync(f, 'utf8');
  const blad = (m) => bledy.push(`${f}: ${m}`);
  const uwaga = (m) => ostrzezenia.push(`${f}: ${m}`);
  const noindex = /<meta[^>]*name=["']robots["'][^>]*noindex/i.test(h);
  const jest404 = /404/.test(f);

  const adres = adresPliku(f);
  for (const m of h.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)) linki.push([adres, m[1]]);
  if (!/<html[^>]*\slang=["']pl/i.test(h)) blad('brak <html lang="pl">');
  const h1 = h.match(/<h1[\s>]/gi) || [];
  if (h1.length !== 1) blad(`liczba <h1> = ${h1.length} (ma być 1, zasada stała 8)`);
  const poziomy = [...h.matchAll(/<h([1-6])[\s>]/gi)].map((m) => +m[1]);
  poziomy.forEach((p, i) => { if (i && p > poziomy[i - 1] + 1) blad(`przeskok nagłówka h${poziomy[i - 1]} → h${p}`); });

  const title = (h.match(/<title>([^<]*)<\/title>/i) || [])[1];
  if (!title) blad('brak <title>'); else if (title.length > 65) uwaga(`<title> ma ${title.length} znaków (> 65)`);
  const desc = meta(h, 'name', 'description');
  if (!desc) blad('brak meta description'); else if (desc.length < 70 || desc.length > 160) uwaga(`description ma ${desc.length} znaków (70–160)`);
  if (!noindex && !jest404) {
    if (title) dodaj(tytuly, title.trim(), adres);
    if (desc) dodaj(opisy, desc.trim(), adres);
    if (!/<link[^>]*rel=["']canonical["']/i.test(h)) blad('brak canonical');
    for (const p of ['og:title', 'og:description', 'og:image', 'og:url']) if (!meta(h, 'property', p)) blad(`brak ${p}`);
    if (!/type=["']text\/markdown["']/i.test(h)) uwaga('brak <link rel="alternate" type="text/markdown">');
  }

  const ldBloki = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (!noindex && !jest404 && !ldBloki.length) blad('brak JSON-LD');
  for (const b of ldBloki) {
    try {
      const j = JSON.parse(b);
      const s = JSON.stringify(j);
      if (/\[[^\]"]*\p{L}[^\]"]*\]/u.test(s)) uwaga('JSON-LD zawiera zaślepki [..]');
      const dm = s.match(/"dateModified":"([^"]+)"/)?.[1];
      if (dm && !h.includes(`datetime="${dm}"`)) uwaga(`dateModified ${dm} nie ma widocznego odpowiednika <time datetime> (zasada 13)`);
    } catch (e) { blad(`JSON-LD nie jest poprawnym JSON: ${e.message}`); }
  }

  for (const m of h.matchAll(/<img\b[^>]*>/gi)) if (!/\salt=/i.test(m[0])) blad(`obraz bez alt: ${m[0].slice(0, 80)}`);
  for (const m of h.matchAll(/<input\b(?![^>]*type=["'](?:hidden|submit|button)["'])[^>]*>/gi)) {
    const id = m[0].match(/\sid=["']([^"']+)["']/)?.[1];
    if (!id || !new RegExp(`<label[^>]*for=["']${id}["']`).test(h)) if (!/aria-label/.test(m[0])) blad(`pole formularza bez etykiety: ${m[0].slice(0, 80)}`);
  }
  if (/<input[^>]*type=["']checkbox["'][^>]*\schecked/i.test(h)) blad('checkbox zaznaczony z góry (zgoda musi być niezaznaczona)');

  // Technika nr 2 (WERYFIKACJA): odpowiedź na początku. Pod H1 i pod każdym śródtytułem-pytaniem pierwszy element to akapit,
  // a jego pierwsze zdanie ma ≤ 40 słów (zasady stałe 9 i 10). Tylko ostrzeżenia: to reguła redakcyjna, nie techniczna.
  const main = (h.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  const poNaglowku = [...main.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>(?=\s*(?:<p class="aktualizacja"[\s\S]*?<\/p>\s*)?(<\w+)?([\s\S]{0,1200}))/gi)]; // lookahead: kolejne nagłówki nie są „zjadane”
  for (const [, poziom, naglowek, nastepny, reszta] of poNaglowku) {
    const tytulN = tekst(naglowek);
    if (poziom !== '1' && !tytulN.endsWith('?')) continue;
    if (poziom === '1' && /polityka|dostepnosc/.test(f)) continue; // dokumenty prawne mają własny układ
    if (!nastepny || nastepny.toLowerCase() !== '<p') { uwaga(`pod „${tytulN.slice(0, 50)}” pierwszy element to nie akapit z odpowiedzią`); continue; }
    const akapit = tekst((reszta.match(/^[^>]*>([\s\S]*?)<\/p>/) || ['', ''])[1]);
    const zdanie = akapit.split(/(?<=[.!?])\s/)[0];
    if (zdanie.split(' ').length > 40) uwaga(`pierwsze zdanie pod „${tytulN.slice(0, 50)}” ma ${zdanie.split(' ').length} słów (> 40): zacznij od krótkiej odpowiedzi`);
  }
  if (!noindex && !jest404) {
    const pytania = [...main.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].filter((m) => tekst(m[1]).endsWith('?')).length;
    if (pytania === 0 && !/polityka|dostepnosc/.test(f)) uwaga('żaden śródtytuł nie jest pytaniem klienta (technika nr 2: dopasowanie do pytań)');
  }

  const slowa = tekst(h.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/gi, '')).split(' ').length;
  if (!noindex && !jest404 && slowa < 150) uwaga(`mało treści w HTML (${slowa} słów): czy treść nie ładuje się dopiero z JS?`);
}

// Powielone tytuły i opisy: Google nie wie, którą stronę pokazać na dane zapytanie (strony konkurują ze sobą).
for (const [nazwa, mapa] of [['<title>', tytuly], ['meta description', opisy]])
  for (const [t, adresy] of mapa) if (adresy.length > 1) bledy.push(`ten sam ${nazwa} na ${adresy.length} stronach (${adresy.join(', ')}): „${t.slice(0, 70)}”`);

// Martwe linki wewnętrzne: href prowadzi do adresu, którego nie ma w buildzie. Link z „/” na końcu = zbędne przekierowanie.
// Pomijamy trasy serwera (/api, /keystatic), linki zewnętrzne, mailto/tel i same kotwice.
const istniejace = new Set(pliki.map(adresPliku));
const plikIstnieje = (a) => { try { return statSync(join(root, decodeURIComponent(a))).isFile(); } catch { return false; } };
const zgloszone = new Set();
for (const [skad, href] of linki) {
  if (!href.startsWith('/') || href.startsWith('//')) continue;
  const a = href.split(/[?#]/)[0] || '/';
  if (/^\/(api|keystatic)(\/|$)/.test(a)) continue;
  const bezUkosnika = a.length > 1 ? a.replace(/\/$/, '') : a;
  const klucz = `${skad} → ${href}`;
  if (zgloszone.has(klucz)) continue;
  zgloszone.add(klucz);
  if (!istniejace.has(bezUkosnika) && !plikIstnieje(a)) bledy.push(`martwy link wewnętrzny na ${skad}: ${href}`);
  else if (a !== bezUkosnika && istniejace.has(bezUkosnika)) ostrzezenia.push(`link z ukośnikiem na końcu na ${skad}: ${href} (przekierowanie; użyj ${bezUkosnika})`);
}

for (const plik of ['robots.txt', 'llms.txt', 'sitemap-index.xml']) if (!existsSync(join(root, plik))) bledy.push(`brak ${plik} w ${root}`);
if (existsSync(join(root, 'robots.txt'))) {
  const r = readFileSync(join(root, 'robots.txt'), 'utf8');
  if (/^Disallow:\s*\/\s*$/m.test(r)) bledy.push('robots.txt blokuje całą stronę (Disallow: /)');
  if (!/^Sitemap:/m.test(r)) bledy.push('robots.txt bez linii Sitemap');
}

console.log(`Sprawdzone strony: ${pliki.length}. Błędy: ${bledy.length}. Ostrzeżenia: ${ostrzezenia.length}.`);
ostrzezenia.forEach((o) => console.log('  ⚠ ' + o));
bledy.forEach((b) => console.error('  ✗ ' + b));
if (bledy.length) process.exit(1);
