# Forma Kodu: strona centrumkodu.pl

Astro (strona statyczna) + React tylko w wyspach + Motion (animacje na komputerze) + panel treści Keystatic. Hosting strony, panelu i formularzy: Cloudflare Workers.

Punkt startu: pakiet `brama/wdrozenie-prawo-cms-seo/pliki` (24.11.2026). Makiety: Figma `tumyVJt49a89k7CUq7xTTx`, strony 27–32 + 31b.

## Uruchomienie

```bash
npm install
npm run dev        # strona: http://localhost:4321, panel: /keystatic
npm run verify     # budowanie + kontrole (treść, SEO, budżet JS, zaślepki)
```

Zaślepki `[…]` (NIP, e-mail, telefon itd.) blokują publikację (`npm run release`), wersja testowa się buduje.
