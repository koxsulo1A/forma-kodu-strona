// Pola segmentów stron 27–32 w panelu Keystatic. Źródło: brama/pola-cms-27-29.md (limity = propozycja z makiet + ok. 20% zapasu).
// Każda strona = jeden „singleton” zapisany jako JSON w src/content/strony/<id>.json.
// JEDNO ŹRÓDŁO SCHEMATU: dla treści segmentów to ten plik. Strony czytają je w Astro przez czytnik Keystatic
// (createReader, patrz src/lib/tresc.ts), który sprawdza dane według tego schematu. Nie dublujemy go w Zod.
// Zasady treści pilnowane w panelu: kwota tylko ze źródłem i datą (walidacja nr 1), opinie tylko z widżetów Trustpilot/Google (decyzja wariant B, 24.11; dawniej nr 2, kolekcja „opinie”),
// obraz zawsze z alt (nr 3), zaślepki „[...]” blokują publikację (nr 4, skrypt sprawdz-zaslepki).
// FAQ, realizacje i ceny są wspólnymi kolekcjami; opinie to widżety z ustawień „Opinie” (keystatic.config.ts), żeby nie wpisywać ich dwa razy.
import { fields, singleton } from '@keystatic/core';

// ---------- klocki ----------
const t = (label: string, max: number, wymagane = false) =>
  fields.text({ label: `${label} (≤ ${max})`, validation: { length: { min: wymagane ? 1 : 0, max } } });
const a = (label: string, max: number, wymagane = false) =>
  fields.text({ label: `${label} (≤ ${max})`, multiline: true, validation: { length: { min: wymagane ? 1 : 0, max } } });
// „rt” z makiet: akapit z **pogrubieniem** i [linkiem](/adres) w składni Markdown (renderuje src/lib/tresc.ts).
const rt = (label: string, max: number, wymagane = false) =>
  fields.text({ label: `${label} (≤ ${max}; **pogrubienie**, [link](/adres))`, multiline: true, validation: { length: { min: wymagane ? 1 : 0, max } } });
const lista = <T extends Parameters<typeof fields.array>[0]>(label: string, el: T, min: number, max: number, pole?: string) =>
  fields.array(el, {
    label: `${label} (${min === max ? min : `${min}–${max}`})`,
    validation: { length: { min, max } },
    itemLabel: (p: any) => (pole ? String(p.fields?.[pole]?.value ?? '') : String(p.value ?? '')) || 'element',
  });
const obraz = (label: string) =>
  fields.object({
    plik: fields.image({ label, directory: 'src/assets/strony', publicPath: '../../assets/strony/' }),
    alt: fields.text({ label: 'Opis obrazu (alt, ≤ 125; puste tylko przy dekoracji)', validation: { length: { max: 125 } } }),
    dekoracja: fields.checkbox({ label: 'Obraz dekoracyjny (alt="")', defaultValue: false }),
  }, { label });
const wybor = (label: string, opcje: string[]) =>
  fields.select({ label, options: opcje.map((o) => ({ label: o, value: o })), defaultValue: opcje[0] });
// Kwota zawsze ze źródłem i datą (walidacja nr 1): pola wymagane.
const zrodlo = () => fields.text({ label: 'Źródło kwoty (wymagane)', validation: { length: { min: 1 } } });
// Ceny: tylko relacja do kolekcji „Ceny” (jedno źródło, Kacper 24.11). Puste = „wycena indywidualna”.
const cenaRel = (label = 'Cena z cennika (puste = „wycena indywidualna”)') => fields.relationship({ label, collection: 'ceny' });
const dataOdczytu = () => fields.text({ label: 'Data odczytu RRRR-MM-DD (wymagana)', validation: { pattern: { regex: /^\d{4}-\d{2}-\d{2}$|^\[data\]$/, message: 'RRRR-MM-DD' } } });

// Pola wspólne każdego segmentu (etykieta, H2, lead, CTA).
const wspolne = (cta = false) => ({
  etykieta: t('Etykieta nad nagłówkiem', 32),
  naglowek: t('Nagłówek H2 (najlepiej pytanie klienta)', 70, true),
  lead: a('Akapit pod nagłówkiem: pierwsze zdanie = odpowiedź', 220),
  ...(cta ? { cta_etykieta: t('Tekst przycisku', 24, true) } : {}),
});
const seg = (label: string, pola: Record<string, any>) => fields.object(pola, { label });
const tytulOpis = (mt: number, mo: number) => fields.object({ tytul: t('Tytuł', mt, true), opis: a('Opis', mo) });
const proces = () => seg('Proces (6 etapów + efekt; animacja jest pod 6+1)', {
  ...wspolne(),
  etapy: lista('Etapy', fields.object({ tytul: t('Tytuł', 40, true), decyzja_klienta: t('Decyzja klienta', 60), opis: a('Opis', 140) }), 7, 7, 'tytul'),
});
const hero = (h1: number, lead: number, ctaDwa = true) => seg('Hero', {
  h1: t('H1 = pytanie klienta (to samo co „intencja” w SEO strony)', h1, true),
  lead: a('Lead: odpowiedź w 1–2 zdaniach', lead),
  cta_1: t('Przycisk główny', 24, true),
  ...(ctaDwa ? { cta_2: t('Przycisk drugi', 24) } : {}),
});
const zamkniecie = () => seg('Zamknięcie', { naglowek: t('Nagłówek', 80, true), punkty: lista('Punkty', t('Punkt', 80), 0, 3), cta: t('Przycisk', 24, true), podpis: t('Podpis', 120) });
const faqInfo = (label = 'FAQ') => seg(`${label}: pytania dodajesz w „Treści wspólne → FAQ” (zaznacz tę stronę)`, wspolne());
const realizacjeWybor = (min: number, max: number) =>
  fields.multiRelationship({ label: `Wybrane realizacje (${min}–${max}) z kolekcji „Realizacje”`, collection: 'realizacje', validation: { length: { min, max } } });
const kalkulator = () => seg('Kalkulator: pakiety i koszty stałe', {
  ...wspolne(),
  pakiety: lista('Pakiety', fields.object({ nazwa: t('Nazwa', 40, true), cena: cenaRel() }), 3, 3, 'nazwa'),
  koszty_stale: lista('Koszty stałe', fields.object({ nazwa: t('Nazwa', 40, true), zakres: t('Zakres kwot', 40), okres: wybor('Okres', ['miesięcznie', 'rocznie', 'jednorazowo']), zrodlo: zrodlo(), data: dataOdczytu() }), 0, 10, 'nazwa'),
  zrodla: rt('Źródła (opis)', 400),
});
const strona = (id: string, label: string, schema: Record<string, any>) =>
  singleton({ label, path: `src/content/strony/${id}`, format: { data: 'json' }, schema });

// ---------- strony ----------
export const strony = {
  'strona-glowna': strona('glowna', 'Strona 27: główna', {
    s1_hero: seg('S1 Hero', {
      h1: t('H1 = pytanie klienta', 80, true), lead: a('Lead', 200), cta_1: t('Przycisk główny', 24, true), cta_2: t('Przycisk drugi', 24),
      pas_zakresu: lista('Pas zakresu', fields.object({ tytul: t('Tytuł', 40, true), opis: a('Opis', 90) }), 3, 5, 'tytul'),
    }),
    s2_dlaczego: seg('S2 Dlaczego my', { ...wspolne(), kafle: lista('Kafle', tytulOpis(50, 160), 2, 4, 'tytul') }),
    s3_opinie: seg('S3 Opinie (widżety z „Ustawienia: opinie”, po zgodzie na treści zewnętrzne; przed zgodą linki do profili)', wspolne()),
    s4_oferta: seg('S4 Oferta', {
      ...wspolne(),
      uslugi: lista('Usługi', fields.object({
        nazwa: t('Nazwa (H4)', 40, true), opis: a('Opis', 140), cena: cenaRel('Cena z cennika (puste = „wycena po rozmowie”)'),
        etykieta_ceny: t('Etykieta ceny', 30),
        status: wybor('Status (pole danych, niewidoczne)', ['dostępne', 'na zapytanie', 'wkrótce']),
      }), 3, 6, 'nazwa'),
    }),
    s5_realizacje: seg('S5 Realizacje', { ...wspolne(), realizacje: realizacjeWybor(1, 6) }),
    s6_benefity: seg('S6 Benefity (automatycznie: pole „Benefity” realizacji wybranych w S5; tu tylko nagłówek i limit)', { ...wspolne(), maks: fields.integer({ label: 'Ile benefitów pokazać (4–9)', defaultValue: 6, validation: { min: 4, max: 9 } }) }),
    s7_proces: proces(),
    s8_cennik: kalkulator(),
    s9_mala_rzecz: seg('S9 Mała rzecz', { ...wspolne(), stopnie: lista('Stopnie', tytulOpis(40, 100), 3, 5, 'tytul') }),
    s10_technologie: seg('S10 Technologie', {
      ...wspolne(),
      pakiety: lista('Pakiety', fields.object({
        nazwa: t('Nazwa', 40, true), liczba_warstw: fields.integer({ label: 'Liczba warstw' }), opis: a('Opis', 160),
        warstwy: lista('Warstwy', fields.object({ narzedzie: t('Narzędzie', 30, true), rola: t('Rola', 20), ograniczenie: a('Czego nie robi (wymagane)', 120, true) }), 1, 8, 'narzedzie'),
      }), 3, 3, 'nazwa'),
    }),
    s11_a_co_jesli: faqInfo('S11 A co jeśli…?'),
    s12_kim_jestesmy: seg('S12 Kim jesteśmy (prawdziwe osoby, zasada 12)', {
      ...wspolne(), opis: rt('Opis', 600, true),
      osoby: lista('Osoby', fields.object({ imie: t('Imię i nazwisko', 40, true), rola: t('Rola', 40), zdjecie: obraz('Zdjęcie (puste = inicjały)') }), 1, 4, 'imie'),
    }),
    s13_szczegolowa_oferta: seg('S13 Szczegółowa oferta (zakładki)', {
      zakladki: lista('Zakładki', fields.object({
        etykieta: t('Etykieta (telefon pokazuje tylko ją)', 14, true), podpis: t('Podpis', 30),
        uslugi: lista('Usługi', fields.object({ nazwa: t('Nazwa', 40, true), opis: a('Opis', 160), ograniczenie: a('Ograniczenie', 120), ceny: fields.multiRelationship({ label: 'Ceny z cennika (tekst składa się sam)', collection: 'ceny' }) }), 1, 8, 'nazwa'),
      }), 3, 3, 'etykieta'),
    }),
    // S14 Stopka: dane z „Dane firmy” (jedno źródło), bez pól tutaj.
  }),

  'strona-strony-internetowe': strona('strony-internetowe', 'Strona 28: Strony internetowe', {
    s1_hero: seg('S1 Hero', { h1: t('H1 = pytanie klienta', 90, true), lead: a('Lead', 200), cta_1: t('Przycisk główny', 24, true), cta_2: t('Przycisk drugi', 24), branze: lista('Branże', t('Branża', 30), 3, 3) }),
    s2_dla_kogo: seg('S2 Dla kogo', { ...wspolne(), branze: lista('Branże', fields.object({ branza: t('Branża (H3)', 50, true), pytania_klientow: a('Pytania klientów', 200) }), 3, 3, 'branza') }),
    s3_warianty: seg('S3 Trzy warianty', {
      ...wspolne(),
      warianty: lista('Warianty', fields.object({ numer: t('Numer', 4), status: wybor('Status', ['dostępne', 'w przygotowaniu']), nazwa: t('Nazwa (H2 w karcie)', 30, true), opis: a('Opis', 140), zastrzezenie: a('Zastrzeżenie', 140), obraz_schematu: obraz('Schemat') }), 3, 3, 'nazwa'),
    }),
    s4_dlaczego: seg('S4 Dlaczego my', { ...wspolne(), punkty: lista('Punkty', fields.object({ liczba: t('Liczba', 4), tytul: t('Tytuł', 50, true), opis: a('Opis', 140) }), 6, 6, 'tytul') }),
    s5_zapytaj: seg('S5 Zapytaj o stronę (pola formularza nie są edytowalne; pod formularzem klauzula bez pola zgody, decyzja 1A)', { ...wspolne(), kroki: lista('Kroki', t('Krok', 80), 3, 5) }),
    s6_pakiety: seg('S6 Pakiety: „Ile strony potrzebuje Twoja firma?”', { ...wspolne(), pakiety: lista('Pakiety', fields.object({ nazwa: t('Nazwa', 40, true), opis: a('Opis', 160), zawiera: lista('Zawiera', t('Pozycja', 60), 3, 8) }), 3, 3, 'nazwa') }),
    s7_koszta: seg('S7 Koszta klienta', { ...wspolne(), pozycje: lista('Pozycje', fields.object({ pozycja: t('Pozycja', 50, true), kwota_od_do: t('Kwota od–do', 30), okres: wybor('Okres', ['miesięcznie', 'rocznie', 'jednorazowo']), zrodlo: zrodlo(), data: dataOdczytu() }), 4, 4, 'pozycja') }),
    s8_standard: seg('S8 Pasek standardu', { cechy: lista('Cechy', t('Cecha', 30), 4, 6) }),
    s9_wcag: seg('S9–S10 Dostępność (bez obietnic „zgodność gwarantowana”)', { ...wspolne(), punkty: lista('Punkty', tytulOpis(50, 200), 4, 5, 'tytul') }),
    s11_ai: seg('S11 Wyszukiwarki AI', { ...wspolne(), punkty: lista('Punkty', fields.object({ tytul: t('Tytuł', 50, true), opis: a('Opis', 200), ograniczenie: a('Ograniczenie', 140) }), 2, 6, 'tytul') }),
    s12_realizacje: seg('S12 Realizacje (wybór ręczny z kolekcji „Realizacje”, podpowiedź: kategoria Strony; typ „przykład układu” = etykieta „przykład, nie realizacja”)', { ...wspolne(), realizacje: realizacjeWybor(1, 6) }),
    s13_proces: proces(),
    s14_kalkulator: kalkulator(),
    s15_opinie: seg('S15 Opinie (jak 27 S3: widżety po zgodzie, przed zgodą linki do profili; brak profili = segment ukryty)', wspolne()),
    s16_faq: faqInfo('S16 FAQ'),
    s17_zamkniecie: zamkniecie(),
  }),

  'strona-automatyzacje': strona('automatyzacje', 'Strona 29: Automatyzacje', {
    s1_hero: seg('S1 Hero', { h1: t('H1 = pytanie klienta', 80, true), lead: a('Lead', 200), cta_1: t('Przycisk główny', 24, true), cta_2: t('Przycisk drugi', 24), etykiety: lista('Etykiety', t('Etykieta', 30), 3, 5) }),
    s2_dla_kogo: seg('S2 Dla kogo', { ...wspolne(), problemy: lista('Problemy', fields.object({ problem: t('Problem (H4)', 60, true), opis: a('Opis', 140) }), 3, 6, 'problem') }),
    s3_zakres: seg('S3 Zakres', { ...wspolne(), zakresy: lista('Zakresy', fields.object({ nazwa: t('Nazwa', 40, true), opis: a('Opis', 200), status: wybor('Status („wkrótce” = przycisk „Powiadom mnie”)', ['dostępny', 'wkrótce']), cta: t('Przycisk', 24) }), 4, 4, 'nazwa') }),
    s4_boty: seg('S4 Boty czatowe', {
      ...wspolne(),
      bloki: lista('Bloki', fields.object({ nazwa: t('Nazwa', 40, true), podtytul: t('Podtytuł', 80), potrafi: lista('Potrafi', t('Punkt', 90), 2, 4), nie_potrafi: lista('Nie potrafi (min. 2)', t('Punkt', 90), 2, 4) }), 3, 3, 'nazwa'),
    }),
    s5_jak_pracujemy: seg('S5 Jak pracujemy', { ...wspolne(), kroki: lista('Kroki', fields.object({ krok: t('Krok', 40, true), opis: a('Opis', 200) }), 4, 4, 'krok') }),
    s6_ograniczenia: seg('S6 Ograniczenia i koszty', { naglowek: t('Nagłówek', 60, true), lead: a('Lead', 120), kroki: lista('Kroki', t('Treść', 110), 4, 4) }),
    s7_cena: seg('S7 Cena (przykład). Uwaga: nagłówek nie może powtarzać S3', { ...wspolne(), zakresy: lista('Zakresy', fields.object({ zakres: t('Zakres', 40, true), cena: cenaRel(), co_wplywa: a('Co wpływa na cenę', 160) }), 4, 4, 'zakres') }),
    s8_przyklad: seg('S8 Przykład pracy (slajdy = realizacje wybrane ręcznie, podpowiedź: kategoria Automatyzacje)', { naglowek: t('Nagłówek', 70, true), lead: a('Lead', 220), realizacje: realizacjeWybor(1, 6) }),
    s9_faq: faqInfo('S9 FAQ'),
    s10_zamkniecie: zamkniecie(),
  }),

  'strona-analiza-seo-geo': strona('analiza-seo-geo', 'Strona 30: Analiza SEO/GEO', {
    s1_hero: hero(80, 200, false),
    s2_status: seg('S2 Status (gdy usługa ruszy: odznacz „widoczny”)', { widoczny: fields.checkbox({ label: 'Segment widoczny (usługa jeszcze nie ruszyła)', defaultValue: true }), naglowek: t('Nagłówek', 60, true), opis: a('Opis', 220), cta: t('Przycisk', 24) }),
    s3_zakres: seg('S3 Planowany zakres', { ...wspolne(), punkty: lista('Punkty', tytulOpis(50, 160), 3, 3, 'tytul') }),
    s4_mierzymy: seg('S4 Co da się zmierzyć', { ...wspolne(), etapy: lista('Etapy', fields.object({ nazwa: t('Nazwa', 40, true), opis: a('Opis', 140), zrodlo_danych: t('Źródło danych', 60) }), 4, 7, 'nazwa') }),
    s5_nie_obiecamy: seg('S5 Czego nie obiecamy', { naglowek: t('Nagłówek', 70, true), punkty: lista('Punkty', fields.object({ obietnica_rynkowa: t('Obietnica z rynku', 90, true), dlaczego_nie: a('Dlaczego nie', 200) }), 2, 4, 'obietnica_rynkowa') }),
    s6_lejek: seg('S6 Przykład (lejek). Prawdziwe liczby = źródło i data', {
      naglowek: t('Nagłówek', 70, true), etykieta: t('Etykieta', 32),
      etapy: lista('Etapy', fields.object({ liczba: fields.integer({ label: 'Liczba' }), nazwa: t('Nazwa', 40, true) }), 4, 4, 'nazwa'),
      wskaznik: fields.integer({ label: 'Wskaźnik (%)' }), obserwacja: a('Obserwacja', 160), zrodlo: fields.text({ label: 'Źródło liczb (gdy prawdziwe)' }), data: fields.text({ label: 'Data liczb (gdy prawdziwe)' }),
    }),
    s7_raport: seg('S7 Jak będzie wyglądał raport', { ...wspolne(), kroki: lista('Kroki', tytulOpis(40, 160), 4, 7, 'tytul') }),
    s8_powiadomienie: seg('S8 Powiadom mnie (zgoda: komponent ZgodaMarketingowa, tekst z polityki)', { naglowek: t('Nagłówek', 60, true), lead: a('Lead', 220), etykieta_pola: t('Etykieta pola e-mail', 40, true), cta: t('Przycisk', 32, true) }),
    s9_faq: faqInfo('S9 FAQ'),
  }),

  'strona-realizacje': strona('realizacje', 'Strona 31: Realizacje', {
    s1_hero: seg('S1 Hero', {
      h1: t('H1 = pytanie klienta', 70, true), lead: a('Lead', 220), cta_1: t('Przycisk główny', 24, true), cta_2: t('Przycisk drugi', 24),
      wyrozniony_projekt: fields.relationship({ label: 'Wyróżniony projekt', collection: 'realizacje' }),
      brak_realizacji: fields.object({ tytul: t('Tytuł', 60), opis: a('Opis', 200) }, { label: 'Blok „brak realizacji klientów” (znika przy pierwszej realizacji klienta)' }),
    }),
    s2_projekty: seg('S2 Projekty (lista z kolekcji „Realizacje”, wszystkie)', { naglowek: t('Nagłówek', 70, true), lead: a('Lead', 220) }),
    s3_pilotaze: seg('S3 Pilotaże', { naglowek: t('Nagłówek', 60, true), lead: a('Lead', 160), zalety: lista('Zalety', t('Zaleta', 80), 3, 3), cta: t('Przycisk', 40, true) }),
    s4_faq: faqInfo('S4 FAQ'),
  }),

  'strona-pilotaze': strona('pilotaze', 'Strona 32: Darmowe pilotaże', {
    s1_hero: hero(70, 200, false),
    s2_kategorie: seg('S2 Wybierz kategorię', {
      ...wspolne(),
      kategorie: lista('Kategorie', fields.object({
        nazwa: t('Nazwa', 40, true), opis: a('Opis', 160),
        status: wybor('Status (decyduje o przycisku: Zapytaj / Powiadom mnie / Zapisz się na listę)', ['dostępny', 'wkrótce', 'lista']),
        co_dostajesz: lista('Co dostajesz', t('Punkt', 80), 2, 5), cta: t('Przycisk', 24),
      }), 3, 3, 'nazwa'),
    }),
    s3_jak_dziala: seg('S3 Jak działa pilotaż', { ...wspolne(), kroki: lista('Kroki', tytulOpis(40, 140), 3, 6, 'tytul') }),
    s4_warunki: seg('S4 Warunki', { ...wspolne(), warunki: lista('Warunki', tytulOpis(60, 300), 3, 8, 'tytul') }),
    s5_faq: faqInfo('S5 FAQ'),
    s6_formularz: seg('S6 Formularz (pod nim klauzula bez pola zgody, decyzja 1A)', {
      naglowek: t('Nagłówek', 70, true),
      etapy: lista('Etapy', t('Nazwa etapu', 30), 4, 4),
      opcje_platformy: lista('Opcje platformy', t('Opcja', 30), 1, 10),
      opcje_funkcji: lista('Opcje funkcji', t('Opcja', 30), 1, 12),
      komunikat_sukcesu: a('Komunikat po wysłaniu', 200, true),
    }),
    s7_nie_wiesz: seg('S7 Nie wiesz, czy pilotaż jest dla Ciebie?', { naglowek: t('Nagłówek', 60, true), cta: t('Przycisk', 24, true) }),
  }),
};
