// POST /api/pilotaz: zgłoszenie na pilotaż (pilotaze/S6Formularz.astro). Zgłoszenie trafia mailem na kontakt@formakodu.pl.
import type { APIRoute } from 'astro';
import { obsluz, pole, wiele, opis, EMAIL, telefonOk } from '../../lib/formularz';
import { wyslijDoNas, potwierdzKlientowi } from '../../lib/wysylka';

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  obsluz(request, (fd) => {
    const d = {
      rodzaj: pole(fd, 'rodzaj', 120),
      opis: pole(fd, 'opis', 2000),
      technologie: [...wiele(fd, 'technologie', 80), pole(fd, 'technologie_inne', 200)].filter(Boolean),
      wymagania: [...wiele(fd, 'wymagania', 80), pole(fd, 'wymagania_inne', 200)].filter(Boolean),
      imie: pole(fd, 'imie', 80),
      email: pole(fd, 'email', 120),
      telefon: pole(fd, 'telefon', 20),
      kontakt: pole(fd, 'kontakt', 20),
      godziny: wiele(fd, 'godziny', 40),
    };
    const bledy = [
      !d.rodzaj && 'rodzaj',
      !d.imie && 'imie',
      !EMAIL.test(d.email) && 'email',
      !telefonOk(d.telefon) && 'telefon',
      !d.kontakt && 'kontakt',
    ].filter(Boolean) as string[];
    return {
      bledy,
      wyslij: async (klucz) => {
        await wyslijDoNas(klucz, {
        temat: `Zgłoszenie na pilotaż: ${d.rodzaj} (${d.imie})`,
        tekst: opis([
          ['Rodzaj projektu', d.rodzaj], ['Opis', d.opis], ['Technologie', d.technologie], ['Wymagania', d.wymagania],
          ['Imię', d.imie], ['E-mail', d.email], ['Telefon', d.telefon], ['Preferowany kontakt', d.kontakt], ['Godziny telefonu', d.godziny],
        ]),
        odpowiedzDo: { email: d.email, imie: d.imie },
        });
        await potwierdzKlientowi(klucz, { email: d.email, temat: 'Dostaliśmy Twoje zgłoszenie na pilotaż – Forma Kodu', co: 'Twoje zgłoszenie na pilotaż' });
      },
    };
  }, 'Dostaliśmy Twoje zgłoszenie na pilotaż. Odezwiemy się w ciągu 14 dni w sposób, który wybrałeś.');
