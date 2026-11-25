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
interface Kaskada { kody: string[] | 'reszta'; czas?: number; krok?: number; odleglosc?: number; kierunek?: Kierunek; max?: number; osobno?: boolean }
const PLAN: Record<string, Kaskada[]> = {
  '/': [
    { kody: ['S2', 'S8', 'S10', 'S11', 'S13'] },
    { kody: ['S6'], czas: 450, krok: 140, odleglosc: 32 },
    { kody: ['S9'], czas: 450, krok: 90 },
    // Figma Motion 100:30: kroki 2–6 wjeżdżają z 120 px, po kolei.
    { kody: ['S7'], odleglosc: 120, osobno: true },
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
      }, seg.offsetHeight > innerHeight * 2 ? { rootMargin: '0px 0px -30% 0px' } : { threshold: 0.3 });
      // Próg 30% liczony od segmentu; przy bardzo wysokich segmentach wystarczy, że wejdzie na 30% ekranu.
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

// ---------- 3. 27 S1: zmiana słów w H1 ----------
// Plansza 529:2269: słowo widoczne 2,5 s; wymiana 0,6 s, litery z opóźnieniem 30 ms; stare litery w górę i gasną, nowe wjeżdżają od dołu.
// Po 3 obiegach zatrzymuje się na pierwszym słowie. Czytnik ekranu czyta pełne H1 z HTML (zmienna część aria-hidden).
function zmianaSlow() {
  const box = document.querySelector<HTMLElement>('[data-slowa]');
  if (!box) return;
  let slowa: string[] = [];
  try { slowa = JSON.parse(box.dataset.slowa!); } catch { return; }
  if (slowa.length < 2 || ograniczRuch()) return;
  const widok = box.querySelector<HTMLElement>('[data-slowa-widok]')!;
  const litery = (s: string, klasa: string) => {
    const w = document.createElement('span');
    w.className = `slowo ${klasa}`;
    [...s].forEach((ch, i) => {
      if (ch === ' ') { w.append(' '); return; } // zwykła spacja: słowo może się złamać na wąskim ekranie
      const l = document.createElement('span');
      l.className = 'litera';
      l.textContent = ch === ' ' ? ' ' : ch;
      l.style.transitionDelay = `${i * 30}ms`;
      w.append(l);
    });
    return w;
  };
  let i = 0, obiegi = 0;
  let aktualne = litery(slowa[0], 'jest');
  widok.replaceChildren(aktualne);
  const nastepne = () => {
    i = (i + 1) % slowa.length;
    if (i === 0) obiegi++;
    const nowe = litery(slowa[i], 'wchodzi');
    widok.append(nowe);
    const stare = aktualne;
    requestAnimationFrame(() => requestAnimationFrame(() => { stare.className = 'slowo wychodzi'; nowe.className = 'slowo jest'; }));
    setTimeout(() => stare.remove(), 600 + slowa[i].length * 30 + 400);
    aktualne = nowe;
    if (obiegi >= 3 && i === 0) return;
    setTimeout(nastepne, 2500 + 600);
  };
  setTimeout(nastepne, 2500);
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

kaskady();
kurtyna();
zmianaSlow();
osProcesu();
lejek();
blokiPrzewijane();
pasyRealizacji();
