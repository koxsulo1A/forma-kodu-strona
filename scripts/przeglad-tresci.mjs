#!/usr/bin/env node
// Kwartalny przegląd świeżości (technika nr 6 z WERYFIKACJA: 72% stron cytowanych przez AI zaktualizowano w ciągu roku, Seer 07.2026).
// Wypisuje, co trzeba przejrzeć. NIE zmienia dat: datę zmienia redaktor tylko przy prawdziwej zmianie treści (zasada stała 13);
// sama zmiana daty nie daje efektu albo szkodzi (CiteSurge 09.2026).
// Użycie: node scripts/przeglad-tresci.mjs [src/content] [dniStron=90] [dniCen=180]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [root = 'src/content', dniStron = '90', dniCen = '180'] = process.argv.slice(2);
const dzis = Date.now();
const wiek = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? Math.floor((dzis - Date.parse(d)) / 864e5) : null);
const frontmatter = (t) => Object.fromEntries([...(t.match(/^---\n([\s\S]*?)\n---/)?.[1] || '').matchAll(/^(\w+):\s*"?([^"\n]*)"?$/gm)].map((m) => [m[1], m[2]]));
const wiersze = [];
const dodaj = (typ, plik, data, limit) => {
  const w = wiek(data);
  if (w === null) wiersze.push(['brak daty', typ, plik, data]);
  else if (w > limit) wiersze.push([`${w} dni`, typ, plik, data]);
};
const czytaj = (kat, rozsz, typ, pole, limit) => {
  const k = join(root, kat);
  if (!existsSync(k)) return;
  for (const n of readdirSync(k).filter((x) => x.endsWith(rozsz))) {
    const t = readFileSync(join(k, n), 'utf8');
    const d = rozsz === '.json' ? JSON.parse(t)[pole] : frontmatter(t)[pole];
    dodaj(typ, `${kat}/${n}`, d ?? '', limit);
  }
};
czytaj('seo', '.json', 'strona', 'aktualizacja', +dniStron);
czytaj('faq', '.md', 'FAQ', 'aktualizacja', +dniStron);
czytaj('realizacje', '.md', 'realizacja', 'aktualizacja', +dniStron * 2);
czytaj('ceny', '.json', 'cena', 'data_odczytu', +dniCen);
czytaj('dokumenty', '.md', 'dokument prawny', 'data_przegladu', 365);

if (!wiersze.length) console.log('Wszystko świeże.');
else {
  console.log(`Do przejrzenia (${wiersze.length}). Zmień datę tylko, jeśli zmienisz treść.`);
  for (const [w, typ, plik, d] of wiersze) console.log(`  • ${w.padEnd(10)} ${typ.padEnd(16)} ${plik}  (${d})`);
}
