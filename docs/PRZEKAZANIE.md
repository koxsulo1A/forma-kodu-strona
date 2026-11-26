# Przekazanie: jak utrzymywać stronę

## Panel treści

1. Wejdź na `https://formakodu.pl/keystatic` (do czasu publikacji: adres workers.dev) i zaloguj się kontem GitHub z dostępem do repozytorium.
2. Zmień treść i kliknij **Save**. Zapis tworzy commit w `main`, a Cloudflare sam przebuduje stronę (zwykle 1–3 minuty).

## Najczęstsze zmiany

| Co | Gdzie | Uwaga |
|--|--|--|
| Nowa realizacja | panel → Realizacje → Add | wybierz uczciwy **typ** (klient / projekt własny / przykład układu); bez zgody klienta nie pokazuj jego nazwy |
| Cena | panel → Ceny | kwota zawsze ze **źródłem i datą** (zasada 9), inaczej budowanie się zatrzyma |
| Dane firmy (NIP po założeniu JDG, rok, profile) | panel → Ustawienia → Dane firmy | jedno miejsce zasila stopkę, politykę i JSON-LD; ten sam zapis wpisz w Profilu Firmy w Google, LinkedIn itd. |
| Data aktualizacji | pole „aktualizacja” przy treści | zmieniaj tylko przy **prawdziwej** zmianie treści |
| Data pierwszej publikacji | `npm run ustaw-date -- RRRR-MM-DD` | jednorazowo, w dniu publikacji |

## Przeglądy

- **Co kwartał:** `npm run przeglad` (treści starsze niż 90 dni), ceny i daty.
- **W ciągu 3 miesięcy od startu:** przegląd polityki prywatności, klauzul i oświadczenia o dostępności przez prawnika (decyzja 14B), potem w panelu „zatwierdzone przez prawnika”.
- **Profile zewnętrzne do ujednolicenia** (zasada 11): Profil Firmy w Google, LinkedIn, Facebook, GitHub, Trustpilot – nazwa „Kacper Przychodzień Centrum usług”, adres „ul. Prądzyńskiego 3, 50-434 Wrocław”, e-mail `kontakt@formakodu.pl`, co do znaku jak w stopce.

## Zmiana dostawcy wysyłki (Brevo → własne narzędzie)

1. Wymień tylko `src/lib/wysylka.ts` (te same funkcje: `wyslijDoNas`, `zapiszNaListe`).
2. Zmień politykę prywatności §3 (kto dostaje dane).
3. Wyeksportuj listę „Powiadom mnie” z Brevo i usuń ją tam.
