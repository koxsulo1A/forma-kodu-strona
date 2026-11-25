// Zachowania wspólne dla wszystkich stron (jeden mały moduł, bez bibliotek). Strona działa bez niego: treść jest w HTML,
// a każdy element ma wersję „bez JS” (przyciski-27-29.md, kolumna „Bez JS”).
// Spis: 1 pasek i postęp przewijania, 2 boczny wskaźnik segmentów, 3 motyw, 4 dostępność, 5 sheety i menu, 6 formularz,
// 7 wskaźniki swipe, 8 akordeon, 9 zakładki, 10 rozwijanie grupowe (S8) i stosy kart (S10).

import { opisListy } from '../lib/odmiana';
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
const pominiete = document.querySelector<HTMLOListElement>('[data-wskaznik-pominiete]');
let linkiSeg: HTMLAnchorElement[] = [];
let ostatniAktywny = -1;
// Nazwa w pasku bez numeru segmentu: „S2 Dlaczego my” → „Dlaczego my”, hero → „Powitanie” (Kacper 25.11).
const nazwaSegmentu = (s: HTMLElement) => {
  const n = (s.dataset.segment ?? '').replace(/^S\d+[a-z]?\s+/i, '').trim();
  if (/^hero/i.test(n)) return 'Powitanie';
  return n.charAt(0).toUpperCase() + n.slice(1);
};
function zbudujWskaznik() {
  if (!wskaznik || !lista || !segmenty.length) return;
  const calosc = document.documentElement.scrollHeight;
  const wys = wskaznik.clientHeight;
  lista.replaceChildren();
  linkiSeg = [];
  ostatniAktywny = -1;
  segmenty.forEach((s, i) => {
    if (!s.id) s.id = `segment-${i + 1}`;
    const li = document.createElement('li');
    const gora = (s.offsetTop / calosc) * wys;
    li.style.top = `${gora}px`;
    li.style.height = `${Math.max(4, (s.offsetHeight / calosc) * wys - 3)}px`;
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.textContent = nazwaSegmentu(s);
    li.append(a);
    lista.append(li);
    linkiSeg.push(a);
  });
  wskaznik.querySelectorAll<HTMLElement>('[data-proc]').forEach((k) => { k.style.top = `${(Number(k.dataset.proc) / 100) * wys}px`; });
  wskaznik.hidden = false;
}
// Lista minionych segmentów: stos w prawym górnym rogu; nowo dodany element powiększa się z małej etykiety.
function ulozPominiete(aktywny: number) {
  if (!pominiete || !wskaznik) return;
  const nowe = aktywny > ostatniAktywny && ostatniAktywny >= 0;
  pominiete.replaceChildren(...linkiSeg.slice(0, aktywny).map((a) => {
    const li = document.createElement('li');
    const k = document.createElement('a');
    k.href = a.getAttribute('href') ?? '#'; k.textContent = a.textContent; k.tabIndex = -1;
    li.append(k);
    return li;
  }));
  pominiete.hidden = aktywny === 0;
  // Kacper 25.11 16:06: stos minionych nagłówków w prawym górnym rogu ekranu (góra wskaźnika).
  pominiete.style.top = '0px';
  if (nowe && !ograniczRuch()) {
    pominiete.querySelectorAll<HTMLElement>('li').forEach((el, i) => {
      if (i >= ostatniAktywny) el.animate([{ transform: 'scale(0.75)', opacity: 0.4, transformOrigin: 'right center' }, { transform: 'scale(1)', opacity: 1, transformOrigin: 'right center' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
}
function aktualizujWskaznik(proc: number) {
  if (!wskaznik || wskaznik.hidden) return;
  if (pozycja) pozycja.style.top = `${proc * wskaznik.clientHeight}px`;
  const srodek = scrollY + innerHeight / 3;
  let aktywny = 0;
  segmenty.forEach((s, i) => { if (s.offsetTop <= srodek) aktywny = i; });
  linkiSeg.forEach((a, i) => { a.setAttribute('aria-current', String(i === aktywny)); a.classList.toggle('pominiety', i < aktywny); });
  if (aktywny !== ostatniAktywny) { ulozPominiete(aktywny); ostatniAktywny = aktywny; }
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
  // „Powiadom mnie”: nazwa usługi z przycisku trafia do zgody i do ukrytego pola formularza.
  const usluga = cel.dataset.usluga;
  if (usluga) {
    d.querySelectorAll('[data-usluga-nazwa]').forEach((el) => (el.textContent = usluga));
    const ukryte = d.querySelector<HTMLInputElement>('input[name=usluga]'); if (ukryte) ukryte.value = usluga;
  }
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

// ---------- 5b. Rozwijane grupy w pasku (Kacper 25.11): najechanie myszą, klik, Enter/Spacja; Esc i klik obok zamykają ----------
{
  const grupy = [...document.querySelectorAll<HTMLElement>('[data-grupa]')];
  const ustaw = (g: HTMLElement, otwarta: boolean) => {
    g.classList.toggle('otwarta', otwarta);
    g.querySelector('[data-grupa-przycisk]')?.setAttribute('aria-expanded', String(otwarta));
  };
  const zamknijWszystkie = (oprocz?: HTMLElement) => grupy.forEach((g) => g !== oprocz && ustaw(g, false));
  const mysz = matchMedia('(hover: hover) and (pointer: fine)');
  grupy.forEach((g) => {
    const b = g.querySelector<HTMLButtonElement>('[data-grupa-przycisk]')!;
    let czasZamk = 0;
    b.addEventListener('click', () => { const o = !g.classList.contains('otwarta'); zamknijWszystkie(g); ustaw(g, o); });
    g.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || !mysz.matches) return; clearTimeout(czasZamk); zamknijWszystkie(g); ustaw(g, true); });
    g.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; czasZamk = window.setTimeout(() => ustaw(g, false), 180); });
    g.addEventListener('focusout', (e) => { if (!g.contains(e.relatedTarget as Node)) ustaw(g, false); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Escape' && g.classList.contains('otwarta')) { ustaw(g, false); b.focus(); } });
    g.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => ustaw(g, false)));
  });
  document.addEventListener('click', (e) => { if (!(e.target as Element).closest?.('[data-grupa]')) zamknijWszystkie(); });
  addEventListener('scroll', () => { if (html.classList.contains('pasek-schowany')) zamknijWszystkie(); }, { passive: true });
}

// ---------- 6. Formularz „Opisz projekt” (stany R19: błąd pola, wysyłanie, błąd wysyłki, sukces) ----------
document.querySelectorAll<HTMLFormElement>('[data-formularz]').forEach((f) => {
  const wyslij = f.querySelector<HTMLButtonElement>('[data-wyslij]')!;
  const bladWysylki = f.querySelector<HTMLElement>('[data-blad-wysylki]')!;
  const sukces = f.nextElementSibling as HTMLElement;
  const pola = [...f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]')];
  const sprawdz = (p: HTMLInputElement | HTMLTextAreaElement) => {
    const v = p.value.trim();
    // Telefon (audyt 25.11): ten sam warunek co atrybut pattern (cyfry, spacje, +, nawiasy, myślnik; 9–20 znaków) i co najmniej 9 cyfr.
    const ok = p.type === 'radio' ? !!f.querySelector(`input[name="${p.name}"]:checked`) : p.type === 'checkbox' ? (p as HTMLInputElement).checked
      : v !== '' && (p.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        && (p.type !== 'tel' || (/^[+0-9 ()-]{9,20}$/.test(v) && v.replace(/\D/g, '').length >= 9));
    const blad = document.getElementById(`${p.id}-blad`);
    p.setAttribute('aria-invalid', String(!ok));
    const opisy = (p.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== blad?.id);
    if (!ok && blad) opisy.push(blad.id);
    if (opisy.length) p.setAttribute('aria-describedby', opisy.join(' ')); else p.removeAttribute('aria-describedby');
    if (blad) blad.hidden = ok;
    return ok;
  };
  pola.forEach((p) => p.addEventListener('blur', () => { if (p.getAttribute('aria-invalid')) sprawdz(p); }));
  // Grupa radio (32 S6): wybór dowolnej opcji zdejmuje błąd z pierwszej (to ona ma required).
  pola.filter((p) => p.type === 'radio').forEach((p) => f.querySelectorAll(`input[name="${p.name}"]`).forEach((r) => r.addEventListener('change', () => { if (p.getAttribute('aria-invalid')) sprawdz(p); })));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const zle = pola.filter((p) => !sprawdz(p));
    if (zle.length) { zle[0].focus(); return; }
    bladWysylki.hidden = true;
    f.setAttribute('aria-busy', 'true');
    pola.forEach((p) => (p.readOnly = true));
    wyslij.setAttribute('aria-busy', 'true');
    // Tabela ruchu: „Wysyłanie” + 4 kropki, potem „Wysłano!” (ok. 1,2 s). Bez ruchu: sama zmiana tekstu.
    const etykieta = wyslij.textContent;
    const ruch = !ograniczRuch();
    wyslij.innerHTML = ruch ? 'Wysyłanie<span class="kropki" aria-hidden="true"><span>.</span><span>.</span><span>.</span><span>.</span></span>' : 'Wysyłanie…';
    try {
      const odp = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!odp.ok) throw new Error(String(odp.status));
      const email = (f.querySelector('input[type=email]') as HTMLInputElement).value;
      if (f.dataset.szkic) { try { localStorage.removeItem(f.dataset.szkic); } catch { /* tryb prywatny */ } }
      wyslij.removeAttribute('aria-busy');
      wyslij.textContent = 'Wysłano!';
      if (ruch) await new Promise((r) => setTimeout(r, 600));
      wyslij.textContent = etykieta;
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

// ---------- 6b. Szkic formularza w tej przeglądarce (32 S6, data-szkic="klucz"): przycisk zapisuje, przy wejściu wraca. Do nas nic nie idzie. ----------
document.querySelectorAll<HTMLFormElement>('form[data-szkic]').forEach((f) => {
  const klucz = f.dataset.szkic!;
  const przycisk = f.querySelector<HTMLButtonElement>('[data-zapisz-szkic]');
  const stan = f.querySelector<HTMLElement>('[data-szkic-stan]');
  f.querySelector<HTMLElement>('[data-szkic-info]')?.removeAttribute('hidden');
  if (!przycisk) return;
  przycisk.hidden = false;
  const pomin = new Set(['strona_www']);
  przycisk.addEventListener('click', () => {
    const dane: Record<string, string[]> = {};
    new FormData(f).forEach((v, k) => { if (!pomin.has(k) && typeof v === 'string') (dane[k] ??= []).push(v); });
    zapisz(klucz, JSON.stringify(dane));
    if (stan) stan.textContent = 'Zapisano w tej przeglądarce. Możesz wrócić i dokończyć później.';
  });
  const zapisane = czytaj(klucz);
  if (!zapisane) return;
  try {
    const dane = JSON.parse(zapisane) as Record<string, string[]>;
    f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]').forEach((p) => {
      const w = dane[p.name];
      if (!w || pomin.has(p.name)) return;
      if (p instanceof HTMLInputElement && (p.type === 'checkbox' || p.type === 'radio')) p.checked = w.includes(p.value);
      else p.value = w[0] ?? '';
    });
    if (stan) stan.textContent = 'Wczytaliśmy formularz zapisany wcześniej w tej przeglądarce.';
  } catch { /* uszkodzony szkic: pomijamy */ }
});

// ---------- 7. Wskaźnik swipe (telefon): aktywna kropka = karta przy lewej krawędzi ----------
// data-petla: nieskończona pętla (zasada mobile 28, listy realizacji i opinii). Przed i za kartami dokładamy kopie
// (aria-hidden + inert, bez fokusu), a po zatrzymaniu przewijania przeskakujemy niewidocznie do oryginału.
const mobile = matchMedia('(max-width: 1023.98px)');
document.querySelectorAll<HTMLElement>('[data-swipe]').forEach((tor) => {
  // Kropki czytane na bieżąco: filtr (31 S2) może zmienić ich liczbę po ukryciu kart.
  const wsk = document.getElementById(tor.dataset.swipe!);
  const kropkiTeraz = () => [...(wsk?.querySelectorAll('li') ?? [])];
  const licznik = wsk?.querySelector('[data-licznik]');
  if (!kropkiTeraz().length) return;
  const widoczne = () => ([...tor.children] as HTMLElement[]).filter((c) => c.offsetWidth > 0);
  const n = kropkiTeraz().length; // pętla: stała liczba oryginałów
  const petla = tor.hasAttribute('data-petla');
  let szerZestawu = 0;
  if (petla) {
    const oryginaly = widoczne();
    const kopia = (c: HTMLElement) => {
      const x = c.cloneNode(true) as HTMLElement;
      x.setAttribute('aria-hidden', 'true'); x.inert = true; x.dataset.kopia = '';
      x.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      return x;
    };
    oryginaly.forEach((c) => tor.append(kopia(c)));
    oryginaly.slice().reverse().forEach((c) => tor.prepend(kopia(c)));
    const ustaw = () => {
      if (!mobile.matches) { tor.scrollLeft = 0; return; }
      const k = widoczne();
      szerZestawu = k[n].offsetLeft - k[0].offsetLeft;
      tor.scrollLeft = szerZestawu; // start od 01 (pierwszy oryginał)
    };
    ustaw();
    mobile.addEventListener('change', ustaw);
    let stop = 0;
    tor.addEventListener('scroll', () => {
      clearTimeout(stop);
      stop = window.setTimeout(() => {
        if (!mobile.matches || !szerZestawu) return;
        if (tor.scrollLeft < szerZestawu * 0.5) tor.scrollLeft += szerZestawu;
        else if (tor.scrollLeft >= szerZestawu * 1.5) tor.scrollLeft -= szerZestawu;
      }, 140);
    }, { passive: true });
  }
  let k = 0;
  tor.addEventListener('scroll', () => {
    cancelAnimationFrame(k);
    k = requestAnimationFrame(() => {
      const karty = widoczne();
      const lewa = tor.getBoundingClientRect().left;
      let i = 0;
      karty.forEach((c, m) => { if (c.getBoundingClientRect().left - lewa < c.offsetWidth / 2) i = m; });
      const kropki = kropkiTeraz();
      const ile = petla ? n : kropki.length;
      i = ((i % ile) + ile) % ile;
      kropki.forEach((d, m) => d.setAttribute('aria-current', String(m === i)));
      if (licznik) licznik.textContent = `${i + 1} z ${ile}`;
    });
  }, { passive: true });
});

// ---------- 7b. Filtr kategorii (31 S2): przyciski aria-pressed, ukrywa karty innych kategorii, przelicza „Pokazano X z Y” i kropki swipe ----------
document.querySelectorAll<HTMLElement>('[data-filtr]').forEach((box) => {
  const przyciski = [...box.querySelectorAll<HTMLButtonElement>('button[data-kategoria]')];
  const karty = [...box.querySelectorAll<HTMLElement>('[data-karta]')];
  const status = box.querySelector<HTMLElement>('[data-filtr-status]');
  const tor = box.querySelector<HTMLElement>('[data-swipe]');
  const wsk = tor ? document.getElementById(tor.dataset.swipe!) : null;
  przyciski.forEach((b) => b.addEventListener('click', () => {
    const kat = b.dataset.kategoria!;
    przyciski.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const widac = karty.filter((k) => { const ok = kat === 'wszystkie' || k.dataset.kategoria === kat; k.hidden = !ok; return ok; });
    if (status) status.textContent = opisListy(widac.map((k) => k.dataset.typ ?? ''), karty.length);
    const ol = wsk?.querySelector('ol');
    if (ol) ol.innerHTML = widac.map((_, i) => `<li aria-current="${i === 0}"></li>`).join('');
    const lic = wsk?.querySelector('[data-licznik]');
    if (lic) lic.textContent = `1 z ${widac.length}`;
    if (tor) { tor.scrollLeft = 0; tor.dispatchEvent(new Event('scroll')); }
  }));
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

// ---------- 9b. Proces na osi (28 S13): paginacja „← Wstecz · 01 / 06 · Dalej →”, etapy przed wybranym = zielone ✓ ----------
document.querySelectorAll<HTMLElement>('[data-kroki]').forEach((k) => {
  const zakladki = [...k.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  const licznik = k.querySelector<HTMLElement>('[data-kroki-licznik]');
  const [wstecz, dalej] = [...k.querySelectorAll<HTMLButtonElement>('[data-krok]')];
  const pag = licznik?.parentElement;
  if (!zakladki.length) return;
  const dwa = (i: number) => String(i).padStart(2, '0');
  const biezacy = () => Math.max(0, zakladki.findIndex((z) => z.getAttribute('aria-selected') === 'true'));
  const odswiez = () => {
    const i = biezacy();
    zakladki.forEach((z, j) => z.classList.toggle('przeszly', j < i));
    if (licznik) licznik.textContent = `${dwa(i + 1)} / ${dwa(zakladki.length)}`;
    if (wstecz) wstecz.disabled = i === 0;
    if (dalej) dalej.disabled = i === zakladki.length - 1;
  };
  k.querySelectorAll<HTMLButtonElement>('[data-krok]').forEach((b) => b.addEventListener('click', () => {
    const n = Math.min(zakladki.length - 1, Math.max(0, biezacy() + Number(b.dataset.krok)));
    zakladki[n].click();
  }));
  zakladki.forEach((z) => { z.addEventListener('click', odswiez); z.addEventListener('keyup', odswiez); });
  if (pag) pag.hidden = false;
  odswiez();
});

// ---------- 9c. Oś pionowa (28 S9): węzły, które minęły środek ekranu, robią się zielone ✓ ----------
document.querySelectorAll<HTMLElement>('[data-os-pionowa]').forEach((os) => {
  const kroki = [...os.querySelectorAll<HTMLElement>('[data-krok-osi]')];
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((wpisy) => {
    wpisy.forEach((w) => {
      const el = w.target as HTMLElement;
      // Krok jest „przejściowy”, gdy jego węzeł jest nad środkiem ekranu.
      el.classList.toggle('przeszly', w.boundingClientRect.top < window.innerHeight / 2);
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  kroki.slice(1).forEach((el) => obs.observe(el));
});

// ---------- 9d. Klikalna rozmowa z botem (29 S1, przykład): dni → propozycja godziny → Tak / Nie ----------
document.querySelectorAll<HTMLElement>('[data-czat-demo]').forEach((czat) => {
  const lista = czat.querySelector<HTMLElement>('[data-czat-wiadomosci]')!;
  const odp = czat.querySelector<HTMLElement>('[data-czat-odpowiedzi]')!;
  const start = { html: lista.innerHTML, przyciski: odp.innerHTML };
  const dodaj = (kto: 'klient' | 'asystent', tekst: string) => {
    const li = document.createElement('li');
    li.className = `dymek ${kto} nowy`;
    const s = document.createElement('small');
    s.textContent = kto === 'klient' ? 'Klient' : 'Asystent';
    li.append(s, tekst);
    // klasy z zakresu stylów komponentu (Astro dopisuje atrybut data-astro-cid-*)
    const wzor = lista.querySelector('li');
    if (wzor) [...wzor.attributes].filter((a) => a.name.startsWith('data-astro-cid')).forEach((a) => { li.setAttribute(a.name, a.value); s.setAttribute(a.name, a.value); });
    lista.append(li);
    // Okno czatu ma stałą wysokość: nowe wiadomości przewijają listę do dołu (Kacper 25.11 16:06).
    lista.scrollTo({ top: lista.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const przyciski = (opcje: [string, string][]) => {
    const wzor = odp.querySelector('button');
    const cid = wzor ? [...wzor.attributes].filter((a) => a.name.startsWith('data-astro-cid')) : [];
    odp.replaceChildren(...opcje.map(([tekst, akcja]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = tekst; b.dataset.czat = akcja;
      if (akcja === 'od-nowa') b.className = 'od-nowa';
      cid.forEach((a) => b.setAttribute(a.name, a.value));
      return b;
    }));
    (odp.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  };
  odp.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-czat]');
    if (!b) return;
    const akcja = b.dataset.czat;
    if (akcja === 'od-nowa') { lista.innerHTML = start.html; lista.scrollTop = 0; odp.innerHTML = start.przyciski; (odp.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true }); return; }
    dodaj('klient', b.textContent ?? '');
    if (akcja === 'dni') { dodaj('asystent', 'Jasne, mam w te dni miejsce o godzinie 11–12. Pasuje?'); przyciski([['Tak', 'tak'], ['Nie', 'nie']]); }
    else { dodaj('asystent', akcja === 'tak' ? 'Jasne, to widzimy się na treningu!' : 'Szkoda, może spróbujemy inne dni?'); przyciski([['Zacznij od nowa', 'od-nowa']]); }
  });
});

// ---------- 9g. Okna w hero 29 S1 (Figma 617:1775): czat → diagram → recepcjonista → czat, zmiana przewinięciem w dół ----------
// Każde okno stoi 6 s, potem kolumna przesuwa się o jedno okno w górę (700 ms). Najechanie, fokus albo klik w okno zatrzymuje
// zmianę (klik w czat: do końca wizyty, żeby dokończyć rozmowę). Niewidoczne okna są inert. Bez ruchu: okna jedno pod drugim.
document.querySelectorAll<HTMLElement>('[data-okna]').forEach((okna) => {
  const tor = okna.querySelector<HTMLElement>('[data-okna-tor]');
  const lista = [...okna.querySelectorAll<HTMLElement>('[data-okno]')];
  if (!tor || lista.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  okna.classList.add('karuzela');
  const kopia = lista[0].cloneNode(true) as HTMLElement; // płynne przejście z ostatniego na pierwszy
  kopia.setAttribute('aria-hidden', 'true'); kopia.inert = true; kopia.removeAttribute('data-okno');
  kopia.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  tor.append(kopia);
  let i = 0, stop = false, najechane = false;
  const krok = () => lista[0].offsetHeight + parseFloat(getComputedStyle(tor).rowGap || '0');
  const ustaw = (n: number, anim: boolean) => {
    tor.style.transition = anim ? 'transform 700ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none';
    tor.style.transform = `translate3d(0, ${-n * krok()}px, 0)`;
    lista.forEach((o, j) => { o.inert = j !== n % lista.length; });
  };
  ustaw(0, false);
  // Mały przycisk ↑/↓ pod oknami (Kacper 25.11 17:36): przełącza od razu i liczy 6 s od nowa; nie zatrzymuje zmiany na stałe.
  const ster = okna.parentElement?.querySelector<HTMLElement>('[data-okna-sterowanie]');
  const licznik = ster?.querySelector<HTMLElement>('[data-okna-licznik]');
  const opisz = () => { if (licznik) licznik.textContent = `${(i % lista.length) + 1} / ${lista.length}`; };
  let powrot = 0;
  const idz = (d: number) => {
    clearTimeout(powrot);
    if (i >= lista.length) { i = 0; ustaw(0, false); void tor.offsetHeight; } // klik w trakcie powrotu z kopii na pierwsze okno
    if (d < 0 && i === 0) { i = lista.length; ustaw(i, false); void tor.offsetHeight; } // z pierwszego na ostatnie: start z kopii
    i += d;
    ustaw(i, true);
    if (i >= lista.length) { i = lista.length; powrot = window.setTimeout(() => { i = 0; ustaw(0, false); opisz(); }, 720); }
    opisz();
  };
  let zegar = 0;
  const startuj = () => { clearInterval(zegar); zegar = window.setInterval(() => { if (!stop && !najechane && !document.hidden) idz(1); }, 6000); };
  startuj();
  if (ster) {
    ster.hidden = false;
    opisz();
    ster.querySelectorAll<HTMLButtonElement>('[data-okna-krok]').forEach((b) => b.addEventListener('click', () => { idz(Number(b.dataset.oknaKrok)); startuj(); }));
  }
  okna.addEventListener('pointerenter', () => { najechane = true; });
  okna.addEventListener('pointerleave', () => { najechane = false; });
  okna.addEventListener('focusin', () => { najechane = true; });
  okna.addEventListener('focusout', () => { najechane = false; });
  okna.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) stop = true; });
  addEventListener('resize', () => ustaw(i % lista.length, false));
});

// ---------- 9e. Odsłona przy wejściu w ekran (29 S5 stos kart, 29 S6 stepper): klasa .widoczny raz, gdy segment jest w 25% widoczny ----------
{
  const odslony = [...document.querySelectorAll<HTMLElement>('[data-odslon]')];
  if (odslony.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((wpisy) => wpisy.forEach((w) => {
      if (w.isIntersecting) { w.target.classList.add('widoczny'); obs.unobserve(w.target); }
    }), { threshold: 0.15 });
    odslony.forEach((el) => obs.observe(el));
  } else odslony.forEach((el) => el.classList.add('widoczny'));
}

// ---------- 10a. Rozwijanie grupowe (S8): klik w dowolnym „Co zawiera” rozwija wszystkie trzy pakiety ----------
document.querySelectorAll<HTMLElement>('[data-rozwin-grupa]').forEach((grupa) => {
  const przyciski = [...grupa.querySelectorAll<HTMLButtonElement>('[data-rozwin]')];
  const listy = przyciski.flatMap((b) => b.dataset.rozwin!.split(' ').map((id) => document.getElementById(id))).filter(Boolean) as HTMLElement[];
  // Zwinięte listy są w DOM (animacja wysokości), ale niedostępne dla klawiatury i czytnika: inert.
  const ustaw = (wl: boolean) => {
    przyciski.forEach((x) => x.setAttribute('aria-expanded', String(wl)));
    listy.forEach((l) => { l.inert = !wl; });
    grupa.classList.toggle('rozwiniete', wl);
  };
  przyciski.forEach((b) => {
    b.setAttribute('aria-controls', listy.map((l) => l.id).join(' '));
    b.addEventListener('click', () => ustaw(b.getAttribute('aria-expanded') !== 'true'));
  });
  ustaw(false);
});

// ---------- 10b. Stos kart (S10): „+N warstwy” rozkłada stos w listę, „Zwiń warstwy” składa ----------
// Kacper 25.11: rozwinięty jest najwyżej jeden stos naraz; otwarcie kolejnego zwija poprzedni.
{
  const stosy: ((wl: boolean) => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-stos]').forEach((stos) => {
    const b = stos.querySelector<HTMLButtonElement>('[data-stos-przycisk]');
    const etykieta = b?.querySelector('[data-stos-etykieta]');
    const podpis = b?.querySelector<HTMLElement>('[data-stos-podpis]');
    if (!b || !etykieta) return;
    const zwiniety = etykieta.textContent;
    stos.classList.add('zlozony');
    b.setAttribute('aria-expanded', 'false');
    const ustaw = (wl: boolean) => {
      if ((b.getAttribute('aria-expanded') === 'true') === wl) return;
      b.setAttribute('aria-expanded', String(wl));
      stos.classList.toggle('zlozony', !wl);
      etykieta.textContent = wl ? 'Zwiń warstwy' : zwiniety;
      if (podpis) podpis.hidden = wl;
      if (!ograniczRuch() && wl) stos.classList.add('w-ruchu');
      setTimeout(() => stos.classList.remove('w-ruchu'), 800);
    };
    stosy.push(ustaw);
    b.addEventListener('click', () => {
      const wl = b.getAttribute('aria-expanded') !== 'true';
      if (wl) stosy.forEach((f) => f !== ustaw && f(false));
      ustaw(wl);
    });
  });
}

// ---------- 9f. 27 S1: klikalne okno strony i czat w ilustracji (plansze 450:1815 i 450:1947, dane przykładowe) ----------
{
  document.querySelectorAll<HTMLElement>('[data-okno-demo]').forEach((okno) => {
    const terminy = [...okno.querySelectorAll<HTMLButtonElement>('[data-termin]')];
    const rezerwuj = okno.querySelector<HTMLButtonElement>('[data-rezerwuj]')!;
    const potw = okno.querySelector<HTMLElement>('[data-potwierdzenie]')!;
    let wybrany = '';
    terminy.forEach((b) => b.addEventListener('click', () => {
      wybrany = b.textContent ?? '';
      terminy.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      rezerwuj.textContent = `Zarezerwuj ${wybrany}`;
      rezerwuj.hidden = false; potw.hidden = true; rezerwuj.classList.remove('zwija');
    }));
    rezerwuj.addEventListener('click', () => {
      if (!wybrany) { terminy[0]?.focus(); terminy.forEach((x) => x.animate?.([{ borderColor: 'var(--fk-akcent)' }, {}], { duration: 600 })); return; }
      const pokaz = () => { rezerwuj.hidden = true; potw.textContent = `✓ Zarezerwowano: ${wybrany}`; potw.hidden = false; };
      if (ograniczRuch()) { pokaz(); return; }
      rezerwuj.classList.add('zwija');
      setTimeout(pokaz, 300);
    });
  });
  const czat = document.querySelector<HTMLElement>('[data-czat-hero]');
  if (czat) {
    const lista = czat.querySelector<HTMLElement>('[data-czat-lista]')!;
    const cid = [...(lista.querySelector('li')?.attributes ?? [])].filter((a) => a.name.startsWith('data-astro-cid'));
    const dymek = (kto: 'klient' | 'asystent', tekst: string, klasa = '') => {
      const li = document.createElement('li');
      li.className = `dymek ${kto} nowy ${klasa}`.trim();
      const s = document.createElement('small');
      s.textContent = kto === 'klient' ? 'Klient' : 'Asystent';
      li.append(s, tekst);
      [li, s].forEach((e) => cid.forEach((a) => e.setAttribute(a.name, a.value)));
      lista.append(li);
      lista.scrollTo({ top: lista.scrollHeight, behavior: ograniczRuch() ? 'auto' : 'smooth' });
      return li;
    };
    lista.scrollTop = lista.scrollHeight;
    czat.querySelectorAll<HTMLButtonElement>('[data-odpowiedz]').forEach((b) => b.addEventListener('click', () => {
      const pytanie = b.textContent ?? '', odp = b.dataset.odpowiedz!;
      const dalej = () => {
        const fokus = document.activeElement === b;
        const nast = (b.nextElementSibling ?? b.previousElementSibling) as HTMLElement | null;
        b.remove(); dymek('klient', pytanie);
        if (fokus) (nast ?? lista).focus();
      };
      if (ograniczRuch()) { dalej(); dymek('asystent', odp); return; }
      b.classList.add('wcisnieta');
      setTimeout(() => {
        dalej();
        let pisze: HTMLElement | null = null;
        setTimeout(() => { pisze = dymek('asystent', '• • •', 'pisze'); pisze.setAttribute('aria-hidden', 'true'); }, 600);
        setTimeout(() => { pisze?.remove(); dymek('asystent', odp); }, 1200);
      }, 100);
    }));
  }
}
