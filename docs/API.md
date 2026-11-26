# Formularze: `/api/*`

Wszystkie trzy adresy działają w Workerze (`export const prerender = false`) i mają wspólną obsługę w `src/lib/formularz.ts`.

| Adres | Formularz | Pola wymagane | Co robi |
|--|--|--|--|
| `POST /api/kontakt` | „Opisz projekt” | `imie`, `email`, `telefon` (min. 9 cyfr), `opis` | e-mail do `kontakt@formakodu.pl`, „Odpowiedz” trafia do klienta |
| `POST /api/pilotaz` | zgłoszenie na pilotaż (32 S6) | `rodzaj`, `imie`, `email`, `telefon` | jw. |
| `POST /api/powiadom` | „Powiadom mnie” | `email` | e-mail do nas + zapis na listę Brevo (`listaPowiadom`), opcjonalnie double opt-in (`szablonDoi`) |

## Odpowiedzi

| Kod | Kiedy |
|--|--|
| 200 | wysłano; także gdy wypełniono ukryte pole `strona_www` (bot dostaje „sukces”, nic nie wysyłamy) |
| 400 | brak pól albo zły format; JSON: `{ ok: false, pola: [...] }` |
| 403 | nagłówek `Origin` z innej strony |
| 413 | treść większa niż 20 000 bajtów |
| 502 | Brevo odrzuciło wysyłkę |
| 503 | brak sekretu `BREVO_API_KEY` (formularz podaje adres e-mail zastępczy) |

Przeglądarka z JS wysyła `Accept: application/json` i dostaje JSON. Bez JS formularz wysyła się zwykle i dostaje prostą stronę z wynikiem.

## Konfiguracja

- Sekret Cloudflare: `BREVO_API_KEY` (Workers & Pages → forma-kodu-strona → Settings → Variables and Secrets).
- Jawne ustawienia: `USTAWIENIA` w `src/lib/wysylka.ts` (odbiorca, nadawca, ID listy, ID szablonu DOI, adres po potwierdzeniu).
- Test lokalny: `npm run build && npx wrangler dev -c dist/server/wrangler.json` (+ `dist/server/.dev.vars` z kluczem testowym).
