'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Module singleton so UI controls (e.g. "retour au réseau") can drive scroll. */
let lenisInstance: Lenis | null = null;

/** Smoothly scroll back to the top of the network; falls back to native. */
export function scrollToNetworkTop() {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { duration: 1.2 });
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Lenis smooth scroll, mounted once. Disabled under reduced motion (native
 * scrolling is used instead), so the experience stays comfortable and honest
 * to the user's OS preference.
 */
export function SmoothScroll() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisInstance = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, [reducedMotion]);

  return null;
}
