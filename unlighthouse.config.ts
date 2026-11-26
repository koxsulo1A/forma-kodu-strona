// Unlighthouse: Lighthouse 13 puszczony na wszystkie podstrony naraz (zestaw 2 SEO, decyzja Kacpra 26.11.2026).
// Uruchamiaj na swoim komputerze (wymaga Chrome i Node ≥ 22.18), nie na Cloudflare. Instrukcja:
// /mnt/project-files/forma-kodu-strona/seo/INSTRUKCJA-SEO-FORMA-KODU.md, rozdział 4.
//   npm run audyt                      → panel w przeglądarce dla formakodu.pl
//   npm run audyt -- --site http://localhost:4321   → wersja lokalna (najpierw npm run dev albo preview)
//   npm run audyt:ci                   → bramka przed publikacją: błąd, gdy coś spadnie poniżej budżetu
import { defineUnlighthouseConfig } from 'unlighthouse/config';

export default defineUnlighthouseConfig({
  site: process.env.AUDYT_URL || 'https://formakodu.pl',
  puppeteerOptions: process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN, args: ['--no-sandbox'] } : undefined,
  scanner: {
    device: 'mobile', // Google ocenia wersję mobilną
    exclude: ['/keystatic/**', '/api/**', '/dziekujemy'],
    samples: 3, // 3 pomiary na stronę, wynik to średnia: mniej przypadkowych wahań
    throttle: true, // symulacja wolniejszego telefonu i sieci, bliżej danych od prawdziwych użytkowników
  },
  ci: {
    budget: { performance: 90, accessibility: 100, 'best-practices': 100, seo: 100 },
    buildStatic: true, // raport HTML w .unlighthouse/ do obejrzenia po skanie
  },
});
