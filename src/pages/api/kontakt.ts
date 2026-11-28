// POST /api/kontakt: formularz „Opisz projekt” (FormularzProjektu.astro). Zgłoszenie trafia mailem na kontakt@formakodu.pl.
import type { APIRoute } from 'astro';
import { obsluz, pole, opis, EMAIL, telefonOk } from '../../lib/formularz';
import { wyslijDoNas, potwierdzKlientowi } from '../../lib/wysylka';

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  obsluz(request, (fd) => {
    const d = { imie: pole(fd, 'imie', 80), email: pole(fd, 'email', 120), telefon: pole(fd, 'telefon', 20), opis: pole(fd, 'opis', 2000) };
    const bledy = [
      !d.imie && 'imie',
      !EMAIL.test(d.email) && 'email',
      !telefonOk(d.telefon) && 'telefon',
      !d.opis && 'opis',
    ].filter(Boolean) as string[];
    const skad = request.headers.get('referer') ?? '';
    return {
      bledy,
      wyslij: async (klucz) => {
        await wyslijDoNas(klucz, {
        temat: `Nowy projekt: ${d.imie}`,
        tekst: opis([['Imię', d.imie], ['E-mail', d.email], ['Telefon', d.telefon], ['Opis projektu', d.opis], ['Wysłano ze strony', skad]]),
        odpowiedzDo: { email: d.email, imie: d.imie },
        });
        await potwierdzKlientowi(klucz, { email: d.email, temat: 'Dostaliśmy Twoją wiadomość – Forma Kodu', co: 'Twoją wiadomość' });
      },
    };
  }, 'Dostaliśmy Twoją wiadomość. Odezwiemy się w ciągu 14 dni na podany adres e-mail.');
