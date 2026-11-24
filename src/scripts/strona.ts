// Zachowania wspólne dla wszystkich stron (jeden mały moduł, bez bibliotek). Strona działa bez niego: treść jest w HTML,
// a każdy element ma wersję „bez JS” (przyciski-27-29.md, kolumna „Bez JS”).
// Spis: 1 pasek i postęp przewijania, 2 boczny wskaźnik segmentów, 3 motyw, 4 dostępność, 5 sheety i menu, 6 formularz,
// 7 wskaźniki swipe, 8 akordeon, 9 zakładki, 10 rozwijanie grupowe (S8) i stosy kart (S10).

const html = document.documentElement;
const ograniczRuch = () => html.classList.contains('bez-ruchu') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const zapisz = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* tryb prywatny */ } };
const czytaj = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

// ---------- 1. Pasek: chowa się przy przewijaniu w dół, wraca w górę (próg 80 px). Pasek postępu 0–100%. ----------
const PROG = 80;
const postep = document.querySelector<HTMLElement>('[data-postep]');
let ostatnieY = scrollY;
let klatka = 0;
function naPrzewiniecie() {
  klatka = 0;
  const y = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  const proc = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  if (postep) postep.style.transform = `scaleX(${proc})`;
  const wDol = y > ostatnieY;
  if (Math.abs(y - ostatnieY) > 4) {
    html.classList.toggle('pasek-schowany', wDol && y > PROG && !document.querySelector('dialog[open]'));
    ostatnieY = y;
  }
  if (y <= PROG) html.classList.remove('pasek-schowany');
  aktualizujWskaznik(proc);
}
addEventListener('scroll', () => { if (!klatka) klatka = requestAnimationFrame(naPrzewiniecie); }, { passive: true });
// Fokus z klawiatury w schowanym pasku: pokaż pasek.
document.querySelector('[data-pasek]')?.addEventListener('focusin', () => html.classList.remove('pasek-schowany'));

// ---------- 2. Boczny wskaźnik segmentów (od 1024 px) ----------
const wskaznik = document.querySelector<HTMLElement>('[data-wskaznik]');
const lista = document.querySelector<HTMLOListElement>('[data-wskaznik-lista]');
const pozycja = document.querySelector<HTMLElement>('[data-wskaznik-pozycja]');
const segmenty = [...document.querySelectorAll<HTMLElement>('[data-segment]')];
let linkiSeg: HTMLAnchorElement[] = [];
function zbudujWskaznik() {
  if (!wskaznik || !lista || !segmenty.length) return;
  const calosc = document.documentElement.scrollHeight;
  const wys = wskaznik.clientHeight;
  lista.replaceChildren();
  linkiSeg = [];
  segmenty.forEach((s, i) => {
    if (!s.id) s.id = `segment-${i + 1}`;
    const li = document.createElement('li');
    const gora = (s.offsetTop / calosc) * wys;
    li.style.top = `${gora}px`;
    li.style.height = `${Math.max(4, (s.offsetHeight / calosc) * wys - 3)}px`;
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.textContent = s.dataset.segment ?? '';
    li.append(a);
    lista.append(li);
    linkiSeg.push(a);
  });
  wskaznik.querySelectorAll<HTMLElement>('[data-proc]').forEach((k) => { k.style.top = `${(Number(k.dataset.proc) / 100) * wys}px`; });
  wskaznik.hidden = false;
}
function aktualizujWskaznik(proc: number) {
  if (!wskaznik || wskaznik.hidden) return;
  if (pozycja) pozycja.style.top = `${proc * wskaznik.clientHeight}px`;
  const srodek = scrollY + innerHeight / 3;
  let aktywny = 0;
  segmenty.forEach((s, i) => { if (s.offsetTop <= srodek) aktywny = i; });
  linkiSeg.forEach((a, i) => a.setAttribute('aria-current', String(i === aktywny)));
}
addEventListener('load', () => { zbudujWskaznik(); naPrzewiniecie(); });
addEventListener('resize', () => { zbudujWskaznik(); naPrzewiniecie(); });
zbudujWskaznik();
naPrzewiniecie();

// ---------- 3. Motyw jasny / ciemny (W12) ----------
const motyw = document.querySelector<HTMLButtonElement>('[data-motyw]');
const ustawMotyw = (ciemny: boolean) => {
  if (ciemny) html.dataset.theme = 'dark'; else delete html.dataset.theme;
  motyw?.setAttribute('aria-checked', String(ciemny));
};
ustawMotyw(html.dataset.theme === 'dark');
motyw?.addEventListener('click', () => {
  const ciemny = html.dataset.theme !== 'dark';
  ustawMotyw(ciemny);
  zapisz('fk-motyw', ciemny ? 'dark' : 'light');
});

// ---------- 4. Dostępność (W10): większy tekst, kontrast, bez animacji ----------
const przelaczniki = [...document.querySelectorAll<HTMLButtonElement>('[data-przelacznik]')];
przelaczniki.forEach((p) => {
  const klasa = p.dataset.przelacznik!;
  p.setAttribute('aria-checked', String(html.classList.contains(klasa)));
  p.addEventListener('click', () => {
    const wl = !html.classList.contains(klasa);
    html.classList.toggle(klasa, wl);
    p.setAttribute('aria-checked', String(wl));
    zapisz('fk-dostepnosc', JSON.stringify(przelaczniki.map((x) => x.dataset.przelacznik!).filter((k) => html.classList.contains(k))));
  });
});

// ---------- 5. Sheety (<dialog>) i menu mobilne ----------
let otwierajacy: HTMLElement | null = null;
function otworz(d: HTMLDialogElement, zrodlo: HTMLElement | null) {
  otwierajacy = zrodlo;
  html.classList.remove('pasek-schowany');
  d.showModal();
  const pierwsze = d.querySelector<HTMLElement>('input:not([type=hidden]):not([tabindex="-1"]), [data-link-menu], [role=switch]');
  pierwsze?.focus();
}
function zamknij(d: HTMLDialogElement) { d.close(); }
document.querySelectorAll<HTMLDialogElement>('dialog').forEach((d) => {
  d.addEventListener('close', () => {
    const doFokusu = otwierajacy;
    otwierajacy = null;
    if (d.id === 'menu-mobilne') document.querySelector('[data-otworz-menu]')?.setAttribute('aria-expanded', 'false');
    if (doFokusu?.isConnected && doFokusu.offsetParent !== null) doFokusu.focus();
  });
  // Klik w zasłonę zamyka.
  d.addEventListener('click', (e) => { if (e.target === d) zamknij(d); });
  d.querySelectorAll('[data-zamknij-sheet], [data-zamknij-menu]').forEach((b) => b.addEventListener('click', () => zamknij(d)));
});
document.addEventListener('click', (e) => {
  const cel = (e.target as HTMLElement).closest<HTMLElement>('[data-otworz-sheet]');
  if (!cel) return;
  const d = document.getElementById(cel.dataset.otworzSheet!) as HTMLDialogElement | null;
  if (!d) return;
  e.preventDefault();
  const menu = cel.closest('dialog');
  // Z menu mobilnego: zamknij menu, fokus po sheecie wraca na przycisk menu.
  const zrodlo = menu ? document.querySelector<HTMLElement>('[data-otworz-menu]') : cel;
  if (menu) { otwierajacy = null; (menu as HTMLDialogElement).close(); }
  const opis = cel.dataset.opis;
  if (opis) { const pole = d.querySelector<HTMLTextAreaElement>('textarea[name=opis]'); if (pole && !pole.value) pole.value = opis; }
  otworz(d, zrodlo);
});
const menuPrzycisk = document.querySelector<HTMLButtonElement>('[data-otworz-menu]');
const menu = document.getElementById('menu-mobilne') as HTMLDialogElement | null;
menuPrzycisk?.addEventListener('click', () => {
  if (!menu) return;
  menuPrzycisk.setAttribute('aria-expanded', 'true');
  otworz(menu, menuPrzycisk);
});
menu?.querySelectorAll<HTMLAnchorElement>('a[data-link-menu]:not([data-otworz-sheet])').forEach((a) => a.addEventListener('click', () => menu.close()));
matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menu?.open) menu.close(); });

// ---------- 6. Formularz „Opisz projekt” (stany R19: błąd pola, wysyłanie, błąd wysyłki, sukces) ----------
document.querySelectorAll<HTMLFormElement>('[data-formularz]').forEach((f) => {
  const wyslij = f.querySelector<HTMLButtonElement>('[data-wyslij]')!;
  const bladWysylki = f.querySelector<HTMLElement>('[data-blad-wysylki]')!;
  const sukces = f.nextElementSibling as HTMLElement;
  const pola = [...f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]')];
  const sprawdz = (p: HTMLInputElement | HTMLTextAreaElement) => {
    const ok = p.value.trim() !== '' && (p.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.value.trim()));
    const blad = document.getElementById(`${p.id}-blad`);
    p.setAttribute('aria-invalid', String(!ok));
    const opisy = (p.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== blad?.id);
    if (!ok && blad) opisy.push(blad.id);
    if (opisy.length) p.setAttribute('aria-describedby', opisy.join(' ')); else p.removeAttribute('aria-describedby');
    if (blad) blad.hidden = ok;
    return ok;
  };
  pola.forEach((p) => p.addEventListener('blur', () => { if (p.getAttribute('aria-invalid')) sprawdz(p); }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const zle = pola.filter((p) => !sprawdz(p));
    if (zle.length) { zle[0].focus(); return; }
    bladWysylki.hidden = true;
    f.setAttribute('aria-busy', 'true');
    pola.forEach((p) => (p.readOnly = true));
    wyslij.setAttribute('aria-busy', 'true');
    wyslij.textContent = 'Wysyłam…';
    try {
      const odp = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!odp.ok) throw new Error(String(odp.status));
      const email = (f.querySelector('input[type=email]') as HTMLInputElement).value;
      f.hidden = true;
      sukces.hidden = false;
      sukces.querySelector('[data-sukces-email]')!.textContent = email;
      sukces.querySelector<HTMLElement>('[data-sukces-naglowek]')?.focus();
    } catch {
      bladWysylki.hidden = false;
      wyslij.textContent = 'Spróbuj ponownie';
    } finally {
      f.removeAttribute('aria-busy');
      wyslij.removeAttribute('aria-busy');
      pola.forEach((p) => (p.readOnly = false));
    }
  });
});

// ---------- 7. Wskaźnik swipe (telefon): aktywna kropka = karta przy lewej krawędzi ----------
document.querySelectorAll<HTMLElement>('[data-swipe]').forEach((tor) => {
  const kropki = [...(document.getElementById(tor.dataset.swipe!)?.querySelectorAll('li') ?? [])];
  const licznik = document.getElementById(tor.dataset.swipe!)?.querySelector('[data-licznik]');
  if (!kropki.length) return;
  let k = 0;
  tor.addEventListener('scroll', () => {
    cancelAnimationFrame(k);
    k = requestAnimationFrame(() => {
      const karty = ([...tor.children] as HTMLElement[]).filter((c) => c.offsetWidth > 0);
      const lewa = tor.getBoundingClientRect().left;
      let i = 0;
      karty.forEach((c, n) => { if (c.getBoundingClientRect().left - lewa < c.offsetWidth / 2) i = n; });
      kropki.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
      if (licznik) licznik.textContent = `${i + 1} z ${kropki.length}`;
    });
  }, { passive: true });
});

// ---------- 8. Akordeon (S11): jedno pytanie naraz ----------
document.querySelectorAll<HTMLElement>('[data-akordeon]').forEach((grupa) => {
  const przyciski = [...grupa.querySelectorAll<HTMLButtonElement>('button[aria-controls]')];
  przyciski.forEach((b) => b.addEventListener('click', () => {
    const otworz = b.getAttribute('aria-expanded') !== 'true';
    przyciski.forEach((x) => {
      const wl = x === b && otworz;
      x.setAttribute('aria-expanded', String(wl));
      const panel = document.getElementById(x.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !wl;
      x.closest('[data-pytanie]')?.classList.toggle('otwarte', wl);
    });
  }));
});

// ---------- 9. Zakładki (S13): strzałki ←/→, Home/End ----------
document.querySelectorAll<HTMLElement>('[role=tablist]').forEach((lista) => {
  const zakladki = [...lista.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  const wybierz = (z: HTMLButtonElement, fokus = true) => {
    zakladki.forEach((x) => {
      const wl = x === z;
      x.setAttribute('aria-selected', String(wl));
      x.tabIndex = wl ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !wl;
    });
    if (fokus) z.focus();
  };
  zakladki.forEach((z, i) => {
    z.addEventListener('click', () => wybierz(z, false));
    z.addEventListener('keydown', (e) => {
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? zakladki.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      wybierz(zakladki[(n + zakladki.length) % zakladki.length]);
    });
  });
  // Bez JS wszystkie panele są widoczne jedna pod drugą; z JS tylko wybrany.
  const start = zakladki.find((z) => z.getAttribute('aria-selected') === 'true') ?? zakladki[0];
  if (start) wybierz(start, false);
  lista.hidden = false;
});

// ---------- 10a. Rozwijanie grupowe (S8): klik w dowolnym „Co zawiera” rozwija wszystkie trzy pakiety ----------
document.querySelectorAll<HTMLElement>('[data-rozwin-grupa]').forEach((grupa) => {
  const przyciski = [...grupa.querySelectorAll<HTMLButtonElement>('[data-rozwin]')];
  const listy = przyciski.map((b) => document.getElementById(b.dataset.rozwin!)).filter(Boolean) as HTMLElement[];
  przyciski.forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', listy.map((l) => l.id).join(' '));
    b.addEventListener('click', () => {
      const wl = b.getAttribute('aria-expanded') !== 'true';
      przyciski.forEach((x) => x.setAttribute('aria-expanded', String(wl)));
      listy.forEach((l) => (l.hidden = !wl));
      grupa.classList.toggle('rozwiniete', wl);
    });
  });
  listy.forEach((l) => (l.hidden = true));
});

// ---------- 10b. Stos kart (S10): „+N warstwy” rozkłada stos w listę, „Zwiń warstwy” składa ----------
document.querySelectorAll<HTMLElement>('[data-stos]').forEach((stos) => {
  const b = stos.querySelector<HTMLButtonElement>('[data-stos-przycisk]');
  const etykieta = b?.querySelector('[data-stos-etykieta]');
  const podpis = b?.querySelector<HTMLElement>('[data-stos-podpis]');
  if (!b || !etykieta) return;
  const zwiniety = etykieta.textContent;
  stos.classList.add('zlozony');
  b.setAttribute('aria-expanded', 'false');
  b.addEventListener('click', () => {
    const wl = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(wl));
    stos.classList.toggle('zlozony', !wl);
    etykieta.textContent = wl ? 'Zwiń warstwy' : zwiniety;
    if (podpis) podpis.hidden = wl;
    if (!ograniczRuch() && wl) stos.classList.add('w-ruchu');
    setTimeout(() => stos.classList.remove('w-ruchu'), 800);
  });
});
