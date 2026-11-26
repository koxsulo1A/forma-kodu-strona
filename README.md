# Forma Kodu: strona formakodu.pl

Astro (strona statyczna) + React tylko w wyspach + Motion (animacje na komputerze) + panel treści Keystatic. Hosting strony, panelu i formularzy: Cloudflare Workers.

Punkt startu: pakiet `brama/wdrozenie-prawo-cms-seo/pliki` (24.11.2026). Makiety: Figma `tumyVJt49a89k7CUq7xTTx`, strony 27–32 + 31b.

## Uruchomienie

```bash
npm install
npm run dev        # strona: http://localhost:4321, panel: /keystatic
npm run verify     # budowanie + kontrole (treść, SEO, budżet JS, zaślepki)
```

Zaślepki `[…]` (NIP, e-mail, telefon itd.) blokują publikację (`npm run release`), wersja testowa się buduje.

## Hosting (Cloudflare Workers)

- Worker `forma-kodu-strona`, budowanie przez Workers Builds z gałęzi `main` (`npm run build`, potem `npx wrangler deploy`).
- Adres testowy: https://forma-kodu-strona.kacper111gra1a.workers.dev, docelowo https://formakodu.pl.
- Sekrety Workera: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` (nigdy w repozytorium).
- Panel `/keystatic` nie ma CSP strony (src/middleware.ts), bo blokowała jego style.
