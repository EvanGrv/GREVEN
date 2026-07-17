'use client';

import { useEffect } from 'react';
import { useSceneStore } from '@/stores/sceneStore';

/**
 * Tracks the pointer as normalised device coordinates in [-1, 1] and writes
 * them into the shared pointer holder *in place* — no store `set`, so no React
 * re-renders. The render loop reads this via getState() for parallax.
 */
export function usePointerParallax(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pointer = useSceneStore.getState().pointer;

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerout', onLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeave);
    };
  }, []);
}
