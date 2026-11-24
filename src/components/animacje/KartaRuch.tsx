// Decyzja 13B: ciężka animacja TYLKO na komputerze.
// Użycie w .astro:  <KartaRuch client:media="(min-width: 1024px) and (pointer: fine)"> …treść… </KartaRuch>
// - Treść renderuje się w HTML na serwerze (widzą ją boty i telefony).
// - Kod tej wyspy (React + Motion) pobiera się wyłącznie, gdy ekran ma ≥ 1024 px i myszkę. Telefon nie ściąga ani bajta.
// - LazyMotion + m + domAnimation: mniejsza paczka Motion niż pełne <motion.div>. [Oficjalne: motion.dev/docs/react-reduce-bundle-size]
// - useReducedMotion: przy „ogranicz ruch” bez efektu.
// CSP: na serwerze renderujemy zwykły <div> bez atrybutu style (CSP strony blokuje style w atrybutach, test 24.11);
// Motion ustawia style dopiero po uruchomieniu w przeglądarce (przez CSSOM, co CSP dopuszcza).
// Budżet: sprawdz-budzet.mjs liczy tę wyspę tylko do budżetu komputera (150 kB gzip), nie telefonu (50 kB gzip).
import { LazyMotion, domAnimation, m, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode, type PointerEvent } from 'react';

export default function KartaRuch({ children, sila = 8 }: { children?: ReactNode; sila?: number }) {
  const ogranicz = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [sila, -sila]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-sila, sila]), { stiffness: 200, damping: 20 });

  const ruch = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { x.set(0.5); y.set(0.5); };
  const [wPrzegladarce, ustaw] = useState(false);
  useEffect(() => ustaw(true), []);

  if (ogranicz || !wPrzegladarce) return <div>{children}</div>;
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div onPointerMove={ruch} onPointerLeave={reset} style={{ rotateX, rotateY, transformPerspective: 800 }}>
        {children}
      </m.div>
    </LazyMotion>
  );
}
