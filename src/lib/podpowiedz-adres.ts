// Podpowiedź „Czy chodziło o…?” na stronie 404 (plan F3 z astro-seo-graph, 28.11.2026).
// Porównuje wpisany adres z listą adresów strony odległością Levenshteina, czyli liczbą liter do zmiany,
// żeby jeden adres zamienić w drugi. Działa w przeglądarce, niczego nie wysyła.

export type Adres = { url: string; nazwa: string };
export type Wynik = { tryb: 'przenies'; cel: Adres } | { tryb: 'podpowiedz'; propozycje: Adres[] } | { tryb: 'brak' };

export const PROG_PRZENIESIENIA = 0.85; // np. /pilotarze → /pilotaze (90%)
export const PROG_PODPOWIEDZI = 0.5;

// Ujednolica adres: małe litery, bez polskich znaków, bez ukośnika na końcu, bez .html i /index.
export function normalizuj(sciezka: string): string {
  let s = sciezka;
  try { s = decodeURIComponent(s); } catch { /* zostaw jak jest */ }
  s = s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/\.html?$/, '').replace(/\/index$/, '').replace(/\/+$/, '');
  return s || '/';
}

export function odleglosc(a: string, b: string): number {
  if (a === b) return 0;
  let poprzedni = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const biezacy = [i];
    for (let j = 1; j <= b.length; j++) {
      biezacy[j] = Math.min(poprzedni[j] + 1, biezacy[j - 1] + 1, poprzedni[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    poprzedni = biezacy;
  }
  return poprzedni[b.length];
}

export const podobienstwo = (a: string, b: string) => 1 - odleglosc(a, b) / Math.max(a.length, b.length, 1);

const rodzic = (s: string) => s.slice(0, s.lastIndexOf('/')) || '/';
const ostatni = (s: string) => s.slice(s.lastIndexOf('/') + 1);

// Ocena 0–1. Adresy z tym samym rodzicem (/realizacje/x i /realizacje/y) porównujemy tylko końcówką,
// bo wspólny początek zawyżałby podobieństwo. Końcówka zawarta w nazwie (/strony → /strony-internetowe) = podpowiedź.
export function ocena(wpisany: string, kandydat: string): number {
  if (kandydat !== '/' && kandydat === rodzic(wpisany)) return PROG_PODPOWIEDZI; // /realizacje/abc → /realizacje (na końcu listy)
  let p = rodzic(wpisany) === rodzic(kandydat) ? podobienstwo(ostatni(wpisany), ostatni(kandydat)) : podobienstwo(wpisany, kandydat);
  const w = ostatni(wpisany);
  if (w.length >= 4 && ostatni(kandydat).includes(w)) p = Math.max(p, 0.75);
  return p;
}

export function dopasuj(sciezka: string, adresy: Adres[]): Wynik {
  const wpisany = normalizuj(sciezka);
  const oceny = adresy
    .filter((a) => a.url !== '/') // strona główna jest zawsze w linkach; jako podpowiedź myli (krótki adres)
    .map((a) => ({ a, p: ocena(wpisany, normalizuj(a.url)) }))
    .sort((x, y) => y.p - x.p);
  const najlepszy = oceny[0];
  if (!najlepszy || najlepszy.p < PROG_PODPOWIEDZI) return { tryb: 'brak' };
  // Przenosimy tylko, gdy zwycięzca jest jednoznaczny (drugi wynik wyraźnie słabszy).
  const drugi = oceny[1];
  if (najlepszy.p >= PROG_PRZENIESIENIA && (!drugi || drugi.p < PROG_PRZENIESIENIA)) return { tryb: 'przenies', cel: najlepszy.a };
  return { tryb: 'podpowiedz', propozycje: oceny.filter((o) => o.p >= PROG_PODPOWIEDZI).slice(0, 3).map((o) => o.a) };
}
