// Ruch z tabeli „Motion: stan docelowy” (Figma 06 Motion, 390:2, 24.11.2026). Jeden moduł, bez bibliotek.
// Zasady wspólne:
//  - Bez JS i przy „ogranicz ruch” (system albo przełącznik dostępności) treść jest widoczna od razu, w stanie końcowym.
//  - Animujemy tylko transform i opacity (bez skoków układu, CLS 0).
//  - Style ustawiamy przez element.style (CSSOM), co CSP strony dopuszcza; atrybutu style w HTML nie używamy.
// Spis: 1 kaskada odsłaniania segmentów, 2 stopka-kurtyna, 3 zmiana słów w H1 (27 S1), 4 oś procesu (27 S7),
//       5 liczniki lejka (30 S6), 6 bloki zmieniane przewijaniem (29 S4). Przycisk „Wysyłanie… → Wysłano!” jest w strona.ts (punkt 6).

const html = document.documentElement;
const ograniczRuch = () => html.classList.contains('bez-ruchu') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const komputer = matchMedia('(min-width: 1024px)');
const sciezka = location.pathname.replace(/\/$/, '') || '/';
const segment = (kod: string) => document.querySelector<HTMLElement>(`[data-segment^="${kod} "]`);

// ---------- 1. Kaskada odsłaniania ----------
// Tabela: wejście w widok (30%), raz; 500 ms cubic-bezier(0.16, 1, 0.3, 1), y 24 → 0; kaskada 60 ms, max 6 elementów.
// Wyjątki: 27 S6 (450 ms, y 32, kaskada 140 ms), 27 S9 (450 ms, kaskada 90 ms od lewej),
// 30 S2 treść z góry, 30 S3 karty z lewej (500 ms, odstęp 80 ms).
type Kierunek = 'dol' | 'gora' | 'lewo' | 'prawo';
// osobno: każdy element odsłania się sam, gdy wejdzie w ekran („jeden na każdy ruch scrolla”, Figma Motion 28 S2/S3, 27 S7).
// kody 'reszta': wszystkie segmenty strony poza POMIN i poza tymi, które mają własną regułę wyżej.
interface Kaskada { kody: string[] | 'reszta'; czas?: number; krok?: number; odleglosc?: number; kierunek?: Kierunek; max?: number; osobno?: boolean; sekwencja?: Sekwencja }
// Sekwencja (Kacper 25.11 16:06, tylko komputer; telefon = zwykła kaskada): nagłówek najpierw (stoi albo wjeżdża przy scrollu),
// potem bloki pojawiają się po kolei dopiero, gdy cały segment mieści się na ekranie („pełen obraz”, ZDJ1/ZDJ2 Kacpra).
interface Sekwencja {
  bloki: string;            // selektor bloków w kolejności pokazywania
  naglowek: 'stoi' | 'wjezdza';
  naglowekSel?: string;     // selektor nagłówka (gdy „wjezdza”)
  stale?: number;           // ile pierwszych bloków widać od razu z nagłówkiem (27 S6: 1)
  pierwszyPrzyWejsciu?: boolean; // pierwszy blok odsłania się, gdy wejdzie w ekran; reszta przy pełnym obrazie (27 S2, S4)
  naKoniec?: string;        // element pokazywany po ostatnim bloku (27 S9: podnagłówek)
  pelny?: string;           // element, który musi być cały widoczny (domyślnie: rodzic bloków)
}
const PLAN: Record<string, Kaskada[]> = {
  '/': [
    { kody: ['S8', 'S10', 'S11', 'S13'] },
    { kody: ['S2'], sekwencja: { bloki: '.mozaika .kafel', naglowek: 'stoi', pierwszyPrzyWejsciu: true, pelny: '.mozaika' } },
    { kody: ['S4'], sekwencja: { bloki: '.bento > li', naglowek: 'stoi', pierwszyPrzyWejsciu: true, pelny: '.s4-wnetrze' } },
    { kody: ['S6'], czas: 450, krok: 140, odleglosc: 32, sekwencja: { bloki: '.os .blok', naglowek: 'stoi', stale: 1, pelny: '.s6-wnetrze' } },
    { kody: ['S9'], czas: 450, krok: 90, sekwencja: { bloki: '.schody > li', naglowek: 'wjezdza', naglowekSel: '.s9-naglowek h2', naKoniec: '.s9-naglowek > p', pelny: '.s9-wnetrze' } },
    { kody: ['S3'] },
  ],
  // Figma Motion 203:50: S2 punkty z prawej (480 px), S3 warianty z lewej (1400 px), po jednym. Na stronie krócej (160/240 px), żeby nie wypychać treści poza ekran.
  '/strony-internetowe': [
    { kody: ['S2'], kierunek: 'prawo', odleglosc: 160, krok: 250 },
    { kody: ['S3'], kierunek: 'lewo', odleglosc: 240, osobno: true },
    { kody: 'reszta' },
  ],
  '/automatyzacje': [{ kody: 'reszta' }],
  '/analiza-seo-geo': [
    { kody: ['S2'], kierunek: 'gora', krok: 80 },
    { kody: ['S3'], kierunek: 'lewo', krok: 80 },
    { kody: 'reszta' },
  ],
  '/realizacje': [{ kody: 'reszta' }],
  '/realizacje/*': [{ kody: 'reszta' }],
  '/pilotaze': [{ kody: 'reszta' }],
};
const planStrony = () => PLAN[sciezka] ?? (sciezka.startsWith('/realizacje/') ? PLAN['/realizacje/*'] : undefined);
// Segmenty z własnym ruchem albo bez ruchu: hero ma wjazd w CSS (animacje.css), stopka ma kurtynę.
const POMIN = ['S1', 'S14'];

// Bloki do kaskady: dzieci nagłówka segmentu, a potem dzieci list i siatek (karty). Jeden poziom, bez zagłębiania.
function bloki(seg: HTMLElement): HTMLElement[] {
  const wynik: HTMLElement[] = [];
  const kontener = (seg.querySelector(':scope > .kontener, :scope > div') ?? seg) as HTMLElement;
  const wezmij = (el: Element) => {
    const e = el as HTMLElement;
    if (e.hidden || e.matches('[role=tablist][hidden], script, style, [data-kopia], .sr-only')) return;
    const dzieci = [...e.children].filter((c) => !(c as HTMLElement).hidden && !c.matches('[data-kopia], script, style')) as HTMLElement[];
    const lista = e.matches('ul, ol, header, .naglowek, [class*=naglowek]') || (dzieci.length >= 2 && e.matches('[class*=karty], [class*=kafle], [class*=siatka], [class*=kolumny], [class*=lista], [class*=bloki]'));
    if (lista && dzieci.length >= 2) wynik.push(...dzieci);
    else wynik.push(e);
  };
  [...kontener.children].forEach(wezmij);
  return wynik.filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
}

function przesuniecie(k: Kierunek, d: number) {
  return k === 'gora' ? `translate3d(0, ${-d}px, 0)` : k === 'lewo' ? `translate3d(${-d}px, 0, 0)` : k === 'prawo' ? `translate3d(${d}px, 0, 0)` : `translate3d(0, ${d}px, 0)`;
}

// Sekwencja odsłaniania (opis przy interfejsie Sekwencja). Zwraca false, gdy segment nie pasuje (wtedy zwykła kaskada).
function sekwencja(seg: HTMLElement, k: Sekwencja, czas: number): boolean {
  const lista = [...seg.querySelectorAll<HTMLElement>(k.bloki)].filter((e) => e.offsetParent !== null);
  if (lista.length < 2) return false;
  const pelny = (k.pelny ? seg.querySelector<HTMLElement>(k.pelny) : lista[0].parentElement) ?? seg;
  const nagl = k.naglowek === 'wjezdza' && k.naglowekSel ? seg.querySelector<HTMLElement>(k.naglowekSel) : null;
  const koniec = k.naKoniec ? seg.querySelector<HTMLElement>(k.naKoniec) : null;
  const ukryte = lista.slice(k.stale ?? 0);
  const ukryj = (e: HTMLElement) => { e.style.opacity = '0'; e.style.transform = 'translate3d(0, 24px, 0)'; };
  [...ukryte, nagl, koniec].forEach((e) => e && ukryj(e));
  const pokaz = (e: HTMLElement, opoz = 0) => {
    e.style.transition = `opacity ${czas}ms var(--fk-krzywa-wejscie), transform ${czas}ms var(--fk-krzywa-wejscie)`;
    e.style.transitionDelay = `${opoz}ms`;
    requestAnimationFrame(() => { e.style.opacity = ''; e.style.transform = ''; });
    setTimeout(() => { e.style.transition = ''; e.style.transitionDelay = ''; }, czas + opoz + 50);
  };
  const KROK = 260; // blok po bloku: każdy następny startuje, gdy poprzedni jest w połowie wejścia
  let etap = 0; // 0 czeka, 1 pokazany pierwszy (przy wejściu), 2 wszystko
  const pasekWys = () => (html.classList.contains('pasek-schowany') ? 0 : parseFloat(getComputedStyle(html).getPropertyValue('--fk-wys-paska')) || 72);
  const sprawdz = () => {
    const r = pelny.getBoundingClientRect();
    if (nagl && nagl.style.opacity === '0' && nagl.getBoundingClientRect().top < innerHeight * 0.85) pokaz(nagl);
    if (etap === 0 && k.pierwszyPrzyWejsciu && ukryte[0] && ukryte[0].getBoundingClientRect().top < innerHeight * 0.85) { pokaz(ukryte[0]); etap = 1; }
    // „Pełen obraz”: cały segment na ekranie. Gdy jest wyższy niż ekran albo użytkownik przewinął szybko
    // i ominął ten moment, wystarczy, że góra segmentu dojdzie pod pasek (lub go minie).
    const widacCaly = r.bottom <= innerHeight + 4 && r.top >= pasekWys() - 4;
    // segment wyższy niż ekran: pełen obraz, gdy jego góra jest w górnych 15% ekranu
    const minal = r.top <= pasekWys() + (r.height > innerHeight - pasekWys() ? innerHeight * 0.15 : 16);
    if (etap < 2 && (widacCaly || minal)) {
      const reszta = etap === 1 ? ukryte.slice(1) : ukryte;
      reszta.forEach((e, i) => pokaz(e, i * KROK));
      if (koniec) pokaz(koniec, reszta.length * KROK + 120);
      if (nagl && nagl.style.opacity === '0') pokaz(nagl);
      etap = 2;
      removeEventListener('scroll', naScroll);
    }
  };
  let ramka = 0;
  const naScroll = () => { if (!ramka) ramka = requestAnimationFrame(() => { ramka = 0; sprawdz(); }); };
  addEventListener('scroll', naScroll, { passive: true });
  requestAnimationFrame(sprawdz);
  return true;
}

function kaskady() {
  const plan = planStrony();
  if (!plan || ograniczRuch() || !('IntersectionObserver' in window)) return;
  const wszystkie = [...document.querySelectorAll<HTMLElement>('[data-segment]')];
  const nazwane = plan.flatMap((p) => (p.kody === 'reszta' ? [] : p.kody));
  const pasuje = (s: HTMLElement, kody: string[]) => kody.some((k) => s.dataset.segment!.startsWith(`${k} `));
  plan.forEach((p) => {
    const segmenty = p.kody === 'reszta'
      ? wszystkie.filter((s) => !pasuje(s, POMIN) && !pasuje(s, nazwane))
      : p.kody.map(segment).filter(Boolean) as HTMLElement[];
    segmenty.forEach((seg) => {
      if (p.sekwencja && komputer.matches && sekwencja(seg, p.sekwencja, p.czas ?? 500)) return;
      const el = bloki(seg);
      if (!el.length) return;
      const czas = p.czas ?? 500, krok = p.krok ?? 60, max = p.max ?? 6;
      const kierunek = p.kierunek ?? 'dol';
      const start = przesuniecie(kierunek, p.odleglosc ?? 24);
      if (kierunek === 'lewo' || kierunek === 'prawo') seg.classList.add('ruch-poziomy');
      el.forEach((e) => { e.style.opacity = '0'; e.style.transform = start; });
      const pokaz = (e: HTMLElement, i: number) => {
        const opoz = p.osobno ? 0 : Math.min(i, max - 1) * krok;
        e.style.transition = `opacity ${czas}ms var(--fk-krzywa-wejscie), transform ${czas}ms var(--fk-krzywa-wejscie)`;
        e.style.transitionDelay = `${opoz}ms`;
        requestAnimationFrame(() => { e.style.opacity = ''; e.style.transform = ''; });
        // Po animacji czyścimy, żeby nie blokować własnych przejść elementu (najechanie, rozwinięcie).
        setTimeout(() => { e.style.transition = ''; e.style.transitionDelay = ''; }, czas + opoz + 50);
      };
      if (p.osobno) {
        // Każdy element osobno: odsłania się, gdy jego górna krawędź minie 85% wysokości ekranu.
        const obs = new IntersectionObserver((wpisy) => wpisy.forEach((w) => {
          if (!w.isIntersecting) return;
          obs.unobserve(w.target);
          pokaz(w.target as HTMLElement, 0);
        }), { rootMargin: '0px 0px -15% 0px' });
        el.forEach((e) => obs.observe(e));
        return;
      }
      const obs = new IntersectionObserver((wpisy) => {
        if (!wpisy.some((w) => w.isIntersecting)) return;
        obs.disconnect();
        el.forEach(pokaz);
      }, { rootMargin: '0px 0px -15% 0px' });
      // Segment odsłania się, gdy jego górna krawędź minie 85% wysokości ekranu (wcześniej: 30% segmentu).
      // Dzięki temu „kawałek S8” pod przyklejonym S7 nie jest pustym miejscem (Kacper 25.11).
      obs.observe(seg);
    });
  });
}

// ---------- 2. Stopka: kurtyna (translateY 30% → 0 liniowo ze scrollem na ostatnim odcinku) ----------
function kurtyna() {
  const panel = document.querySelector<HTMLElement>('.stopka-panel');
  if (!panel || ograniczRuch()) return;
  const stopka = panel.parentElement!;
  stopka.classList.add('kurtyna');
  let ramka = 0;
  const licz = () => {
    ramka = 0;
    const r = stopka.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / Math.min(r.height, innerHeight)));
    panel.style.transform = p >= 1 ? '' : `translate3d(0, ${(1 - p) * -30}%, 0)`;
  };
  addEventListener('scroll', () => { if (!ramka) ramka = requestAnimationFrame(licz); }, { passive: true });
  addEventListener('resize', licz);
  licz();
}

// ---------- 3. 27 S1: zmiana słów w H1 (efekt „scramble”, GSAP ScrambleText, pen QWzZwxR) ----------
// Słowo widoczne 2,5 s, potem rozsypuje się w losowe litery (duże i małe) i składa w następne: litery odsłaniają się
// od lewej po 20% czasu, długość płynnie przechodzi do długości nowego słowa (tweenLength), ease power2.inOut, 1,4 s.
// Przecinek stoi w HTML zaraz za słowem, więc przy krótszym słowie nie ma odstępu. Wysokość H1 = najwyższy wariant (nic nie skacze).
// Po 3 obiegach zostaje pierwsze słowo. Czytnik ekranu czyta pełne H1 z HTML (zmienna część aria-hidden).
function zmianaSlow() {
  const el = document.querySelector<HTMLElement>('[data-slowa]');
  if (!el) return;
  let slowa: string[] = [];
  try { slowa = JSON.parse(el.dataset.slowa!); } catch { return; }
  if (slowa.length < 2 || ograniczRuch()) return;
  const h1 = el.closest('h1') as HTMLElement;
  // Kacper 25.11 16:06: zmiana słów ciągła (bez końca); gdy nagłówek zmienia liczbę wierszy, podnagłówek płynnie jedzie razem z nim
  // (wysokość H1 przechodzi do wysokości nowego słowa w czasie rozsypywania liter, zamiast stałej rezerwy na najdłuższe słowo).
  const wysokoscDla = (w: string) => {
    const teraz = el.textContent; const h = h1.style.height;
    h1.style.height = ''; el.textContent = w;
    const wynik = h1.offsetHeight;
    el.textContent = teraz; h1.style.height = h;
    return wynik;
  };
  // Wysokość nigdy nie jest mniejsza niż tekst, który akurat widać: rośnie na początku zmiany (gdy nowe słowo
  // jest dłuższe), a maleje dopiero po ułożeniu liter — dzięki temu nagłówek nie nachodzi na podnagłówek.
  const CZAS_WYS = 700;
  const przejscie = `height ${CZAS_WYS}ms cubic-bezier(0.45, 0, 0.55, 1)`;
  h1.style.transition = przejscie;
  const ustawWysokosc = () => { h1.style.transition = 'none'; h1.style.height = `${wysokoscDla(el.textContent ?? '')}px`; void h1.offsetHeight; h1.style.transition = przejscie; };
  ustawWysokosc();
  document.fonts?.ready.then(ustawWysokosc);
  addEventListener('resize', ustawWysokosc);
  const ZNAKI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const los = () => ZNAKI[Math.floor(Math.random() * ZNAKI.length)];
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2); // power2.inOut
  const CZAS = 1400, ODSLONA_OD = 0.2;
  const rozsyp = (z: string, na: string, gotowe: () => void) => {
    const start = performance.now();
    let ostatnia = 0;
    const klatka = (teraz: number) => {
      const t = Math.min(1, (teraz - start) / CZAS);
      if (teraz - ostatnia > 45 || t === 1) { // losowe litery zmieniamy co ok. 45 ms, nie w każdej klatce
        ostatnia = teraz;
        const e = ease(t);
        const dl = Math.round(z.length + (na.length - z.length) * e);
        const odsl = Math.floor(Math.max(0, (e - ODSLONA_OD) / (1 - ODSLONA_OD)) * na.length);
        let tekst = na.slice(0, odsl);
        for (let i = odsl; i < dl; i++) tekst += na[i] === ' ' || (i >= na.length && z[i] === ' ') ? ' ' : los();
        el.textContent = t === 1 ? na : tekst;
        // losowe litery bywają szersze i mogą na chwilę dodać wiersz — wtedy wysokość od razu go obejmuje
        if (h1.scrollHeight > h1.clientHeight + 1) h1.style.height = `${h1.scrollHeight}px`;
      }
      if (t < 1) requestAnimationFrame(klatka); else gotowe();
    };
    requestAnimationFrame(klatka);
  };
  let i = 0;
  const nastepne = () => {
    const z = slowa[i];
    i = (i + 1) % slowa.length;
    const nowa = wysokoscDla(slowa[i]);
    if (nowa > h1.offsetHeight) h1.style.height = `${nowa}px`; // podnagłówek jedzie w dół razem z nagłówkiem
    rozsyp(z, slowa[i], () => {
      h1.style.height = `${wysokoscDla(slowa[i])}px`; // …a w górę dopiero po ułożeniu słowa
      setTimeout(nastepne, 2500);
    });
  };
  setTimeout(nastepne, 2500);
}

// ---------- 3b. Terminal macOS przed ilustracją hero (28 plansza 461:1738; Kacper 25.11: także 27 S1) ----------
// Polecenia pisane 30 ms na znak, linie wyniku od razu (przerwa 220 ms); potem terminal gaśnie 400 ms
// i po kolei (co 150 ms) pojawiają się elementy [data-po-terminalu]. Raz na wejście. Bez ruchu: od razu stan końcowy.
function terminale() {
  document.querySelectorAll<HTMLElement>('[data-terminal-scena]').forEach((scena) => {
    const term = scena.querySelector<HTMLElement>('[data-terminal]');
    if (!term || ograniczRuch()) return;
    const linie = [...term.querySelectorAll<HTMLElement>('[data-linia]')];
    const elementy = [...scena.querySelectorAll<HTMLElement>('[data-po-terminalu]')];
    elementy.forEach((e) => { e.style.opacity = '0'; e.style.transform = 'translate3d(0, 16px, 0)'; });
    scena.classList.add('terminal-gra');
    const czekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await czekaj(450); // po wjeździe hero (fk-wejscie 200–400 ms)
      for (const l of linie) {
        const tekst = l.dataset.linia ?? '';
        if (tekst.startsWith('$')) {
          l.classList.add('pisze');
          for (let i = 1; i <= tekst.length; i++) { l.textContent = tekst.slice(0, i); await czekaj(30); }
          l.classList.remove('pisze');
          await czekaj(180);
        } else { l.textContent = tekst; await czekaj(220); }
      }
      await czekaj(250);
      scena.classList.add('terminal-koniec');
      await czekaj(400);
      scena.classList.remove('terminal-gra', 'terminal-koniec');
      elementy.forEach((e, i) => {
        e.style.transition = 'opacity 450ms var(--fk-krzywa-wejscie), transform 450ms var(--fk-krzywa-wejscie)';
        e.style.transitionDelay = `${i * 150}ms`;
        requestAnimationFrame(() => { e.style.opacity = ''; e.style.transform = ''; });
        setTimeout(() => { e.style.transition = ''; e.style.transitionDelay = ''; }, 500 + i * 150);
      });
    })();
  });
}

// ---------- 4. 27 S7: oś procesu ----------
// Linia akcentu rośnie ze scrollem 0 → 100%; węzeł robi się aktywny (200 ms), gdy linia go dosięgnie;
// klik / Enter rozwija krok (280 ms), jeden naraz. Bez ruchu: linia pełna, wszystkie węzły aktywne, krok 1 rozwinięty.
function osProcesu() {
  const os = document.querySelector<HTMLElement>('[data-os-procesu]');
  if (!os) return;
  const kroki = [...os.querySelectorAll<HTMLElement>('[data-krok-procesu]')];
  kroki.forEach((k) => {
    const przycisk = k.querySelector<HTMLButtonElement>('[data-krok-przycisk]');
    przycisk?.addEventListener('click', () => {
      if (os.closest('.stos-krokow')) return; // komputer: wszystkie etapy rozwinięte w stosie (punkt 8)
      const otworz = !k.classList.contains('rozwiniety');
      kroki.forEach((x) => {
        const wl = x === k && otworz;
        x.classList.toggle('rozwiniety', wl);
        x.querySelector('[data-krok-przycisk]')?.setAttribute('aria-expanded', String(wl));
      });
    });
  });
  if (ograniczRuch()) { os.classList.add('pelna'); kroki.forEach((k) => k.classList.add('aktywny')); return; }
  const wezly = kroki.map((k) => k.querySelector<HTMLElement>('.wezel'));
  let ramka = 0;
  const licz = () => {
    ramka = 0;
    const r = os.getBoundingClientRect();
    const linia = innerHeight * 0.6; // linia „dosięga” punktu na 60% wysokości ekranu
    const p = Math.min(1, Math.max(0, (linia - r.top) / r.height));
    os.style.setProperty('--postep-osi', String(p));
    wezly.forEach((w, i) => { if (w) kroki[i].classList.toggle('aktywny', w.getBoundingClientRect().top + w.offsetHeight / 2 <= linia); });
  };
  addEventListener('scroll', () => { if (!ramka) ramka = requestAnimationFrame(licz); }, { passive: true });
  addEventListener('resize', licz);
  licz();
}

// ---------- 5. 30 S6: liczby lejka liczą w dół (900 ms) przy wejściu w widok ----------
function lejek() {
  const box = document.querySelector<HTMLElement>('[data-lejek]');
  if (!box || ograniczRuch() || !('IntersectionObserver' in window)) return;
  const liczby = [...box.querySelectorAll<HTMLElement>('[data-liczba]')];
  if (!liczby.length) return;
  const start = Math.max(...liczby.map((l) => Number(l.dataset.liczba)));
  const fmt = (n: number, ulamek: boolean) => ulamek ? n.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : Math.round(n).toLocaleString('pl-PL');
  const obs = new IntersectionObserver((w) => {
    if (!w[0].isIntersecting) return;
    obs.disconnect();
    const t0 = performance.now();
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      liczby.forEach((l) => {
        const cel = Number(l.dataset.liczba);
        const od = l.dataset.od ? Number(l.dataset.od) : start;
        const ulamek = !Number.isInteger(cel);
        const tekst = fmt(od + (cel - od) * e, ulamek);
        const wart = l.querySelector('[data-wartosc]') ?? l;
        wart.textContent = p < 1 ? tekst : l.dataset.koniec ?? tekst;
      });
      if (p < 1) requestAnimationFrame(krok);
    };
    requestAnimationFrame(krok);
  }, { threshold: 0.3 });
  obs.observe(box);
}

// ---------- 6. 29 S4: blok zmienia się przy przewijaniu (od 1024 px) ----------
// Sekcja ma wysokość 3 ekranów, środek przyklejony; 0–33% blok 1, 33–66% blok 2, 66–100% blok 3.
// Wymiana: zanik 200 ms + y 16 → 0 w 320 ms. Telefon i „ogranicz ruch”: zakładki jak dotąd.
function blokiPrzewijane() {
  const seg = document.querySelector<HTMLElement>('[data-bloki-przewijane]');
  if (!seg || ograniczRuch()) return;
  const zakladki = [...seg.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  if (zakladki.length < 2) return;
  let ramka = 0, ostatni = -1;
  const licz = () => {
    ramka = 0;
    if (!komputer.matches) return;
    const r = seg.getBoundingClientRect();
    const zakres = r.height - innerHeight;
    if (zakres <= 0) return;
    const p = Math.min(0.999, Math.max(0, -r.top / zakres));
    const i = Math.floor(p * zakladki.length);
    if (i !== ostatni) { ostatni = i; zakladki[i].click(); }
  };
  const tryb = () => { seg.classList.toggle('przewijane', komputer.matches); licz(); };
  komputer.addEventListener('change', tryb);
  addEventListener('scroll', () => { if (!ramka) ramka = requestAnimationFrame(licz); }, { passive: true });
  // Klik w zakładkę na komputerze przewija do jej odcinka sekcji, żeby przewijanie i zakładki się zgadzały.
  zakladki.forEach((z, i) => z.addEventListener('click', (e) => {
    if (!komputer.matches || !e.isTrusted) return;
    const zakres = seg.offsetHeight - innerHeight;
    scrollTo({ top: seg.offsetTop + (zakres * (i + 0.5)) / zakladki.length, behavior: 'smooth' });
  }));
  tryb();
}

// ---------- 7. 27 S5: dwa paski realizacji w pętli, w przeciwne strony (komputer, Figma Motion 100:30) ----------
// Rząd 1 jedzie w lewo, rząd 2 w prawo. Kafle oryginalne zostają w DOM (linki, fokus), kopie są aria-hidden + inert.
// WCAG 2.2.2: ruch staje po najechaniu, przy fokusie klawiatury, przyciskiem „Zatrzymaj” i poza ekranem.
// Tempo: 50 px/s (makieta: 1332 px w 12,4 s ≈ 107 px/s; to tempo pokazowe osi czasu, przy czytaniu za szybkie).
function pasyRealizacji() {
  const ul = document.querySelector<HTMLElement>('#realizacje .kafle');
  if (!ul || ograniczRuch()) return;
  let zbudowane: { pasy: HTMLElement; powrot: { el: HTMLElement; nast: Node | null }[] } | null = null;
  const kopia = (c: HTMLElement) => {
    const x = c.cloneNode(true) as HTMLElement;
    x.setAttribute('aria-hidden', 'true'); x.inert = true; x.dataset.kopiaPasa = '';
    x.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    return x;
  };
  const zbuduj = () => {
    if (zbudowane || !komputer.matches) return;
    const kafle = [...ul.children].filter((c) => c.matches('.kafel') && !c.hasAttribute('data-kopia')) as HTMLElement[];
    if (kafle.length < 2) return;
    const powrot = kafle.map((el) => ({ el, nast: el.nextSibling }));
    const pol = Math.ceil(kafle.length / 2);
    const szer = 424 + 20; // kafel + odstęp
    const pasy = document.createElement('div');
    pasy.className = 'pasy';
    [kafle.slice(0, pol), kafle.slice(pol)].forEach((rzad, r) => {
      const pas = document.createElement('div');
      pas.className = r ? 'pas pas--wstecz' : 'pas';
      const tor = document.createElement('ul');
      tor.setAttribute('role', 'list');
      tor.className = 'pas-tor';
      tor.append(...rzad);
      // Jeden zestaw musi być szerszy od pasa, potem całość podwajamy: przesunięcie o -50% = płynna pętla.
      let zestaw = rzad.length;
      while (zestaw * szer < ul.offsetWidth + szer) { rzad.forEach((c) => tor.append(kopia(c))); zestaw += rzad.length; }
      [...tor.children].forEach((c) => tor.append(kopia(c as HTMLElement)));
      tor.style.setProperty('--czas', `${Math.round((zestaw * szer) / 50)}s`);
      pas.append(tor);
      pasy.append(pas);
    });
    const przycisk = document.createElement('button');
    przycisk.type = 'button';
    przycisk.className = 'pas-stop t-maly';
    przycisk.setAttribute('aria-pressed', 'false');
    przycisk.textContent = 'Zatrzymaj przesuwanie';
    przycisk.addEventListener('click', () => {
      const stop = pasy.classList.toggle('stop');
      przycisk.setAttribute('aria-pressed', String(stop));
      przycisk.textContent = stop ? 'Wznów przesuwanie' : 'Zatrzymaj przesuwanie';
    });
    pasy.append(przycisk);
    ul.before(pasy);
    new IntersectionObserver((w) => pasy.classList.toggle('poza', !w[0].isIntersecting)).observe(pasy);
    zbudowane = { pasy, powrot };
  };
  const rozbierz = () => {
    if (!zbudowane || komputer.matches) return;
    zbudowane.powrot.slice().reverse().forEach(({ el, nast }) => ul.insertBefore(el, nast && nast.parentNode === ul ? nast : null));
    zbudowane.pasy.remove();
    zbudowane = null;
  };
  zbuduj();
  komputer.addEventListener('change', () => { zbuduj(); rozbierz(); });
}

// ---------- 8. 27 S7: etapy nakładane od dołu, na końcu blok „Start” (plansza 443:5802, Kacper 23.11 17:31) ----------
// Komputer: sekcja przyklejona na czas sekwencji. Każdy krok przewinięcia wsuwa od dołu kolejny etap (y +420 → 0, 500 ms)
// na wierzch poprzedniego; poprzednie wystają po 14 px. Po etapie 6 stos złącza się w jeden (300 ms), a w jego miejscu
// pojawia się „Start” (zanik 240 ms). Telefon i „ogranicz ruch”: zwykła lista etapów pod sobą (bez przyklejania).
function stosProcesu() {
  const sekcja = document.querySelector<HTMLElement>('[data-segment="S7 Proces"]');
  const os = sekcja?.querySelector<HTMLElement>('[data-os-procesu]');
  if (!sekcja || !os || ograniczRuch()) return;
  const etapy = [...os.querySelectorAll<HTMLElement>('[data-krok-procesu]')];
  const start = os.querySelector<HTMLElement>('.krok.start');
  const przyciski = etapy.map((k) => k.querySelector<HTMLButtonElement>('[data-krok-przycisk]'));
  const stanyPoczatkowe = etapy.map((k) => k.classList.contains('rozwiniety'));
  const kroki = etapy.length + 1; // etapy + „Start”
  const wnetrze = sekcja.querySelector<HTMLElement>('.s7-wnetrze') ?? os;
  let wlaczony = false, ramka = 0, koniec = innerHeight;
  const licz = () => {
    ramka = 0;
    const zakres = sekcja.offsetHeight - koniec;
    const p = Math.min(0.9999, Math.max(0, -sekcja.getBoundingClientRect().top / Math.max(1, zakres)));
    const stan = Math.floor(p * kroki);
    const wierzch = Math.min(stan, etapy.length - 1);
    etapy.forEach((k, i) => {
      k.classList.toggle('na-stosie', i <= stan);
      k.classList.toggle('na-wierzchu', i === wierzch && stan < etapy.length);
      k.style.setProperty('--glebia', String(Math.max(0, wierzch - i)));
    });
    sekcja.classList.toggle('zlaczone', stan >= etapy.length);
  };
  const naScroll = () => { if (!ramka) ramka = requestAnimationFrame(licz); };
  const wymiary = () => {
    os.style.removeProperty('--wys-karty');
    const wys = Math.max(...[...etapy, start].filter(Boolean).map((k) => k!.querySelector<HTMLElement>('.tresc')!.offsetHeight));
    os.style.setProperty('--wys-karty', `${wys}px`);
    sekcja.style.setProperty('--kroki', String(kroki));
    // Kacper 25.11: pusta przestrzeń pod przyklejoną kartą o połowę mniejsza, żeby na końcu było widać kawałek S8.
    // Wolne miejsce = ekran − odstęp od góry − wnętrze − dolny padding sekcji; sekcja kończy się w połowie tego miejsca.
    const gora = parseFloat(getComputedStyle(wnetrze).top) || 0;
    const dol = parseFloat(getComputedStyle(sekcja).paddingBottom) || 0;
    const wolne = Math.max(0, innerHeight - gora - wnetrze.offsetHeight - dol);
    // Następny segment zaczyna się od własnego paddingu; odejmujemy go, żeby w połowie wolnego miejsca było widać treść S8, nie pusty margines.
    const nast = sekcja.nextElementSibling as HTMLElement | null;
    const nastPad = nast ? parseFloat(getComputedStyle(nast).paddingTop) || 0 : 0;
    koniec = Math.max(gora + wnetrze.offsetHeight + dol, innerHeight - wolne / 2 - nastPad);
    sekcja.style.height = `${Math.round(koniec + kroki * 0.6 * innerHeight)}px`;
  };
  const wlacz = () => {
    if (wlaczony) return;
    wlaczony = true;
    sekcja.classList.add('stos-krokow');
    etapy.forEach((k, i) => { k.classList.add('rozwiniety'); k.style.zIndex = String(i + 1); });
    if (start) start.style.zIndex = String(kroki + 1);
    przyciski.forEach((b) => { b?.setAttribute('aria-expanded', 'true'); b?.setAttribute('tabindex', '-1'); });
    wymiary();
    licz();
    addEventListener('scroll', naScroll, { passive: true });
    addEventListener('resize', wymiary);
  };
  const wylacz = () => {
    if (!wlaczony) return;
    wlaczony = false;
    removeEventListener('scroll', naScroll);
    removeEventListener('resize', wymiary);
    sekcja.classList.remove('stos-krokow', 'zlaczone');
    sekcja.style.removeProperty('height');
    etapy.forEach((k, i) => {
      k.classList.remove('na-stosie', 'na-wierzchu');
      k.classList.toggle('rozwiniety', stanyPoczatkowe[i]);
      k.style.removeProperty('--glebia'); k.style.zIndex = '';
      przyciski[i]?.setAttribute('aria-expanded', String(stanyPoczatkowe[i]));
      przyciski[i]?.removeAttribute('tabindex');
    });
    if (start) start.style.zIndex = '';
  };
  if (komputer.matches) wlacz();
  komputer.addEventListener('change', () => (komputer.matches ? wlacz() : wylacz()));
}

kaskady();
kurtyna();
zmianaSlow();
terminale();
osProcesu();
lejek();
blokiPrzewijane();
pasyRealizacji();
stosProcesu();
