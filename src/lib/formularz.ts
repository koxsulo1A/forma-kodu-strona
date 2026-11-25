// Wspólna obsługa formularzy po stronie serwera (Worker Cloudflare): te same zasady co w przeglądarce (strona.ts, sekcja 6).
// Przeglądarka z JS wysyła nagłówek Accept: application/json i dostaje JSON. Bez JS formularz wysyła się zwykle
// i dostaje prostą stronę z podziękowaniem albo błędem.
import { env } from 'cloudflare:workers';
import { BladWysylki } from './wysylka';

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const telefonOk = (v: string) => /^[+0-9 ()-]{9,20}$/.test(v) && v.replace(/\D/g, '').length >= 9;
const MAKS_BAJTOW = 20_000;

export const pole = (fd: FormData, nazwa: string, maks: number) => {
  const v = fd.get(nazwa);
  return typeof v === 'string' ? v.trim().slice(0, maks) : '';
};
export const wiele = (fd: FormData, nazwa: string, maks: number) =>
  fd.getAll(nazwa).filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, maks)).filter(Boolean).slice(0, 20);

const strona = (tytul: string, tresc: string, status: number) =>
  new Response(
    `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${tytul} | Forma Kodu</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px;line-height:1.5"><h1>${tytul}</h1><p>${tresc}</p><p><a href="/">Wróć na stronę główną</a></p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  );

type Przetworz = (fd: FormData) => { bledy: string[]; wyslij: (klucz: string) => Promise<void> };

export async function obsluz(request: Request, przetworz: Przetworz, sukces: string): Promise<Response> {
  const json = (request.headers.get('accept') ?? '').includes('application/json');
  const odpowiedz = (status: number, dane: Record<string, unknown>, tytul: string, tresc: string) =>
    json
      ? new Response(JSON.stringify(dane), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
      : strona(tytul, tresc, status);

  // Formularz wysyła się tylko z naszej strony (ochrona przed wysyłką z obcych witryn).
  const zrodlo = request.headers.get('origin');
  if (zrodlo && zrodlo !== new URL(request.url).origin) return odpowiedz(403, { ok: false }, 'Nie wysłano', 'Formularz można wysłać tylko z naszej strony.');
  if (Number(request.headers.get('content-length') ?? 0) > MAKS_BAJTOW) return odpowiedz(413, { ok: false }, 'Za długa wiadomość', 'Skróć opis i spróbuj ponownie.');

  let fd: FormData;
  try { fd = await request.formData(); } catch { return odpowiedz(400, { ok: false }, 'Nie wysłano', 'Formularz dotarł niekompletny. Spróbuj ponownie.'); }

  // Ukryte pole wypełniają tylko boty: udajemy sukces i nic nie wysyłamy.
  if (pole(fd, 'strona_www', 200)) return odpowiedz(200, { ok: true }, 'Dziękujemy', sukces);

  const { bledy, wyslij } = przetworz(fd);
  if (bledy.length) return odpowiedz(400, { ok: false, pola: bledy }, 'Sprawdź formularz', 'Brakuje danych albo mają zły format. Wróć i popraw pola formularza.');

  const klucz = (env as Record<string, string | undefined>).BREVO_API_KEY;
  if (!klucz) {
    console.error('Formularz: brak sekretu BREVO_API_KEY');
    return odpowiedz(503, { ok: false }, 'Chwilowa przerwa', 'Formularz jeszcze nie działa. Napisz do nas: kontakt@formakodu.pl.');
  }
  try {
    await wyslij(klucz);
  } catch (e) {
    console.error('Formularz: błąd wysyłki', e instanceof BladWysylki ? `${e.status} ${e.tresc}` : e);
    return odpowiedz(502, { ok: false }, 'Nie wysłano', 'Nie udało się wysłać. Spróbuj ponownie za chwilę albo napisz do nas: kontakt@formakodu.pl.');
  }
  return odpowiedz(200, { ok: true }, 'Dziękujemy', sukces);
}

/** Tekst maila: pary „Etykieta: wartość”, puste pomijamy. */
export const opis = (pary: [string, string | string[]][]) =>
  pary
    .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
