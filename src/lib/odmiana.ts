// Odmiana liczebników po polsku (1 projekt, 2 projekty, 5 projektów) i opis listy realizacji (31 S2: „Pokazano 8 z 8: …”).
// Używane w budowaniu (S2Projekty.astro) i w przeglądarce (filtr w strona.ts), więc tekst jest ten sam przed i po kliknięciu.
export function odmien(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  if (n === 1) return jeden;
  const j = n % 10, d = n % 100;
  return j >= 2 && j <= 4 && (d < 12 || d > 14) ? kilka : wiele;
}

export function opisListy(typy: string[], wszystkie: number): string {
  const ile = (t: string) => typy.filter((x) => x === t).length;
  const czesci = [
    [ile('klient'), ['projekt klienta', 'projekty klientów', 'projektów klientów']],
    [ile('projekt własny'), ['projekt własny', 'projekty własne', 'projektów własnych']],
    [ile('przykład układu'), ['przykład układu', 'przykłady układu', 'przykładów układu']],
  ] as const;
  const opis = czesci.filter(([n]) => n > 0).map(([n, f]) => `${n} ${odmien(n, f as unknown as [string, string, string])}`);
  const lista = opis.length > 1 ? `${opis.slice(0, -1).join(', ')} i ${opis.at(-1)}` : (opis[0] ?? 'brak kart');
  return `Pokazano ${typy.length} z ${wszystkie}: ${lista}`;
}
