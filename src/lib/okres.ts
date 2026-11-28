// Okres realizacji (Kacper 28.11): pola „Od” i „Do” (RRRR-MM-DD) pokazują zakres dat, np. „6.11.2026 – 1.01.2027”.
// Bez nich zostaje sam miesiąc z pola „data” (RRRR-MM), które służy też do sortowania i JSON-LD.
const dzien = (d: string) => new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(d));
export function okresRealizacji(d: { data: string; data_od?: string; data_do?: string }): string {
  if (d.data_od) return d.data_do ? `${dzien(d.data_od)} – ${dzien(d.data_do)}` : `od ${dzien(d.data_od)}`;
  return /^\d{4}-\d{2}$/.test(d.data) ? new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d.data}-01`)) : d.data;
}
