// Arkusz nazw View Transitions dla realizacji: zdjęcie karty ↔ zdjęcie w hero podstrony 31b.
// Dlaczego plik, a nie transition:name: Astro (7.4) wstawia style transition:name jako <style> bez hasha w CSP,
// więc przeglądarka je blokuje (test 24.11: 6 błędów CSP). Zwykły arkusz z 'self' przechodzi bez wyjątków w CSP.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;
export const GET: APIRoute = async () => {
  const realizacje = await getCollection('realizacje');
  const css = realizacje
    .filter((r) => /^[a-z0-9-]+$/.test(r.id))
    .map((r) => `[data-vt="${r.id}"]{view-transition-name:realizacja-${r.id}}`)
    .join('\n');
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
};
