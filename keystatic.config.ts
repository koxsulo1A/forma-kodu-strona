// Panel treści Keystatic (decyzja Kacpra 24.11.2026: Keystatic zamiast Decap i zamiast D-587 WordPress).
// Dane firmy, SEO, dokumenty i kolekcje wspólne: lustro src/content.config.ts (Zod). Zmiana pola w jednym pliku = zmiana w drugim.
// Segmenty stron 27–32 (hero, oferta itd.): src/keystatic/strony.ts, jedyne źródło schematu (odczyt przez src/lib/tresc.ts).
// Pliki zostają w repozytorium (JSON i Markdown), Astro czyta je jak dotąd przez content collections; Keystatic tylko je edytuje.
// Źródła [Oficjalne, odczyt 24.11.2026]: keystatic.com/docs/installation-astro, /docs/github-mode, /docs/cloud.
//
// Tryb zapisu:
//  - lokalnie (npm run dev): 'local' → zapis prosto do plików, commit robisz sam;
//  - na produkcji: 'github' → logowanie kontem GitHub z prawem zapisu do repozytorium, zapis = commit (darmowe);
//    alternatywa 'cloud' (Keystatic Cloud, darmowe do 3 osób w zespole, redaktor bez konta GitHub) — dla stron klientów.
import { config, fields, singleton, collection } from '@keystatic/core';
import { strony } from './src/keystatic/strony';
import { przygotowaneKolekcje, przygotowaneSingletony } from './src/keystatic/przygotowane';

// import.meta.env istnieje w Astro/Vite; poza nim (np. skrypt testowy w Node) przyjmujemy tryb lokalny.
const PRODUKCJA = Boolean(import.meta.env?.PROD);
const REPO = 'koxsulo1A/forma-kodu-strona' as const; // repozytorium strony (25.11)

// Daty jako tekst RRRR-MM-DD, bo do etapu E6 w plikach są zaślepki „[data]” (blokuje je sprawdz-zaslepki).
// Po uzupełnieniu danych można zamienić na fields.date (zapisuje ten sam format).
const data = (label: string) =>
  fields.text({ label, description: 'RRRR-MM-DD. Zmieniaj tylko przy prawdziwej zmianie treści (zasada stała 13).', validation: { pattern: { regex: /^\d{4}-\d{2}-\d{2}$|^\[data\]$/, message: 'Format RRRR-MM-DD' } } });
const limit = (label: string, min: number, max: number, multiline = false) =>
  fields.text({ label, multiline, validation: { length: { min, max } } });

// Pola SEO jednej strony (uzupełnienie 2.3 pkt 1 i 8). Każda strona = osobny „singleton” (stały zestaw 8 stron, bez dodawania/usuwania).
const polaSeo = {
  adres: fields.text({ label: 'Adres strony', description: 'Nie zmieniaj bez przekierowania 301', validation: { pattern: { regex: /^\//, message: 'Zaczyna się od /' } } }),
  seo_tytul: limit('Tytuł w Google (10–60 znaków)', 10, 60),
  // Limit 200, bo znacznik ceny {{kwota:…}} jest dłuższy niż kwota; właściwe 70–160 po podstawieniu sprawdza check:seo na gotowym HTML.
  seo_opis: limit('Opis w Google (70–160 znaków po podstawieniu cen)', 70, 200, true),
  intencja: fields.text({ label: 'Pytanie klienta, na które odpowiada strona (= H1)' }),
  og_obraz: fields.text({ label: 'Obraz udostępniania 1200×630 (ścieżka w /og/)', validation: { pattern: { regex: /^\/og\/.+\.(png|jpg)$/, message: '/og/nazwa.png' } } }),
  og_obraz_alt: fields.text({ label: 'Opis obrazu udostępniania', validation: { length: { min: 1 } } }),
  noindex: fields.checkbox({ label: 'Ukryj przed wyszukiwarkami (noindex)', defaultValue: false }),
  canonical: fields.text({ label: 'Adres kanoniczny (zostaw puste)' }),
  aktualizacja: data('Data aktualizacji (widoczna na stronie, w JSON-LD i w sitemap)'),
  schema: fields.multiselect({
    label: 'Typy danych strukturalnych',
    options: ['WebSite', 'Organization', 'ProfessionalService', 'Service', 'FAQPage', 'BreadcrumbList', 'CollectionPage', 'WebPage'].map((v) => ({ label: v, value: v })),
  }),
};
const STRONY = {
  glowna: 'Strona główna',
  'strony-internetowe': 'Strony internetowe',
  automatyzacje: 'Automatyzacje',
  'analiza-seo-geo': 'Analiza SEO/GEO',
  realizacje: 'Realizacje',
  pilotaze: 'Pilotaże',
  'polityka-prywatnosci': 'Polityka prywatności',
  dostepnosc: 'Dostępność',
  kontakt: 'Kontakt (formularz „Opisz projekt” bez JS)',
} as const;
const singletonySeo = Object.fromEntries(
  Object.entries(STRONY).map(([id, nazwa]) => [
    `seo-${id}`,
    singleton({ label: `SEO: ${nazwa}`, path: `src/content/seo/${id}`, format: { data: 'json' }, schema: polaSeo }),
  ]),
);

const dokument = (id: string, label: string) =>
  singleton({
    label,
    path: `src/content/dokumenty/${id}`,
    format: { contentField: 'tresc' },
    entryLayout: 'content',
    schema: {
      tytul: fields.text({ label: 'Tytuł' }),
      wersja: fields.text({ label: 'Wersja (np. 1.1)' }),
      obowiazuje_od: data('Obowiązuje od'),
      data_przegladu: data('Data ostatniego przeglądu'),
      zatwierdzone_przez_prawnika: fields.checkbox({ label: 'Zatwierdzone przez prawnika (decyzja 14B: zaznacz dopiero po przeglądzie)', defaultValue: false }),
      tresc: fields.markdoc({ label: 'Treść', extension: 'md' }),
    },
  });

export default config({
  storage: PRODUKCJA ? { kind: 'github', repo: REPO } : { kind: 'local' },
  locale: 'pl-PL',
  ui: {
    brand: { name: 'Forma Kodu' },
    navigation: {
      'Treść stron': Object.keys(strony),
      'Dane firmy i ustawienia': ['firma', 'seoGlobalne'],
      'SEO stron': Object.keys(singletonySeo),
      'Dokumenty prawne': ['politykaPrywatnosci', 'dostepnosc'],
      'Treści wspólne': ['faq', 'realizacje', 'ceny', 'opinieUstawienia'],
      'Przygotowane (jeszcze bez stron)': ['artykuly', 'caseStudy', 'mediaONas', 'dlaMediow'],
    },
  },
  singletons: {
    firma: singleton({
      // Jedno źródło danych firmy (zasada stała 11). Uzupełnić na końcu (E6); każda zaślepka [..] blokuje publikację.
      // Decyzja 9B: adres biura publiczny, identyczny jak w Profilu Firmy w Google co do znaku. Plik JSON nie może mieć innych kluczy niż te pola.
      label: 'Dane firmy (jedno źródło: stopka, polityka, klauzule, JSON-LD, llms.txt)',
      path: 'src/content/ustawienia/firma',
      format: { data: 'json' },
      schema: {
        nazwa_marki: fields.text({ label: 'Nazwa marki', defaultValue: 'Forma Kodu' }),
        nazwa_prawna: fields.text({ label: 'Pełna nazwa prawna' }),
        forma_prawna: fields.text({ label: 'Forma prawna (JDG, sp. z o.o. …)' }),
        nip: fields.text({ label: 'NIP (10 cyfr bez kresek)' }),
        regon: fields.text({ label: 'REGON (dobrowolnie)' }),
        krs: fields.text({ label: 'KRS (spółka)' }),
        sad_rejestrowy: fields.text({ label: 'Sąd rejestrowy (spółka)' }),
        kapital_zakladowy: fields.text({ label: 'Kapitał zakładowy (spółka)' }),
        adres: fields.object({
          ulica: fields.text({ label: 'Ulica i numer' }),
          kod: fields.text({ label: 'Kod pocztowy (00-000)' }),
          miasto: fields.text({ label: 'Miasto' }),
          kraj: fields.text({ label: 'Kraj', defaultValue: 'PL' }),
        }, { label: 'Adres biura' }),
        adres_publiczny: fields.checkbox({ label: 'Adres biura widoczny publicznie (Profil Firmy w Google, decyzja 9B)', defaultValue: true }),
        godziny_otwarcia: fields.array(fields.text({ label: 'Godziny (np. Mo-Fr 09:00-17:00)' }), { label: 'Godziny pracy (jak w Profilu Firmy w Google)', itemLabel: (p) => p.value }),
        wspolrzedne: fields.object({ lat: fields.text({ label: 'Szerokość' }), lng: fields.text({ label: 'Długość' }) }, { label: 'Współrzędne biura (opcjonalnie)' }),
        email: fields.text({ label: 'E-mail ogólny' }),
        email_dane_osobowe: fields.text({ label: 'E-mail w sprawach danych' }),
        telefon: fields.text({ label: 'Telefon' }),
        domena: fields.text({ label: 'Domena (https://…)' }),
        obszar_dzialania: fields.array(fields.text({ label: 'Obszar' }), { label: 'Obszar działania', itemLabel: (p) => p.value }),
        rok_zalozenia: fields.text({ label: 'Rok założenia' }),
        profile: fields.object({
          google_firma: fields.text({ label: 'Profil Firmy w Google (link)' }),
          linkedin: fields.text({ label: 'LinkedIn' }),
          facebook: fields.text({ label: 'Facebook' }),
          github: fields.text({ label: 'GitHub' }),
          trustpilot: fields.text({ label: 'Trustpilot' }),
        }, { label: 'Profile (trafiają do sameAs)' }),
        dostepnosc: fields.object({
          osoba_kontaktowa: fields.text({ label: 'Osoba kontaktowa' }),
          metoda_oceny: fields.text({ label: 'Metoda oceny' }),
          czas_odpowiedzi_dni: fields.text({ label: 'Czas odpowiedzi (dni)' }),
        }, { label: 'Dostępność' }),
        przetwarzanie: fields.object({
          hosting: fields.text({ label: 'Hosting (nazwa, kraj)' }),
          poczta_formularz: fields.text({ label: 'Poczta i formularze (nazwa, kraj)' }),
          narzedzie_zgloszen: fields.text({ label: 'Gdzie trafiają zgłoszenia' }),
        }, { label: 'Kto przetwarza dane' }),
      },
    }),
    seoGlobalne: singleton({
      label: 'SEO: ustawienia ogólne i analityka',
      path: 'src/content/ustawienia/seo-globalne',
      format: { data: 'json' },
      schema: {
        szablon_tytulu: fields.text({ label: 'Szablon tytułu (%s = tytuł strony)' }),
        tytul_domyslny: limit('Tytuł domyślny (≤ 70)', 1, 70),
        opis_domyslny: limit('Opis domyślny (≤ 160)', 1, 160, true),
        og_obraz_domyslny: fields.text({ label: 'Domyślny obraz udostępniania (ścieżka)' }),
        og_obraz_alt: fields.text({ label: 'Opis obrazu' }),
        jezyk: fields.text({ label: 'Język', defaultValue: 'pl-PL' }),
        slowa_kluczowe_marki: fields.array(fields.text({ label: 'Temat' }), { label: 'Tematy, z którymi marka ma się kojarzyć (knowsAbout)', itemLabel: (p) => p.value }),
        indexnow_klucz: fields.text({ label: 'Klucz IndexNow' }),
        ga4_id: fields.text({ label: 'Identyfikator Google Analytics 4 (G-…)', description: 'Analityka włącza się dopiero po zgodzie odwiedzającego' }),
        ga4_retencja_miesiecy: fields.select({ label: 'Przechowywanie danych w GA4 (miesiące)', options: [{ label: '2', value: '2' }, { label: '14', value: '14' }], defaultValue: '2' }),
      },
    }),
    // Decyzja Kacpra 24.11 (wariant B): opinie tylko z widżetów Trustpilot i Google, bez własnej kolekcji opinii.
    // Widżet ładuje się dopiero po zgodzie na „treści zewnętrzne” w okienku zgód; przed zgodą widać linki do profili (firma → profile).
    opinieUstawienia: singleton({
      label: 'Ustawienia: opinie (widżety)',
      path: 'src/content/ustawienia/opinie',
      format: { data: 'json' },
      schema: {
        pokaz_segment: fields.checkbox({ label: 'Pokazuj segment opinii (27 S3, 28 S15)', defaultValue: false }),
        widzet_trustpilot: fields.object({
          business_unit_id: fields.text({ label: 'Business Unit ID (z panelu Trustpilot → TrustBox)' }),
          template_id: fields.text({ label: 'Template ID szablonu TrustBox' }),
        }, { label: 'Widżet Trustpilot (puste = brak)' }),
        widzet_google: fields.object({
          dostawca: fields.text({ label: 'Dostawca widżetu (Google nie ma oficjalnego widżetu opinii; np. Elfsight)' }),
          skrypt_url: fields.text({ label: 'Adres skryptu dostawcy (https://…; domenę trzeba dopisać do CSP w astro.config)' }),
          klasa_elementu: fields.text({ label: 'Klasa elementu z kodu dostawcy (np. elfsight-app-…)' }),
        }, { label: 'Widżet opinii Google (puste = brak)' }),
      },
    }),
    ...strony,
    ...przygotowaneSingletony,
    ...singletonySeo,
    politykaPrywatnosci: dokument('polityka-prywatnosci', 'Polityka prywatności'),
    dostepnosc: dokument('dostepnosc', 'Deklaracja dostępności'),
  },
  collections: {
    ...przygotowaneKolekcje,
    faq: collection({
      label: 'FAQ',
      path: 'src/content/faq/*',
      slugField: 'pytanie',
      format: { contentField: 'odpowiedz' },
      columns: ['pytanie'],
      schema: {
        pytanie: fields.slug({ name: { label: 'Pytanie (≤ 90 znaków)', validation: { length: { max: 90 } } } }),
        strony: fields.multiselect({
          label: 'Na których stronach',
          options: ['glowna', 'strony-internetowe', 'automatyzacje', 'analiza-seo-geo', 'realizacje', 'pilotaze'].map((v) => ({ label: v, value: v })),
        }),
        kolejnosc: fields.integer({ label: 'Kolejność', defaultValue: 0 }),
        aktualizacja: data('Data aktualizacji'),
        odpowiedz: fields.markdoc({ label: 'Odpowiedź: pierwsze zdanie = odpowiedź wprost (≤ 500 znaków)', extension: 'md' }),
      },
    }),
    realizacje: collection({
      // Jedno źródło realizacji (Kacper 24.11, strona 31 S2): projekty dodaje się tylko tutaj; 27 S5, 28 S12, 29 S8, 31 S1 wybierają je ręcznie.
      // Wzór karty: designsolutions.pl (zdjęcie 2:1, nagłówek, opis, technologie, miasto, data, cała karta klikalna).
      label: 'Realizacje',
      path: 'src/content/realizacje/*',
      slugField: 'naglowek',
      format: { contentField: 'opis_pelny' },
      columns: ['naglowek', 'kategoria', 'data'],
      schema: {
        naglowek: fields.slug({ name: { label: 'Nagłówek (≤ 50)', validation: { length: { min: 1, max: 50 } } } }),
        zdjecie_glowne: fields.image({ label: 'Zdjęcie główne (proporcja 2:1, np. 1600×800 px)', directory: 'src/assets/realizacje', publicPath: '../../assets/realizacje/', validation: { isRequired: true } }),
        zdjecie_alt: limit('Opis zdjęcia dla niewidomych (≤ 125)', 1, 125),
        opis: limit('Opis na karcie (≤ 200)', 1, 200, true),
        technologie: fields.array(fields.text({ label: 'Technologia', validation: { length: { min: 1, max: 30 } } }), { label: 'Technologie (tagi)', itemLabel: (p) => p.value }),
        miasto: fields.text({ label: 'Miasto', validation: { length: { max: 40 } } }),
        data: fields.text({ label: 'Data (RRRR-MM)', validation: { pattern: { regex: /^\d{4}-(0[1-9]|1[0-2])$|^\[RRRR-MM\]$/, message: 'Format RRRR-MM, np. 2026-11 (zaślepka [RRRR-MM] blokuje publikację)' } } }),
        link: fields.url({ label: 'Link po kliknięciu karty (strona realizacji)' }),
        kategoria: fields.select({ label: 'Kategoria', options: ['Strony', 'Automatyzacje', 'Aplikacje'].map((v) => ({ label: v, value: v })), defaultValue: 'Strony' }),
        podkategoria: fields.text({ label: 'Etykieta na karcie (≤ 40), np. „Strona · rezerwacje”; puste = kategoria', validation: { length: { max: 40 } } }),
        typ: fields.select({ label: 'Typ (zasada stała 12)', options: ['klient', 'projekt własny', 'przykład układu'].map((v) => ({ label: v, value: v })), defaultValue: 'klient' }),
        status: fields.select({ label: 'Status', options: ['w toku', 'gotowe'].map((v) => ({ label: v, value: v })), defaultValue: 'gotowe' }),
        wyrozniona: fields.checkbox({ label: 'Wyróżniona', defaultValue: false }),
        // Decyzja Kacpra 24.11: benefity na stronie głównej (27 S6) ładują się z realizacji wybranych w S5.
        benefity: fields.array(fields.object({
          tytul: limit('Tytuł (H4, ≤ 50)', 1, 50),
          opis: limit('Opis (≤ 120)', 1, 120, true),
          jak_sprawdzic: limit('Jak to sprawdzić (≤ 120)', 1, 120, true),
        }), { label: 'Benefity dla klienta (trafiają na stronę główną, S6)', itemLabel: (p) => p.fields.tytul.value }),
        // Podstrona 31b /realizacje/[slug] (Kacper 24.11). Adres (slug) = pole pod „Nagłówek” w panelu. „Przykład układu” nie dostaje podstrony.
        zakres: fields.array(fields.object({
          tytul: limit('Tytuł (H4, ≤ 40)', 1, 40),
          opis: limit('Opis (≤ 160)', 1, 160, true),
        }), { label: 'Zakres prac (31b S3; 2–8, wymagany poza „przykładem układu”)', itemLabel: (p) => p.fields.tytul.value, validation: { length: { max: 8 } } }),
        galeria: fields.array(fields.object({
          obraz: fields.image({ label: 'Zdjęcie', directory: 'src/assets/realizacje', publicPath: '../../assets/realizacje/', validation: { isRequired: true } }),
          alt: limit('Opis zdjęcia (≤ 125)', 1, 125),
          podpis: fields.text({ label: 'Podpis (≤ 120)', validation: { length: { max: 120 } } }),
        }), { label: 'Galeria (31b S5; 0–8)', itemLabel: (p) => p.fields.alt.value, validation: { length: { max: 8 } } }),
        aktualizacja: data('Data aktualizacji wpisu'),
        opis_pelny: fields.markdoc({ label: 'O projekcie (31b S2: akapity, listy, linki; wymagany poza „przykładem układu”)', extension: 'md' }),
      },
    }),
    ceny: collection({
      label: 'Ceny (każda ze źródłem i datą)',
      path: 'src/content/ceny/*',
      slugField: 'nazwa',
      format: { data: 'json' },
      schema: {
        nazwa: fields.slug({ name: { label: 'Nazwa' }, slug: { description: 'Zacznij od adresu strony, np. strony-internetowe-wizytowka (łączy cenę ze stroną w JSON-LD)' } }),
        kwota_od: fields.integer({ label: 'Kwota od (zł)' }),
        kwota_do: fields.integer({ label: 'Kwota do (zł)' }),
        waluta: fields.select({ label: 'Waluta', options: [{ label: 'PLN', value: 'PLN' }], defaultValue: 'PLN' }),
        netto: fields.checkbox({ label: 'Netto', defaultValue: true }),
        okres: fields.select({ label: 'Okres', options: ['jednorazowo', 'miesięcznie', 'rocznie'].map((v) => ({ label: v, value: v })), defaultValue: 'jednorazowo' }),
        nasza_cena: fields.checkbox({ label: 'Nasza cena (odznacz dla „przykładu z rynku”; tylko nasze trafiają do JSON-LD)', defaultValue: true }),
        zrodlo: fields.text({ label: 'Źródło (wymagane)', validation: { length: { min: 1 } } }),
        data_odczytu: data('Data odczytu ceny'),
      },
    }),
  },
});
