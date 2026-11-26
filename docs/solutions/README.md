# Rozwiązane problemy

| Problem | Przyczyna | Rozwiązanie |
|--|--|--|
| Element nagle wygląda jak wycięcie w kratce | klasy `w0`–`w3` są globalne (`.w1.w1.w1.w1` = wycięcie W1) | nie używać ich jako nazw pomocniczych; sprawdzić `global.css` przed nadaniem klasy |
| Kropka osi wygląda jak pigułka | `.znacznik` jest klasą globalną | inna nazwa, np. `.punkt-osi` |
| Styl z atrybutu `style=` nie działa | CSP blokuje atrybut `style` w HTML | klasa CSS albo `element.style` z JS; klasy dodawane z JS stylować przez `:global()` |
| Panel `/keystatic` biały | CSP strony blokowała style panelu | `src/middleware.ts` usuwa CSP tylko w panelu |
| Logowanie do panelu: błąd 500 | brak 3 kluczy GitHub w sekretach Workera | dodać `KEYSTATIC_GITHUB_CLIENT_ID`, `..._SECRET`, `KEYSTATIC_SECRET` |
| `/realizacje/x` przekierowywało na `/realizacje/x/` | domyślna obsługa HTML w Cloudflare | `"html_handling": "drop-trailing-slash"` w `wrangler.jsonc` |
| `pattern` pola telefonu ignorowany w Chrome | Chrome kompiluje `pattern` z flagą `v` | escapować nawiasy i myślnik w klasie znaków; walidacja i tak w `strona.ts` sekcja 6 |
| `astro check` zawiesza budowanie | pyta o instalację pakietu | budować `npm run build`, bez `astro check` |
| Wysyłka z Workera: „IP not authorized” (Brevo) | Brevo blokuje nieznane IP, Worker nie ma stałego IP | Brevo → Settings → Security → Authorized IPs → Deactivate for API |
| Wysokość sekcji z ruchem przewijania liczona źle | `.przewijane` ma `height: 300vh` | mierzyć z kontenera, nie z sekcji |
| Tabela polityki wychodziła poza ekran telefonu (26.11) | brak stylów `.dokument` | karta + `table { display: block; overflow-x: auto }`, tabela dostaje fokus, gdy się przewija |
| Karty swipe nieosiągalne klawiaturą (26.11, axe) | przewijany `<ul>` bez elementu z fokusem | `strona.ts`: `tabindex=0` na torze `.swipe`, tylko gdy się przewija |
| Testy po przebudowie dają 404 | `wrangler dev` serwuje stary `dist` po `npm run build` | po każdym buildzie zrestartować `wrangler dev` |
