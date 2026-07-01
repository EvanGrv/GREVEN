'use client';

import { useEffect } from 'react';
import { useSceneStore } from '@/stores/sceneStore';

/**
 * Syncs the OS "prefers-reduced-motion" setting into the scene store and
 * returns it. When reduced motion is on, the scene falls back to still,
 * fade-based behaviour (no camera travel, no oscillation).
 */
export function useReducedMotion(): boolean {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setReducedMotion = useSceneStore((s) => s.setReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setReducedMotion]);

  return reducedMotion;
}
