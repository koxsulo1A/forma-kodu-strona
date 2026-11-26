// Fragment konfiguracji Astro dla SEO/GEO. Scal z istniejącym astro.config (nie nadpisuj innych ustawień).
// [Pamięć] opcje @astrojs/sitemap (filter, serialize, lastmod) i security.csp — sprawdź w docs.astro.build dla zainstalowanej wersji.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// lastmod w sitemap = pole „aktualizacja” z CMS (zasada stała 13), nie data budowania.
const lastmod = Object.fromEntries(
  readdirSync('src/content/seo').map((f) => {
    const d = JSON.parse(readFileSync(`src/content/seo/${f}`, 'utf8'));
    return [d.adres, /^\d{4}-\d{2}-\d{2}$/.test(d.aktualizacja) ? d.aktualizacja : undefined];
  }),
);
// Dwa budowania z tego samego repozytorium:
// Decyzja Kacpra 24.11: wszystko na Cloudflare.
// 1) PANEL=1 (`npm run build`): strona statyczna + panel Keystatic jako Worker (/keystatic, /api/keystatic, /api/* formularzy).
// 2) bez PANEL: sama strona, bez panelu. Nie działa od dodania tras /api/* (wymagają adaptera), więc skrypt build:statyczna usunięty 26.11.
// SERWER=node: ten sam panel na Node (wariant VPS, nieużywany).
// Lokalnie (`astro dev`) panel działa zawsze i zapisuje do plików.
const PANEL = process.env.PANEL === '1';
const DEV = process.argv.includes('dev');
// Podstrony realizacji 31b: lastmod z pola „aktualizacja” wpisu („przykład układu” nie ma podstrony).
if (existsSync('src/content/realizacje')) for (const f of readdirSync('src/content/realizacje').filter((n) => n.endsWith('.md'))) {
  const t = readFileSync(`src/content/realizacje/${f}`, 'utf8');
  const d = t.match(/^aktualizacja:\s*['"]?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (d && !/^typ:\s*['"]?przykład układu/m.test(t)) lastmod[`/realizacje/${f.replace(/\.md$/, '')}`] = d;
}
const firma = JSON.parse(readFileSync('src/content/ustawienia/firma.json', 'utf8'));

export default defineConfig({
  site: firma.domena.includes('[') ? 'https://example.invalid' : firma.domena, // zaślepka blokuje publikację osobno
  trailingSlash: 'never',
  build: { format: 'directory' },
  // Sesje Astro wyłączone: strona ich nie używa, a adapter Cloudflare dodawał wtedy wiązanie KV „SESSION” bez namespace_id,
  // przez co `wrangler preview` (buildy gałęzi PR w Workers Builds) kończył się błędem 10021 (log z 26.11).
  session: false,
  output: 'static', // cała strona prerenderowana: treść w HTML, bez zależności od JS (boty AI nie uruchamiają JS)
  // Panel Keystatic potrzebuje kodu serwera [Oficjalne: keystatic.com/docs/installation-astro]. Dlatego adapter Node tylko w budowaniu na VPS.
  // Test 24.11: na Cloudflare (wrangler) i na Node logowanie przekierowuje do GitHub, gdy są ustawione zmienne
  // KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET, KEYSTATIC_SECRET. Bez nich obie wersje dają błąd 500.
  // prerenderEnvironment 'node': strony statyczne renderują się w Node, nie w workerd. Bez tego czytnik Keystatic (src/lib/tresc.ts)
  // nie widzi plików na dysku i segmenty z realizacji wychodzą puste, bez błędu (test 24.11).
  adapter: PANEL ? (process.env.SERWER === 'node' ? node({ mode: 'standalone' }) : cloudflare({ prerenderEnvironment: 'node' })) : undefined,
  integrations: [
    react(),
    ...(PANEL || DEV ? [keystatic()] : []),
    sitemap({
      filter: (page) => !/\/(keystatic|api|dziekujemy|404)/.test(page),
      serialize(item) {
        const sciezka = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        if (lastmod[sciezka]) item.lastmod = lastmod[sciezka];
        return item;
      },
    }),
  ],
  // CSP w <meta> z hashami skryptów (Astro). Domeny Google tylko dla GA4 po zgodzie (decyzje 2C + 8C);
  // lista wg Google „Content Security Policy for Google Analytics” [Oficjalne: developers.google.com/tag-platform/security/guides/csp].
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com https://*.trustpilot.com",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
        "font-src 'self'",
        // Widżet opinii Trustpilot (decyzja 24.11, wariant B), ładowany dopiero po zgodzie na treści zewnętrzne.
        "frame-src 'self' https://widget.trustpilot.com",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      // Dopisz tu domenę skryptu widżetu opinii Google, gdy Kacper wybierze dostawcę (pole widzet_google.skrypt_url).
      scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com', 'https://widget.trustpilot.com'] },
    },
  },
  image: { responsiveStyles: true },
});
