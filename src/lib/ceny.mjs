// Jedno źródło cen (Kacper 24.11: „Wszystkie ceny w cenniku są zsynchronizowane”): kolekcja src/content/ceny.
// Segmenty wskazują cenę relacją (pole `cena` / `ceny` w panelu). Teksty (FAQ, opisy SEO, Markdown, llms.txt) używają znaczników:
//   {{cena:strony-internetowe-dedykowana}}  → „od 7 900 zł netto”   ({{Cena:…}} → „Od 7 900 zł netto” na początku zdania)
//   {{kwota:strony-internetowe-dedykowana}} → „7 900”
// Znaczniki w gotowym HTML, JSON-LD, sitemap i llms.txt podmienia scripts/generuj-markdown.mjs zaraz po `astro build`
// (Astro 7 renderuje Markdown przez Sätteri, wtyczki remark wymagają dodatkowego pakietu; podmiana po budowaniu działa dla każdego pola).
// Nieznany znacznik zatrzymuje budowanie (lepiej błąd niż stara albo pusta cena na stronie).
// Komponenty z relacją do cennika: cenaTekst(cena(slug)).
import { readFileSync, readdirSync } from 'node:fs';

/** @typedef {{ nazwa: string; kwota_od?: number; kwota_do?: number; netto: boolean; okres: string; nasza_cena: boolean }} Cena */

const KATALOG = 'src/content/ceny';
/** @returns {Record<string, Cena>} */
const wszystkie = () =>
  Object.fromEntries(readdirSync(KATALOG).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(`${KATALOG}/${f}`, 'utf8'))]));

// „7 900”, nie „7900”: pl-PL domyślnie nie grupuje liczb 4-cyfrowych.
const zl = (/** @type {number} */ n) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0, useGrouping: 'always' }).format(n);

/** @param {Cena | null | undefined} c */
export function cenaTekst(c, wielka = false) {
  if (!c || c.kwota_od == null) return wielka ? 'Wycena indywidualna' : 'wycena indywidualna';
  const okres = c.okres === 'miesięcznie' ? ' miesięcznie' : c.okres === 'rocznie' ? ' rocznie' : '';
  const t = `${c.kwota_do ? `od ${zl(c.kwota_od)} do ${zl(c.kwota_do)}` : `od ${zl(c.kwota_od)}`} zł ${c.netto ? 'netto' : 'brutto'}${okres}`;
  return wielka ? t[0].toUpperCase() + t.slice(1) : t;
}

/** @param {string | null | undefined} slug @returns {Cena | null} */
export function cena(slug) {
  if (!slug) return null;
  const c = wszystkie()[slug];
  if (!c) throw new Error(`Cennik: brak wpisu „${slug}” w ${KATALOG}`);
  return c;
}

/** @param {string} tekst */
export function wstawCeny(tekst) {
  return tekst.replace(/\{\{(cena|Cena|kwota):([a-z0-9-]+)\}\}/g, (_, typ, slug) => {
    const c = /** @type {Cena} */ (cena(slug));
    if (typ === 'kwota') { if (c.kwota_od == null) throw new Error(`Cennik: „${slug}” nie ma kwoty`); return zl(c.kwota_od); }
    return cenaTekst(c, typ === 'Cena');
  });
}
