# Bezpieczeństwo

## Jest

- CSP z hashami skryptów, bez `unsafe-inline` (strony publiczne); panel `/keystatic` bez CSP, z `noindex` i logowaniem GitHub (`src/middleware.ts`).
- Nagłówki w `public/_headers`: `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Formularze: walidacja na serwerze taka sama jak w przeglądarce, ukryte pole na boty, sprawdzanie `Origin`, limit 20 000 bajtów, ucięcie długości pól.
- Klucze tylko jako sekrety Cloudflare (`BREVO_API_KEY`, 3 klucze Keystatic). Nic tajnego w repozytorium.
- Brak zewnętrznych skryptów bez zgody: GA4 i widżety opinii ładują się dopiero po zgodzie (`src/lib/zgody.ts`), dziś nieużywane.
- `/.well-known/security.txt` z kontaktem.

## Brakuje (decyzje)

| Co | Ryzyko | Opcje | Rekomendacja |
|--|--|--|--|
| Limit zgłoszeń na adres IP | bot bez wypełniania pułapki może wysłać setki zgłoszeń i zużyć limit Brevo (300 dziennie) | (a) reguła Rate limiting w Cloudflare (WAF → Rate limiting rules, plan Free ma 1 regułę) na `/api/*`; (b) Turnstile; (c) nic, reagować przy spamie | (a) przy publikacji, 5 minut w panelu |
| Blokada IP w Brevo wyłączona | wyciek klucza = możliwość wysyłki z Twojego konta z dowolnego miejsca | Workery nie mają stałego IP, więc blokady nie da się włączyć | klucz tylko w sekrecie, osobny klucz tylko dla strony, wymiana przy podejrzeniu wycieku |
| CSP w `<meta>`, nie w nagłówku | `frame-ancestors` w meta nie działa | ochronę przed osadzaniem daje `X-Frame-Options: DENY` | zostawić (audyt 25.11) |
