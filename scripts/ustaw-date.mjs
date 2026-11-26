// Ustawia datę pierwszej publikacji (zasada stała 13 skilla strona-od-a-do-z).
// Użycie: npm run ustaw-date -- 2026-11-27   (bez daty: dzisiejsza, czas polski)
// Zmienia TYLKO zaślepki „[data]” w polach dat publikacji i aktualizacji:
//   - JSON: "aktualizacja": "[data]"
//   - frontmatter .md: aktualizacja / obowiazuje_od / data_przegladu
//   - tekst polityki i deklaracji: „Obowiązuje od”, „Data publikacji strony”, „Data ostatniej istotnej aktualizacji”,
//     „Data sporządzenia oświadczenia”, „Ostatni przegląd”.
// NIE zmienia: dat źródeł kwot ("data" obok "zrodlo" – podaje je Kacper razem ze źródłem)
// ani dat realizacji ("data: [RRRR-MM]" – wpisuje Kacper w CMS).
// Później datę zmienia się ręcznie, tylko przy prawdziwej zmianie treści.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const arg = process.argv[2];
const dzis = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
const data = arg ?? dzis;
if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) {
  console.error(`Zła data: ${data}. Format: RRRR-MM-DD`);
  process.exit(1);
}

const slownie = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(data));
const wzory = [
  [/("aktualizacja":\s*)"\[data\]"/g, `$1"${data}"`],
  [/^(aktualizacja|obowiazuje_od|data_przegladu):\s*(["']?)\[data\]\2\s*$/gm, `$1: "${data}"`],
  [/(Obowiązuje od: |Data publikacji strony: |Data ostatniej istotnej aktualizacji: |Data sporządzenia oświadczenia: |Ostatni przegląd: )\[data\]/g, `$1${slownie}`],
];

function pliki(katalog) {
  return readdirSync(katalog).flatMap((n) => {
    const p = join(katalog, n);
    return statSync(p).isDirectory() ? pliki(p) : /\.(json|md|mdx)$/.test(n) ? [p] : [];
  });
}

let zmian = 0;
for (const plik of pliki('src/content')) {
  const przed = readFileSync(plik, 'utf8');
  let po = przed;
  for (const [wzor, na] of wzory) po = po.replace(wzor, (...m) => { zmian++; return m[0].replace(wzor, na); });
  if (po !== przed) { writeFileSync(plik, po); console.log(`  ${plik}`); }
}
console.log(`Ustawiono datę ${data} w ${zmian} miejscach. Sprawdź: npm run check:zaslepki:test`);
