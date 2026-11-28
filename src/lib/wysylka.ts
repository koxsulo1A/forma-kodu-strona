// Jedyny moduł, który rozmawia z Brevo (decyzja A3, 24.11.2026: Brevo na start, później własne oprogramowanie).
// Przy zmianie dostawcy wymieniamy tylko ten plik; adresy /api/* i formularze zostają bez zmian.
// Klucz API: sekret Cloudflare BREVO_API_KEY (Workers & Pages → forma-kodu-strona → Settings → Variables and Secrets).
// Nigdy w repozytorium. Instrukcja: /mnt/project-files/forma-kodu-strona/FORMULARZE-WORKER-BREVO.md
// [Oficjalne] developers.brevo.com: POST /v3/smtp/email, POST /v3/contacts, POST /v3/contacts/doubleOptinConfirmation.

export const USTAWIENIA = {
  // Skrzynka, na którą trafiają zgłoszenia (dane firmy, Kacper 25.11).
  odbiorca: 'kontakt@formakodu.pl',
  // Nadawca musi być dodany i zweryfikowany w Brevo (Senders), a domena formakodu.pl uwierzytelniona (DNS).
  nadawca: { name: 'Forma Kodu – formularz strony', email: 'kontakt@formakodu.pl' },
  // ID listy „Powiadom mnie” z Brevo (Contacts → Lists). 0 = lista jeszcze nie ustawiona: zapis trafia tylko mailem do nas.
  listaPowiadom: 3,
  // ID szablonu potwierdzenia (double opt-in). 0 = zapis na listę od razu, bez linku potwierdzającego.
  szablonDoi: 0,
  adresPoPotwierdzeniu: 'https://formakodu.pl/',
};

const API = 'https://api.brevo.com/v3';

export class BladWysylki extends Error {
  constructor(public status: number, public tresc: string) { super(`Brevo ${status}: ${tresc}`); }
}

async function zapytanie(klucz: string, sciezka: string, dane: unknown) {
  const odp = await fetch(`${API}${sciezka}`, {
    method: 'POST',
    headers: { 'api-key': klucz, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(dane),
  });
  if (!odp.ok) throw new BladWysylki(odp.status, (await odp.text().catch(() => '')).slice(0, 300));
}

/** Wiadomość do nas. „Odpowiedz” w skrzynce trafia od razu do klienta (replyTo). */
export async function wyslijDoNas(klucz: string, w: { temat: string; tekst: string; odpowiedzDo: { email: string; imie?: string } }) {
  await zapytanie(klucz, '/smtp/email', {
    sender: USTAWIENIA.nadawca,
    to: [{ email: USTAWIENIA.odbiorca }],
    replyTo: { email: w.odpowiedzDo.email, ...(w.odpowiedzDo.imie ? { name: w.odpowiedzDo.imie } : {}) },
    subject: w.temat,
    textContent: w.tekst,
  });
}

/** Termin odpowiedzi podawany klientowi w potwierdzeniu (Kacper 28.11.2026). */
export const TERMIN_ODPOWIEDZI = 'w ciągu 14 dni';

/**
 * Automatyczne potwierdzenie dla klienta (Kacper 28.11.2026). Celowo bez treści wpisanych w formularz
 * (ani imienia, ani opisu): ktoś mógłby wpisać cudzy adres i użyć naszego formularza do wysyłki własnego tekstu.
 * Błąd potwierdzenia nie psuje zgłoszenia: wiadomość do nas już poszła, więc tylko go pomijamy.
 */
export async function potwierdzKlientowi(klucz: string, w: { email: string; temat: string; co: string }) {
  try {
    await zapytanie(klucz, '/smtp/email', {
      sender: { name: 'Forma Kodu', email: USTAWIENIA.nadawca.email },
      to: [{ email: w.email }],
      replyTo: { email: USTAWIENIA.odbiorca, name: 'Forma Kodu' },
      subject: w.temat,
      textContent: [
        'Dzień dobry,',
        '',
        `dostaliśmy ${w.co} ze strony formakodu.pl. Odezwiemy się ${TERMIN_ODPOWIEDZI}.`,
        '',
        'Jeśli chcesz coś dodać, po prostu odpowiedz na tę wiadomość.',
        '',
        'Kacper',
        'Forma Kodu',
        USTAWIENIA.odbiorca,
        '',
        'Ta wiadomość została wysłana automatycznie, bo ktoś podał ten adres w formularzu na stronie formakodu.pl. Jeśli to nie Ty, zignoruj ją.',
      ].join('\n'),
    });
  } catch { /* zgłoszenie dotarło do nas; brak potwierdzenia nie jest błędem dla klienta */ }
}

/** Zapis na listę „Powiadom mnie”. Bez ustawionej listy nic nie robi (zgłoszenie i tak przychodzi mailem). */
export async function zapiszNaListe(klucz: string, email: string) {
  if (!USTAWIENIA.listaPowiadom) return;
  if (USTAWIENIA.szablonDoi) {
    await zapytanie(klucz, '/contacts/doubleOptinConfirmation', {
      email,
      includeListIds: [USTAWIENIA.listaPowiadom],
      templateId: USTAWIENIA.szablonDoi,
      redirectionUrl: USTAWIENIA.adresPoPotwierdzeniu,
    });
  } else {
    await zapytanie(klucz, '/contacts', { email, listIds: [USTAWIENIA.listaPowiadom], updateEnabled: true });
  }
}
