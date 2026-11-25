// POST /api/powiadom: „Powiadom mnie” (FormularzPowiadom.astro). Zgoda osobna i niezaznaczona (decyzja 6B, §10 polityki).
// Adres trafia na listę w Brevo (gdy USTAWIENIA.listaPowiadom jest ustawione), a do nas mail z treścią i wersją zgody: to nasz zapis zgody.
import type { APIRoute } from 'astro';
import { obsluz, pole, opis, EMAIL } from '../../lib/formularz';
import { wyslijDoNas, zapiszNaListe } from '../../lib/wysylka';

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  obsluz(request, (fd) => {
    const d = { email: pole(fd, 'email', 120), usluga: pole(fd, 'usluga', 120), zgoda: pole(fd, 'zgoda_powiadomienie', 10), wersja: pole(fd, 'zgoda_wersja', 40) };
    const bledy = [!EMAIL.test(d.email) && 'email', d.zgoda !== 'tak' && 'zgoda_powiadomienie'].filter(Boolean) as string[];
    return {
      bledy,
      wyslij: async (klucz) => {
        await zapiszNaListe(klucz, d.email);
        await wyslijDoNas(klucz, {
          temat: `Powiadom mnie: ${d.usluga || 'usługa'}`,
          tekst: opis([['E-mail', d.email], ['Usługa', d.usluga], ['Zgoda', 'tak (pole niezaznaczone domyślnie)'], ['Wersja treści zgody', d.wersja], ['Czas', new Date().toISOString()]]),
          odpowiedzDo: { email: d.email },
        });
      },
    };
  }, 'Zapisane. Wyślemy jedną wiadomość, gdy usługa ruszy.');
