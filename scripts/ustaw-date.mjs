// Ustawia datę pierwszej publikacji (zasada stała 13 skilla strona-od-a-do-z).
// Użycie: npm run ustaw-date -- 2026-12-01   (bez daty: dzisiejsza, czas polski)
// Od 28.11 data publikacji jest zmienną: wpisuje ją w jedno miejsce, src/content/ustawienia/zmienne.json („data_publikacji”).
// Wszystkie pola z {{data_publikacji}} (daty aktualizacji stron, FAQ, realizacji, polityki i deklaracji) biorą ją stamtąd.
// To samo można zrobić w panelu: Dane firmy i ustawienia → Zmienne.
// Później, przy prawdziwej zmianie jednej strony, wpisz w jej polu „aktualizacja” konkretną datę zamiast znacznika.
import { readFileSync, writeFileSync } from 'node:fs';

const PLIK = 'src/content/ustawienia/zmienne.json';
const dzis = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
const data = process.argv[2] ?? dzis;
if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) {
  console.error(`Zła data: ${data}. Format: RRRR-MM-DD`);
  process.exit(1);
}
const plik = JSON.parse(readFileSync(PLIK, 'utf8'));
const z = plik.zmienne.find((x) => x.klucz === 'data_publikacji');
if (!z) { console.error(`Brak zmiennej data_publikacji w ${PLIK}`); process.exit(1); }
z.wartosc = data;
writeFileSync(PLIK, JSON.stringify(plik, null, 2) + '\n');
console.log(`Ustawiono data_publikacji = ${data} (${PLIK}). Sprawdź: npm run check:zaslepki:test`);
