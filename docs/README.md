# Dokumentacja strony Forma Kodu

Stan: 26.11.2026. Strona testowa: https://forma-kodu-strona.kacper111gra1a.workers.dev. Domena docelowa: https://formakodu.pl (`centrumkodu.pl` przekierowuje).

| Plik | Co zawiera |
|--|--|
| [ARCHITEKTURA.md](ARCHITEKTURA.md) | z czego składa się strona i jak trafia do internetu |
| [API.md](API.md) | adresy formularzy `/api/*`: pola, odpowiedzi, błędy |
| [SECURITY.md](SECURITY.md) | zabezpieczenia i to, czego jeszcze brakuje |
| [PRZEKAZANIE.md](PRZEKAZANIE.md) | instrukcja dla właściciela: CMS, ceny, daty, przeglądy, zmiana dostawcy wysyłki |
| [wiki/](wiki/) | diagramy przepływów (Mermaid) |
| [solutions/](solutions/) | rozwiązane problemy, żeby nie wracały |
| [sesje/](sesje/) | notatki z sesji pracy |

## Dokumenty projektowe poza repozytorium

Nie są kopiowane do repozytorium, żeby nie było dwóch wersji. Źródło prawdy:

- **Prawo, CMS, SEO, decyzje 1A–14B:** folder projektu `brama/wdrozenie-prawo-cms-seo/` (`CZEKA-NA-KACPRA.md`, `DECYZJE-DO-PODJECIA.md`, `INSTRUKCJA-DLA-OPUS-...md`).
- **Design system:** Figma `tumyVJt49a89k7CUq7xTTx`, paleta Alt 6 v2 (`brama/mapa-tokenow-alt6v2.md`), typografia K11, tokeny w kodzie: `src/styles/tokens.css`.
- **Przyciski i pola CMS makiet 27–32:** `brama/przyciski-27-29.md`, `brama/pola-cms-27-29.md`.
- **Prawo (RODO, dostępność):** `brama/prawo-rodo-deklaracje.md`.
- **Plan domknięcia faz 7–10:** `forma-kodu-strona/PLAN-DOMKNIECIA-FAZA-7-10-2026-11-26.md`.

**Brak – do uzupełnienia:** BRIEF i PRD strony Forma Kodu w jednym pliku, z tabelą pochodzenia danych (zasada 1 skilla). Decyzje są rozproszone w plikach `brama/`; nie odtwarzam ich z pamięci.
