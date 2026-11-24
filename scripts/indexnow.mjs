#!/usr/bin/env node
// Po publikacji na produkcji: zgłasza adresy z sitemap do IndexNow (Bing, Yandex, Seznam, Naver i inni).
// Indeks Bing zasila m.in. Copilot i wyszukiwanie ChatGPT (źródła wtórne 2026, patrz WERYFIKACJA-TECHNIK).
// Klucz: plik public/<klucz>.txt z treścią = klucz. Użycie: node scripts/indexnow.mjs https://domena <klucz> [dist]
// Uruchamiaj TYLKO po wdrożeniu produkcji i tylko dla zmienionych adresów (nadużycie = ignorowanie zgłoszeń).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [domena, klucz, root = 'dist'] = process.argv.slice(2);
if (!domena || !klucz || domena.includes('[')) { console.error('Podaj domenę i klucz (bez zaślepek).'); process.exit(1); }
const host = new URL(domena).host;
const mapy = readdirSync(root).filter((n) => /^sitemap-\d+\.xml$/.test(n));
const adresy = mapy.flatMap((m) => [...readFileSync(join(root, m), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]));
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: klucz, keyLocation: `${domena.replace(/\/$/, '')}/${klucz}.txt`, urlList: adresy }),
});
console.log(`IndexNow: ${res.status} dla ${adresy.length} adresów`);
if (res.status >= 400) process.exit(1);
