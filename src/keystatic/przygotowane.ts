// PRZYGOTOWANE, NIE WDROŻONE (Kacper 24.11.2026): blog (strony i AI), „Dla mediów”, „Media o nas”, case study.
// Jest tylko model treści (panel + walidacja). NIE MA stron, linków w menu, wpisów w sitemap ani llms.txt.
// Wdrożenie później: patrz INSTRUKCJA, krok 14. Lustro w src/content.config.ts (Zod).
// Pola bloga według researchu (TL;DR, liczby ze źródłem, ograniczenia, źródła) i zasad stałych 8–13 skilla strona-od-a-do-z.
import { fields, collection, singleton } from '@keystatic/core';

const data = (label: string) =>
  fields.text({ label: `${label} (RRRR-MM-DD)`, validation: { pattern: { regex: /^\d{4}-\d{2}-\d{2}$|^\[data\]$|^$/, message: 'RRRR-MM-DD' } } });
const szkic = () => fields.checkbox({ label: 'Szkic (nie publikuj)', defaultValue: true });
const liczbaZeZrodlem = () =>
  fields.array(
    fields.object({
      liczba: fields.text({ label: 'Liczba (np. 72%)', validation: { length: { min: 1 } } }),
      opis: fields.text({ label: 'Co oznacza', validation: { length: { min: 1, max: 160 } } }),
      zrodlo: fields.text({ label: 'Źródło (nazwa)', validation: { length: { min: 1 } } }),
      url: fields.url({ label: 'Link do źródła' }),
      data: data('Data pomiaru'),
    }),
    { label: 'Liczby ze źródłem (zasada 9: każda liczba ma źródło i datę)', itemLabel: (p) => p.fields.liczba.value || 'liczba' },
  );
const obraz = (dir: string) =>
  fields.object({
    plik: fields.image({ label: 'Obraz', directory: `src/assets/${dir}`, publicPath: `../../assets/${dir}/` }),
    alt: fields.text({ label: 'Opis obrazu (alt)', validation: { length: { max: 125 } } }),
  }, { label: 'Obraz główny' });

export const przygotowaneKolekcje = {
  artykuly: collection({
    label: 'Blog: artykuły (przygotowane, bez stron)',
    path: 'src/content/artykuly/*',
    slugField: 'tytul',
    format: { contentField: 'tresc' },
    entryLayout: 'content',
    columns: ['tytul', 'data_publikacji'],
    schema: {
      tytul: fields.slug({ name: { label: 'Tytuł = pytanie czytelnika (H1, ≤ 70)', validation: { length: { min: 10, max: 70 } } } }),
      seo_opis: fields.text({ label: 'Opis w Google (70–160)', multiline: true, validation: { length: { min: 70, max: 160 } } }),
      klaster: fields.select({
        label: 'Temat (klaster)',
        options: ['Strony internetowe', 'SEO i GEO', 'AI w firmie', 'Automatyzacje', 'Dostępność', 'Prawo i RODO na stronie'].map((v) => ({ label: v, value: v })),
        defaultValue: 'Strony internetowe',
      }),
      krotka_odpowiedz: fields.text({ label: 'Krótka odpowiedź na górze (TL;DR, ≤ 300): odpowiedź na pytanie z tytułu', multiline: true, validation: { length: { min: 1, max: 300 } } }),
      liczby: liczbaZeZrodlem(),
      ograniczenia: fields.text({ label: 'Ograniczenia: czego ten tekst nie mówi / kiedy rada nie działa', multiline: true }),
      zrodla: fields.array(fields.object({ nazwa: fields.text({ label: 'Nazwa' }), url: fields.url({ label: 'Link' }), data: data('Data odczytu') }), { label: 'Źródła', itemLabel: (p) => p.fields.nazwa.value || 'źródło' }),
      autor: fields.text({ label: 'Autor (prawdziwa osoba, zasada 12)', validation: { length: { min: 1 } } }),
      obraz: obraz('artykuly'),
      powiazane_uslugi: fields.multiselect({ label: 'Powiązane usługi (linki wewnętrzne)', options: ['strony-internetowe', 'automatyzacje', 'analiza-seo-geo', 'pilotaze'].map((v) => ({ label: v, value: v })) }),
      data_publikacji: data('Data publikacji'),
      aktualizacja: data('Data aktualizacji (tylko przy prawdziwej zmianie)'),
      szkic: szkic(),
      tresc: fields.markdoc({ label: 'Treść: śródtytuły H2 jako pytania, pod każdym najpierw odpowiedź', extension: 'md' }),
    },
  }),
  caseStudy: collection({
    label: 'Case study (przygotowane, bez stron)',
    path: 'src/content/case-study/*',
    slugField: 'tytul',
    format: { contentField: 'tresc' },
    entryLayout: 'content',
    schema: {
      tytul: fields.slug({ name: { label: 'Tytuł (≤ 70)', validation: { length: { min: 10, max: 70 } } } }),
      realizacja: fields.relationship({ label: 'Realizacja z kolekcji „Realizacje”', collection: 'realizacje' }),
      klient: fields.text({ label: 'Klient (nazwa za jego zgodą)' }),
      zgoda_klienta: fields.checkbox({ label: 'Klient zgodził się na publikację (wymagane przed publikacją)', defaultValue: false }),
      branza: fields.text({ label: 'Branża', validation: { length: { max: 40 } } }),
      problem: fields.text({ label: 'Problem klienta (1–2 zdania)', multiline: true, validation: { length: { min: 1, max: 300 } } }),
      rozwiazanie: fields.text({ label: 'Co zrobiliśmy (1–3 zdania)', multiline: true, validation: { length: { min: 1, max: 400 } } }),
      wyniki: liczbaZeZrodlem(),
      czas_realizacji: fields.text({ label: 'Czas realizacji (np. 6 tygodni)' }),
      cytat: fields.text({ label: 'Cytat klienta (dosłownie, za zgodą)', multiline: true, validation: { length: { max: 300 } } }),
      cytat_autor: fields.text({ label: 'Autor cytatu (imię, nazwisko, funkcja)' }),
      obraz: obraz('case-study'),
      data_publikacji: data('Data publikacji'),
      aktualizacja: data('Data aktualizacji'),
      szkic: szkic(),
      tresc: fields.markdoc({ label: 'Pełny opis', extension: 'md' }),
    },
  }),
  mediaONas: collection({
    label: 'Media o nas (przygotowane, bez stron)',
    path: 'src/content/media-o-nas/*',
    slugField: 'tytul',
    format: { data: 'json' },
    schema: {
      tytul: fields.slug({ name: { label: 'Tytuł publikacji (dosłownie)' } }),
      medium: fields.text({ label: 'Medium (portal, gazeta, podcast)', validation: { length: { min: 1 } } }),
      typ: fields.select({ label: 'Typ', options: ['artykuł', 'wywiad', 'podcast', 'wideo', 'wzmianka'].map((v) => ({ label: v, value: v })), defaultValue: 'artykuł' }),
      link: fields.url({ label: 'Link (wymagany: bez linku nie publikujemy)', validation: { isRequired: true } }),
      data: data('Data publikacji'),
      cytat: fields.text({ label: 'Krótki cytat (≤ 300, dosłownie)', multiline: true, validation: { length: { max: 300 } } }),
      szkic: szkic(),
    },
  }),
};

export const przygotowaneSingletony = {
  dlaMediow: singleton({
    label: 'Dla mediów (przygotowane, bez strony)',
    path: 'src/content/strony/dla-mediow',
    format: { data: 'json' },
    schema: {
      notka_krotka: fields.text({ label: 'Notka o firmie, krótka (≤ 300)', multiline: true, validation: { length: { max: 300 } } }),
      notka_dluga: fields.text({ label: 'Notka o firmie, długa (≤ 1200)', multiline: true, validation: { length: { max: 1200 } } }),
      fakty: fields.array(fields.object({ fakt: fields.text({ label: 'Fakt' }), zrodlo: fields.text({ label: 'Źródło / stan na dzień' }) }), { label: 'Fakty o firmie (rok założenia, liczba projektów itd.)', itemLabel: (p) => p.fields.fakt.value || 'fakt' }),
      kontakt_imie: fields.text({ label: 'Kontakt dla mediów: osoba' }),
      kontakt_email: fields.text({ label: 'Kontakt dla mediów: e-mail' }),
      kontakt_telefon: fields.text({ label: 'Kontakt dla mediów: telefon' }),
      materialy: fields.array(fields.object({
        nazwa: fields.text({ label: 'Nazwa (np. Logo SVG, zdjęcie zespołu)' }),
        plik: fields.file({ label: 'Plik', directory: 'public/media', publicPath: '/media/' }),
        licencja: fields.text({ label: 'Zasady użycia' }),
      }), { label: 'Materiały do pobrania', itemLabel: (p) => p.fields.nazwa.value || 'materiał' }),
      aktualizacja: data('Data aktualizacji'),
    },
  }),
};
