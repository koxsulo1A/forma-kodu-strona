// Zmienne (Kacper 28.11): dana, która powtarza się w wielu miejscach, ma jedno źródło.
// Zmiana wartości w panelu („Dane firmy i ustawienia” → „Zmienne”) zmienia ją we wszystkich miejscach naraz.
// W treści (panel, JSON, Markdown) wpisujesz znacznik:
//   {{data_publikacji}}          → 2026-12-01
//   {{data_publikacji|slownie}}  → 1 grudnia 2026 (tylko dla dat RRRR-MM-DD)
//   {{email}}, {{email_dane_osobowe}}, {{telefon}}, {{nazwa_marki}}, {{nazwa_prawna}}, {{adres}},
//   {{czas_odpowiedzi_dni}}, {{metoda_oceny}} → z „Dane firmy” (wbudowane, bez wpisu w Zmiennych)
// Pusta wartość = zaślepka „[opis zmiennej]”: strona się buduje, a sprawdz-zaslepki blokuje publikację, dopóki jej nie uzupełnisz.
// Nieznany klucz zatrzymuje budowanie (literówka w znaczniku nie może trafić na stronę).
// Gdzie działa podmiana:
//   1) treść stron (trescStrony w src/lib/tresc.ts) – komponenty dostają gotowe wartości;
//   2) daty (Aktualizacja.astro, sitemap w astro.config.mjs);
//   3) wszystko inne (FAQ, dokumenty, SEO, JSON-LD, llms.txt) – scripts/generuj-markdown.mjs zaraz po `astro build`, tak jak ceny.
import { readFileSync, existsSync } from 'node:fs';

const PLIK = 'src/content/ustawienia/zmienne.json';
// Pole „Dane firmy” z zaślepką [..] traktujemy jak puste (pokaże się opis zmiennej).
const pusteGdyZaslepka = (/** @type {unknown} */ w) => { const t = String(w ?? '').trim(); return /^\[.*\]$/.test(t) ? '' : t; };
const WZOR = /\{\{([a-z0-9_]+)(\|slownie)?\}\}/g;

/** @returns {Map<string, { wartosc: string; opis: string }>} */
export function zmienne() {
  const mapa = new Map();
  const f = JSON.parse(readFileSync('src/content/ustawienia/firma.json', 'utf8'));
  const adres = f.adres?.ulica ? `ul. ${f.adres.ulica}, ${f.adres.kod} ${f.adres.miasto}` : '';
  for (const [klucz, wartosc, opis] of [
    ['email', f.email, 'e-mail firmy'],
    ['telefon', f.telefon, 'telefon firmy'],
    ['nazwa_marki', f.nazwa_marki, 'nazwa marki'],
    ['nazwa_prawna', f.nazwa_prawna, 'pełna nazwa firmy'],
    ['adres', adres, 'adres biura'],
    ['email_dane_osobowe', f.email_dane_osobowe, 'e-mail w sprawach danych osobowych'],
    ['czas_odpowiedzi_dni', f.dostepnosc?.czas_odpowiedzi_dni, 'liczba dni roboczych na odpowiedź w sprawie dostępności'],
    ['metoda_oceny', f.dostepnosc?.metoda_oceny, 'sposób oceny dostępności: samoocena (klawiatura, czytnik ekranu, axe, powiększenie 200%, szerokość 320 px) albo audyt zewnętrzny: nazwa, data'],
  ]) mapa.set(klucz, { wartosc: pusteGdyZaslepka(wartosc), opis });
  const lista = existsSync(PLIK) ? JSON.parse(readFileSync(PLIK, 'utf8')).zmienne ?? [] : [];
  for (const z of lista) {
    if (mapa.has(z.klucz)) throw new Error(`Zmienne: klucz „${z.klucz}” jest podwójny albo zajęty przez Dane firmy`);
    mapa.set(z.klucz, { wartosc: String(z.wartosc ?? '').trim(), opis: z.opis || z.klucz });
  }
  return mapa;
}

const slownie = (/** @type {string} */ d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d))
    : d;

/** @param {string} tekst @param {Map<string, { wartosc: string; opis: string }>} [mapa] */
export function wstawZmienne(tekst, mapa = zmienne()) {
  if (!tekst.includes('{{')) return tekst;
  return tekst.replace(WZOR, (_, klucz, forma) => {
    const z = mapa.get(klucz);
    if (!z) throw new Error(`Zmienne: nieznany znacznik {{${klucz}}}. Dodaj go w panelu „Zmienne” albo popraw literówkę.`);
    if (!z.wartosc) return `[${z.opis}]`;
    return forma ? slownie(z.wartosc) : z.wartosc;
  });
}

/** Podmienia znaczniki we wszystkich tekstach obiektu (treść segmentów z Keystatic). @template T @param {T} dane @returns {T} */
export function wstawZmienneGleboko(dane, mapa = zmienne()) {
  if (typeof dane === 'string') return /** @type {T} */ (wstawZmienne(dane, mapa));
  if (Array.isArray(dane)) return /** @type {T} */ (dane.map((x) => wstawZmienneGleboko(x, mapa)));
  if (dane && typeof dane === 'object' && Object.getPrototypeOf(dane) === Object.prototype)
    return /** @type {T} */ (Object.fromEntries(Object.entries(dane).map(([k, v]) => [k, wstawZmienneGleboko(v, mapa)])));
  return dane;
}
