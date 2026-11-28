// Budowanie danych strukturalnych JSON-LD (schema.org) z treści CMS.
// Zasada: JSON-LD opisuje TYLKO to, co widać na stronie (Google: dane niewidoczne = naruszenie wytycznych [Pamięć]).
// Jeden graf (@graph) na stronę, stabilne @id, żeby wyszukiwarki i AI łączyły wszystko w jeden podmiot (zasada stała 11).
import { getEntry, getCollection } from 'astro:content';
// Typy schema.org (paczka schema-dts, tylko typy, nie trafia do przeglądarki). Literówka w nazwie pola albo zła wartość
// (np. priceCurency, tekst zamiast liczby) przerywa `npm run check:typy`, zanim JSON-LD zobaczy Google (plan F1, 28.11.2026).
import type {
  BreadcrumbList, CollectionPageLeaf, CreativeWork, FAQPageLeaf, Graph, MergeLeafTypes, Offer,
  ImageObject, OrganizationLeaf, PriceSpecification, ProfessionalServiceLeaf, Question, Service, Thing, WebPageLeaf, WebSite,
} from 'schema-dts';

type Strona = 'glowna' | 'strony-internetowe' | 'automatyzacje' | 'analiza-seo-geo' | 'realizacje' | 'pilotaze' | 'polityka-prywatnosci' | 'dostepnosc' | 'kontakt';

export type Podstrona = {
  // Strona generowana z wpisu kolekcji (np. realizacja 31b): nadpisuje tytuł, opis, obraz i datę z src/content/seo/<strona>.json.
  tytul: string; opis: string; obraz?: string; obrazAlt?: string; aktualizacja: string;
  dzielo?: { nazwa: string; opis: string; obraz?: string; data?: string; miasto?: string; technologie?: string[] }; // → CreativeWork
};

type OrganizacjaLd = MergeLeafTypes<[OrganizationLeaf, ProfessionalServiceLeaf]>;
type StronaLd = WebPageLeaf | CollectionPageLeaf | MergeLeafTypes<[WebPageLeaf, FAQPageLeaf]>;

// Usuwa puste pola (brak NIP, telefonu itd.), żeby JSON-LD nie zawierał pustych wartości. Typ obiektu zostaje ten sam.
const usunPuste = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))) as T;

export async function grafStrony(strona: Strona, opts: { url: URL; nazwaStrony: string; okruszki?: { nazwa: string; url: string }[]; uslugaOpis?: string; podstrona?: Podstrona }): Promise<Graph> {
  const firma = (await getEntry('firma', 'firma'))!.data;
  const seoG = (await getEntry('seoGlobalne', 'seo'))!.data;
  const seo = (await getEntry('seo', strona))!.data;
  const domena = firma.domena.replace(/\/$/, '');
  const ORG = `${domena}/#organizacja`;
  const SITE = `${domena}/#witryna`;

  const organizacja = usunPuste<OrganizacjaLd>({
    '@type': ['Organization', 'ProfessionalService'],
    '@id': ORG,
    name: firma.nazwa_marki,
    legalName: firma.nazwa_prawna,
    url: `${domena}/`,
    // width/height jako liczby: tak pokazuje Google w przykładach logo, choć schema.org formalnie chce QuantitativeValue.
    logo: { '@type': 'ImageObject', url: `${domena}/logo/forma-kodu-512.png`, width: 512, height: 512 } as unknown as ImageObject,
    image: `${domena}${seoG.og_obraz_domyslny}`,
    description: seoG.opis_domyslny,
    email: firma.email,
    telephone: firma.telefon || undefined,
    taxID: firma.nip || undefined,
    vatID: firma.nip ? `PL${firma.nip}` : undefined,
    foundingDate: firma.rok_zalozenia || undefined,
    // Decyzja 9B: adres biura publiczny i identyczny jak w Profilu Firmy w Google (nazwa, adres, telefon co do znaku).
    address: firma.adres_publiczny
      ? { '@type': 'PostalAddress', streetAddress: firma.adres.ulica, postalCode: firma.adres.kod, addressLocality: firma.adres.miasto, addressCountry: firma.adres.kraj }
      : { '@type': 'PostalAddress', addressLocality: firma.adres.miasto, addressCountry: firma.adres.kraj },
    openingHours: firma.adres_publiczny ? firma.godziny_otwarcia : [],
    geo: firma.wspolrzedne?.lat ? { '@type': 'GeoCoordinates', latitude: firma.wspolrzedne.lat, longitude: firma.wspolrzedne.lng } : undefined,
    hasMap: firma.profile.google_firma,
    areaServed: firma.obszar_dzialania.map((n) => ({ '@type': 'Country', name: n })),
    knowsAbout: seoG.slowa_kluczowe_marki,
    sameAs: Object.values(firma.profile).filter(Boolean),
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer service', email: firma.email, telephone: firma.telefon || undefined, availableLanguage: ['pl'] }],
  });

  const witryna: WebSite = { '@type': 'WebSite', '@id': SITE, url: `${domena}/`, name: firma.nazwa_marki, inLanguage: seoG.jezyk, publisher: { '@id': ORG } };

  // Podstrona realizacji (31b): typ CollectionPage z seo/realizacje.json nie pasuje do pojedynczego projektu, więc WebPage.
  const typStrony: StronaLd['@type'] = opts.podstrona ? 'WebPage'
    : seo.schema.includes('CollectionPage') ? 'CollectionPage' : seo.schema.includes('FAQPage') ? ['WebPage', 'FAQPage'] : 'WebPage';
  const strona_ = usunPuste<StronaLd>({
    '@type': typStrony,
    '@id': `${opts.url.href}#strona`,
    url: opts.url.href,
    name: opts.podstrona?.tytul ?? seo.seo_tytul,
    description: opts.podstrona?.opis ?? seo.seo_opis,
    inLanguage: seoG.jezyk,
    isPartOf: { '@id': SITE },
    about: { '@id': ORG },
    dateModified: opts.podstrona?.aktualizacja ?? seo.aktualizacja, // ta sama data co widoczna „Aktualizacja: …” i <lastmod> w sitemap (zasada stała 13)
    primaryImageOfPage: { '@type': 'ImageObject', url: `${domena}${opts.podstrona?.obraz ?? seo.og_obraz}` },
  });

  // Typy wielokrotne (np. Organization + ProfessionalService) schema-dts opisuje osobno (MergeLeafTypes), ale nie mieści ich w Thing.
  const graf: (Thing | OrganizacjaLd | StronaLd)[] = [organizacja, witryna, strona_];

  if (opts.okruszki?.length) {
    graf.push({
      '@type': 'BreadcrumbList',
      '@id': `${opts.url.href}#okruszki`,
      itemListElement: opts.okruszki.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: o.nazwa, item: `${domena}${o.url}` })),
    } satisfies BreadcrumbList);
  }

  if (opts.podstrona?.dzielo) {
    const d = opts.podstrona.dzielo;
    graf.push(usunPuste<CreativeWork>({
      '@type': 'CreativeWork',
      '@id': `${opts.url.href}#realizacja`,
      name: d.nazwa,
      description: d.opis,
      image: d.obraz ? `${domena}${d.obraz}` : undefined,
      dateCreated: d.data,
      locationCreated: d.miasto ? { '@type': 'Place', name: d.miasto } : undefined,
      keywords: d.technologie?.join(', '),
      creator: { '@id': ORG },
      mainEntityOfPage: { '@id': `${opts.url.href}#strona` },
    }));
  }

  if (seo.schema.includes('Service') && !opts.podstrona) {
    const ceny = (await getCollection('ceny', (c) => c.data.nasza_cena && c.id.startsWith(strona)));
    graf.push(usunPuste<Service>({
      '@type': 'Service',
      '@id': `${opts.url.href}#usluga`,
      name: opts.nazwaStrony,
      description: opts.uslugaOpis ?? seo.seo_opis,
      provider: { '@id': ORG },
      areaServed: firma.obszar_dzialania,
      // availableLanguage usunięte 28.11.2026: schema.org nie ma tego pola w Service (wyłapał je check:typy). Język obsługi
      // podaje contactPoint organizacji.
      // Tylko NASZE ceny (nasza_cena=true). „Przykład z rynku” nigdy nie trafia do Offer.
      offers: ceny.map((c) => usunPuste<Offer>({
        '@type': 'Offer',
        name: c.data.nazwa,
        priceSpecification: usunPuste<PriceSpecification>({ '@type': 'PriceSpecification', minPrice: c.data.kwota_od ?? undefined, maxPrice: c.data.kwota_do ?? undefined, priceCurrency: 'PLN', valueAddedTaxIncluded: !c.data.netto }),
      })),
    }));
  }

  if (seo.schema.includes('FAQPage') && !opts.podstrona) {
    const faq = (await getCollection('faq', (f) => f.data.strony.includes(strona as never))).sort((a, b) => a.data.kolejnosc - b.data.kolejnosc);
    // mainEntity na stronie FAQPage; Google nie pokazuje już wyników rozszerzonych FAQ (od 7.05.2026, źródło wtórne),
    // zostawiamy, bo to poprawny opis widocznej treści i tani koszt.
    strona_.mainEntity = faq.map((f): Question => ({
      '@type': 'Question',
      name: f.data.pytanie,
      acceptedAnswer: { '@type': 'Answer', text: (f.body ?? '').trim() }, // znaczniki cen podmienia generuj-markdown.mjs
    }));
  }

  return { '@context': 'https://schema.org', '@graph': graf as Thing[] };
}
