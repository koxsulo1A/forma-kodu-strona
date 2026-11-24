// Budowanie danych strukturalnych JSON-LD (schema.org) z treści CMS.
// Zasada: JSON-LD opisuje TYLKO to, co widać na stronie (Google: dane niewidoczne = naruszenie wytycznych [Pamięć]).
// Jeden graf (@graph) na stronę, stabilne @id, żeby wyszukiwarki i AI łączyły wszystko w jeden podmiot (zasada stała 11).
import { getEntry, getCollection } from 'astro:content';

type Strona = 'glowna' | 'strony-internetowe' | 'automatyzacje' | 'analiza-seo-geo' | 'realizacje' | 'pilotaze' | 'polityka-prywatnosci' | 'dostepnosc';

export type Podstrona = {
  // Strona generowana z wpisu kolekcji (np. realizacja 31b): nadpisuje tytuł, opis, obraz i datę z src/content/seo/<strona>.json.
  tytul: string; opis: string; obraz?: string; obrazAlt?: string; aktualizacja: string;
  dzielo?: { nazwa: string; opis: string; obraz?: string; data?: string; miasto?: string; technologie?: string[] }; // → CreativeWork
};

const usunPuste = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)));

export async function grafStrony(strona: Strona, opts: { url: URL; nazwaStrony: string; okruszki?: { nazwa: string; url: string }[]; uslugaOpis?: string; podstrona?: Podstrona }) {
  const firma = (await getEntry('firma', 'firma'))!.data;
  const seoG = (await getEntry('seoGlobalne', 'seo'))!.data;
  const seo = (await getEntry('seo', strona))!.data;
  const domena = firma.domena.replace(/\/$/, '');
  const ORG = `${domena}/#organizacja`;
  const SITE = `${domena}/#witryna`;

  const organizacja = usunPuste({
    '@type': ['Organization', 'ProfessionalService'],
    '@id': ORG,
    name: firma.nazwa_marki,
    legalName: firma.nazwa_prawna,
    url: `${domena}/`,
    logo: { '@type': 'ImageObject', url: `${domena}/logo/forma-kodu-512.png`, width: 512, height: 512 },
    image: `${domena}${seoG.og_obraz_domyslny}`,
    description: seoG.opis_domyslny,
    email: firma.email,
    telephone: firma.telefon,
    taxID: firma.nip,
    vatID: firma.nip ? `PL${firma.nip}` : '',
    foundingDate: firma.rok_zalozenia,
    // Decyzja 9B: adres biura publiczny i identyczny jak w Profilu Firmy w Google (nazwa, adres, telefon co do znaku).
    address: firma.adres_publiczny
      ? { '@type': 'PostalAddress', streetAddress: firma.adres.ulica, postalCode: firma.adres.kod, addressLocality: firma.adres.miasto, addressCountry: firma.adres.kraj }
      : { '@type': 'PostalAddress', addressLocality: firma.adres.miasto, addressCountry: firma.adres.kraj },
    openingHours: firma.adres_publiczny ? firma.godziny_otwarcia : [],
    geo: firma.wspolrzedne?.lat ? { '@type': 'GeoCoordinates', latitude: firma.wspolrzedne.lat, longitude: firma.wspolrzedne.lng } : '',
    hasMap: firma.profile.google_firma,
    areaServed: firma.obszar_dzialania.map((n) => ({ '@type': 'Country', name: n })),
    knowsAbout: seoG.slowa_kluczowe_marki,
    sameAs: Object.values(firma.profile).filter(Boolean),
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer service', email: firma.email, telephone: firma.telefon, availableLanguage: ['pl'] }],
  });

  const witryna = { '@type': 'WebSite', '@id': SITE, url: `${domena}/`, name: firma.nazwa_marki, inLanguage: seoG.jezyk, publisher: { '@id': ORG } };

  const typStrony = seo.schema.includes('CollectionPage') ? 'CollectionPage' : seo.schema.includes('FAQPage') ? ['WebPage', 'FAQPage'] : 'WebPage';
  const strona_ = usunPuste({
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
  // Podstrona realizacji (31b): typ CollectionPage z seo/realizacje.json nie pasuje do pojedynczego projektu.
  if (opts.podstrona) (strona_ as Record<string, unknown>)['@type'] = 'WebPage';

  const graf: Record<string, unknown>[] = [organizacja, witryna, strona_];

  if (opts.okruszki?.length) {
    graf.push({
      '@type': 'BreadcrumbList',
      '@id': `${opts.url.href}#okruszki`,
      itemListElement: opts.okruszki.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: o.nazwa, item: `${domena}${o.url}` })),
    });
  }

  if (opts.podstrona?.dzielo) {
    const d = opts.podstrona.dzielo;
    graf.push(usunPuste({
      '@type': 'CreativeWork',
      '@id': `${opts.url.href}#realizacja`,
      name: d.nazwa,
      description: d.opis,
      image: d.obraz ? `${domena}${d.obraz}` : '',
      dateCreated: d.data,
      locationCreated: d.miasto ? { '@type': 'Place', name: d.miasto } : '',
      keywords: d.technologie?.join(', '),
      creator: { '@id': ORG },
      mainEntityOfPage: { '@id': `${opts.url.href}#strona` },
    }));
  }

  if (seo.schema.includes('Service') && !opts.podstrona) {
    const ceny = (await getCollection('ceny', (c) => c.data.nasza_cena && c.id.startsWith(strona)));
    graf.push(usunPuste({
      '@type': 'Service',
      '@id': `${opts.url.href}#usluga`,
      name: opts.nazwaStrony,
      description: opts.uslugaOpis ?? seo.seo_opis,
      provider: { '@id': ORG },
      areaServed: firma.obszar_dzialania,
      availableLanguage: 'pl',
      // Tylko NASZE ceny (nasza_cena=true). „Przykład z rynku” nigdy nie trafia do Offer.
      offers: ceny.map((c) => usunPuste({
        '@type': 'Offer',
        name: c.data.nazwa,
        priceSpecification: { '@type': 'PriceSpecification', minPrice: c.data.kwota_od, maxPrice: c.data.kwota_do, priceCurrency: 'PLN', valueAddedTaxIncluded: !c.data.netto },
      })),
    }));
  }

  if (seo.schema.includes('FAQPage') && !opts.podstrona) {
    const faq = (await getCollection('faq', (f) => f.data.strony.includes(strona as never))).sort((a, b) => a.data.kolejnosc - b.data.kolejnosc);
    // mainEntity na stronie FAQPage; Google nie pokazuje już wyników rozszerzonych FAQ (od 7.05.2026, źródło wtórne),
    // zostawiamy, bo to poprawny opis widocznej treści i tani koszt.
    (strona_ as Record<string, unknown>).mainEntity = faq.map((f) => ({
      '@type': 'Question',
      name: f.data.pytanie,
      acceptedAnswer: { '@type': 'Answer', text: (f.body ?? '').trim() }, // znaczniki cen podmienia generuj-markdown.mjs
    }));
  }

  return { '@context': 'https://schema.org', '@graph': graf };
}
