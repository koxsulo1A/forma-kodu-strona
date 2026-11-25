import { defineMiddleware } from 'astro:middleware';

// Panel Keystatic (/keystatic) to aplikacja React, która wstrzykuje style w locie i ładuje fonty z Google.
// CSP strony (security.csp w astro.config, meta z hashami) blokuje te style, więc panel był pustą białą stroną (test 25.11).
// Dlatego tylko w panelu usuwamy CSP (meta i nagłówek). Panel jest poza wyszukiwarkami (noindex) i wymaga logowania GitHub.
// Strony publiczne (prerenderowane) middleware nie dotyczy w czasie działania, więc ich CSP zostaje bez zmian.
const META_CSP = /<meta http-equiv="content-security-policy"[^>]*>/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const odpowiedz = await next();
  if (!context.url.pathname.startsWith('/keystatic')) return odpowiedz;
  if (!(odpowiedz.headers.get('content-type') ?? '').includes('text/html')) return odpowiedz;
  const html = (await odpowiedz.text()).replace(META_CSP, '');
  const naglowki = new Headers(odpowiedz.headers);
  naglowki.delete('content-length');
  naglowki.delete('content-security-policy'); // na stronach z serwera Astro wysyła CSP jako nagłówek
  naglowki.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(html, { status: odpowiedz.status, statusText: odpowiedz.statusText, headers: naglowki });
});
