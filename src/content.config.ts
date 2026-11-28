// Model treści Forma Kodu (Astro content layer).
// Źródło pól: brama/pola-cms-27-29.md + uzupełnienia z PLAN-WDROZENIA-PRAWO-CMS-SEO.md, rozdz. 2.3.
// Ten sam schemat musi być w keystatic.config.ts (panel Keystatic). Zmiana w jednym = zmiana w drugim.
// [Pamięć] import `z` z 'astro/zod' — sprawdź w docs.astro.build/en/guides/content-collections dla zainstalowanej wersji.
import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const ZASLEPKA = /\[[^\]]+\]/;
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\[data\]$|^\{\{[a-z0-9_]+\}\}$/, 'Data w formacie RRRR-MM-DD');

const firma = defineCollection({
  loader: file('src/content/ustawienia/firma.json', { parser: (t) => [{ id: 'firma', ...JSON.parse(t) }] }),
  schema: z.object({
    nazwa_marki: z.literal('Forma Kodu'),
    nazwa_prawna: z.string(),
    forma_prawna: z.string(),
    nip: z.string(),
    regon: z.string().optional(),
    krs: z.string().optional(),
    sad_rejestrowy: z.string().optional(),
    kapital_zakladowy: z.string().optional(),
    adres: z.object({ ulica: z.string(), kod: z.string(), miasto: z.string(), kraj: z.string() }),
    adres_publiczny: z.boolean(), // decyzja 9B: true = adres biura w stopce, JSON-LD i Profilu Firmy w Google
    godziny_otwarcia: z.array(z.string()), // format schema.org openingHours, np. "Mo-Fr 09:00-17:00"; takie same jak w Profilu Firmy
    wspolrzedne: z.object({ lat: z.string(), lng: z.string() }).optional(),
    email: z.string(),
    email_dane_osobowe: z.string(),
    telefon: z.string(),
    domena: z.string(),
    obszar_dzialania: z.array(z.string()),
    rok_zalozenia: z.string(),
    profile: z.record(z.string(), z.string()),
    dostepnosc: z.object({ osoba_kontaktowa: z.string(), metoda_oceny: z.string(), czas_odpowiedzi_dni: z.string() }),
    przetwarzanie: z.object({ hosting: z.string(), poczta_formularz: z.string(), narzedzie_zgloszen: z.string() }),
  }),
});

const seoGlobalne = defineCollection({
  loader: file('src/content/ustawienia/seo-globalne.json', { parser: (t) => [{ id: 'seo', ...JSON.parse(t) }] }),
  schema: z.object({
    szablon_tytulu: z.string().includes('%s'),
    tytul_domyslny: z.string().max(70),
    opis_domyslny: z.string().max(160),
    og_obraz_domyslny: z.string(),
    og_obraz_alt: z.string(),
    jezyk: z.string(),
    slowa_kluczowe_marki: z.array(z.string()),
    indexnow_klucz: z.string(),
    // Decyzje 2C + 8C: GA4 ładowane wyłącznie po zgodzie (BanerZgod.astro). Format G-XXXXXXXXXX; zaślepka = baner i GA4 wyłączone.
    ga4_id: z.string(),
    ga4_retencja_miesiecy: z.enum(['2', '14']), // ustawienie w panelu GA4; musi zgadzać się z polityką §8
  }),
});

// Pola SEO każdej strony (uzupełnienie 2.3 pkt 1 i 8).
const seo = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/seo' }),
  schema: z.object({
    adres: z.string().startsWith('/'),
    seo_tytul: z.string().min(10).max(60),
    seo_opis: z.string().min(70).max(200), // 70–160 po podstawieniu cen: check:seo
    intencja: z.string(),
    og_obraz: z.string(),
    og_obraz_alt: z.string().min(1),
    noindex: z.boolean().default(false),
    canonical: z.string().optional(),
    aktualizacja: data,
    schema: z.array(z.string()),
  }),
});

// Dokumenty prawne (uzupełnienie 2.3 pkt 3).
const dokumenty = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/dokumenty' }),
  schema: z.object({
    tytul: z.string(),
    wersja: z.string(),
    obowiazuje_od: data,
    data_przegladu: data,
    zatwierdzone_przez_prawnika: z.boolean(),
  }),
});

// Kolekcje współdzielone (uzupełnienie 2.3 pkt 5): FAQ, realizacje, ceny; opinie jako ustawienia widżetów.
const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/faq' }),
  schema: z.object({
    pytanie: z.string().max(90),
    strony: z.array(z.enum(['glowna', 'strony-internetowe', 'automatyzacje', 'analiza-seo-geo', 'realizacje', 'pilotaze'])).min(1),
    kolejnosc: z.number().int().default(0),
    aktualizacja: data,
  }),
  // Treść odpowiedzi = ciało pliku .md (rt, limit 500 znaków sprawdza skrypt sprawdz-seo).
});

// Realizacje (Kacper 24.11, 31 S2): jedno źródło dla 27 S5, 28 S12, 29 S8, 31 S1. Wzór karty: designsolutions.pl.
const realizacje = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/realizacje' }),
  schema: ({ image }) =>
    z.object({
      naglowek: z.string().min(1).max(50),
      zdjecie_glowne: image(), // proporcję 2:1 sprawdza scripts/sprawdz-tresc.ts (w Astro 7 refine na image() widzi tylko ścieżkę, nie wymiary)
      zdjecie_alt: z.string().min(1).max(125), // walidacja nr 3
      opis: z.string().max(200),
      technologie: z.array(z.string().max(30)).default([]),
      miasto: z.string().max(40).optional(),
      data: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$|^\[RRRR-MM\]$/, 'Data RRRR-MM (zaślepka [RRRR-MM] blokuje publikację)'),
      link: z.string().url().optional(),
      kategoria: z.enum(['Strony', 'Automatyzacje', 'Aplikacje']),
      podkategoria: z.string().max(40).optional(), // etykieta na karcie, np. „Strona · rezerwacje” (makieta 31); puste = kategoria
      typ: z.enum(['klient', 'projekt własny', 'przykład układu']), // zasada stała 12
      status: z.enum(['w toku', 'gotowe']),
      wyrozniona: z.boolean().default(false),
      benefity: z.array(z.object({ tytul: z.string().max(50), opis: z.string().max(120), jak_sprawdzic: z.string().max(120) })).default([]),
      // Podstrona 31b. Treść „O projekcie” = ciało pliku .md.
      zakres: z.array(z.object({ tytul: z.string().max(40), opis: z.string().max(160) })).max(8).default([]),
      galeria: z.array(z.object({ obraz: image(), alt: z.string().min(1).max(125), podpis: z.string().max(120).optional() })).max(8).default([]),
      aktualizacja: data,
    }).refine((r) => r.typ === 'przykład układu' || r.zakres.length >= 2, { message: 'Zakres prac: co najmniej 2 pozycje (podstrona 31b)', path: ['zakres'] }),
});

// Opinie (decyzja 24.11, wariant B): tylko widżety; ustawienia w jednym pliku.
const opinieUstawienia = defineCollection({
  loader: file('src/content/ustawienia/opinie.json', { parser: (t) => [{ id: 'opinie', ...JSON.parse(t) }] }),
  schema: z.object({
    pokaz_segment: z.boolean().default(false),
    widzet_trustpilot: z.object({ business_unit_id: z.string().default(''), template_id: z.string().default('') }),
    widzet_google: z.object({ dostawca: z.string().default(''), skrypt_url: z.string().default(''), klasa_elementu: z.string().default('') }),
  }),
});

const ceny = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/ceny' }),
  schema: z.object({
    nazwa: z.string(),
    kwota_od: z.number().nullable(),
    kwota_do: z.number().nullable().optional(),
    waluta: z.literal('PLN'),
    netto: z.boolean(),
    okres: z.enum(['jednorazowo', 'miesięcznie', 'rocznie']),
    nasza_cena: z.boolean(), // false = „przykład z rynku”, nie trafia do JSON-LD Offer
    zrodlo: z.string().min(1), // walidacja nr 1
    data_odczytu: data,
  }),
});

// PRZYGOTOWANE, NIE WDROŻONE (Kacper 24.11): blog, case study, media o nas. Lustro src/keystatic/przygotowane.ts.
// Bez stron, menu, sitemap i llms.txt do decyzji o wdrożeniu (INSTRUKCJA, krok 14). „Dla mediów” czyta się przez Keystatic (src/lib/tresc.ts).
const liczbaZeZrodlem = z.object({ liczba: z.string().min(1), opis: z.string().max(160), zrodlo: z.string().min(1), url: z.string().nullable().optional(), data: z.string() });
const artykuly = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/artykuly' }),
  schema: ({ image }) => z.object({
    tytul: z.string().min(10).max(70),
    seo_opis: z.string().min(70).max(160),
    klaster: z.string(),
    krotka_odpowiedz: z.string().min(1).max(300),
    liczby: z.array(liczbaZeZrodlem).default([]),
    ograniczenia: z.string().default(''),
    zrodla: z.array(z.object({ nazwa: z.string(), url: z.string().nullable().optional(), data: z.string() })).default([]),
    autor: z.string().min(1),
    obraz: z.object({ plik: image().nullable().optional(), alt: z.string() }).optional(),
    powiazane_uslugi: z.array(z.string()).default([]),
    data_publikacji: data,
    aktualizacja: data,
    szkic: z.boolean().default(true),
  }),
});
const caseStudy = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/case-study' }),
  schema: ({ image }) => z.object({
    tytul: z.string().min(10).max(70),
    realizacja: z.string().nullable().optional(),
    klient: z.string().default(''),
    zgoda_klienta: z.boolean(),
    branza: z.string().max(40).default(''),
    problem: z.string().min(1).max(300),
    rozwiazanie: z.string().min(1).max(400),
    wyniki: z.array(liczbaZeZrodlem).default([]),
    czas_realizacji: z.string().default(''),
    cytat: z.string().max(300).default(''),
    cytat_autor: z.string().default(''),
    obraz: z.object({ plik: image().nullable().optional(), alt: z.string() }).optional(),
    data_publikacji: data,
    aktualizacja: data,
    szkic: z.boolean().default(true),
  }).refine((c) => c.szkic || c.zgoda_klienta, { message: 'Case study bez zgody klienta nie może być opublikowane' }),
});
const mediaONas = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/media-o-nas' }),
  schema: z.object({
    tytul: z.string(),
    medium: z.string().min(1),
    typ: z.enum(['artykuł', 'wywiad', 'podcast', 'wideo', 'wzmianka']),
    link: z.string().url(),
    data: data,
    cytat: z.string().max(300).default(''),
    szkic: z.boolean().default(true),
  }),
});

export const collections = { firma, seoGlobalne, seo, dokumenty, faq, realizacje, opinieUstawienia, ceny, artykuly, caseStudy, mediaONas };
export { ZASLEPKA };
