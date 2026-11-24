// Odczyt treści segmentów stron (src/content/strony/*.json) przez czytnik Keystatic.
// Czytnik sprawdza dane według schematu z src/keystatic/strony.ts (jedno źródło), więc błędny plik zatrzymuje budowanie.
// Użycie w stronie .astro:
//   import { trescStrony, rt } from '../lib/tresc';
//   const t = await trescStrony('strona-glowna');   // null = brak pliku (strona jeszcze bez treści)
//   <p set:html={rt(t.s12_kim_jestesmy.opis)} />
//   const karty = await realizacjeWybrane(t.s5_realizacje.realizacje);
//   const benefity = await benefityZRealizacji(t.s5_realizacje.realizacje, t.s6_benefity.maks ?? 6);
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const czytnik = createReader(process.cwd(), keystaticConfig);

export const trescStrony = <K extends keyof typeof czytnik.singletons>(id: K) => czytnik.singletons[id].read();

// Pola „rt”: tylko **pogrubienie** i [link](/adres). Reszta jako zwykły tekst (bezpieczne: najpierw escapowanie HTML).
export function rt(tekst: string | null | undefined): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return esc(tekst ?? '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br />');
}

// Realizacje: jedno źródło (kolekcja „Realizacje”), segmenty 27 S5, 28 S12, 29 S8, 31 S1 tylko wskazują projekty ręcznie (Kacper 24.11).
// Kolejność = kolejność wyboru w panelu. Brakujący wpis (usunięty z kolekcji) jest pomijany.
export async function realizacjeWybrane(slugi: readonly (string | null)[] | null | undefined) {
  const wynik = [];
  for (const slug of slugi ?? []) {
    if (!slug) continue;
    const entry = await czytnik.collections.realizacje.read(slug);
    if (entry) wynik.push({ slug, entry });
  }
  return wynik;
}

// 27 S6: benefity zebrane z realizacji wybranych w 27 S5 (bez powtórzeń tytułu), maks. z pola segmentu „maks”.
// Każdy benefit ma odnośnik do realizacji, z której pochodzi (dowód, zasada stała 12). „Przykład układu” pomijamy: to nie dowód efektu.
export async function benefityZRealizacji(slugiS5: readonly (string | null)[] | null | undefined, maks = 6) {
  const wynik: { tytul: string; opis: string; jak_sprawdzic: string; realizacja: string; slug: string }[] = [];
  const widziane = new Set<string>();
  for (const r of await realizacjeWybrane(slugiS5)) {
    if (r.entry.typ === 'przykład układu') continue;
    for (const b of r.entry.benefity) {
      const klucz = b.tytul.trim().toLowerCase();
      if (!b.tytul || widziane.has(klucz)) continue;
      widziane.add(klucz);
      wynik.push({ ...b, realizacja: r.entry.naglowek, slug: r.slug });
    }
  }
  return wynik.slice(0, maks);
}
