'use client';

import { useEffect } from 'react';
import { detectQuality, isWebGLAvailable, qualityOverride } from '@/lib/device-detect';
import { useSceneStore } from '@/stores/sceneStore';
import { useReducedMotion } from './useReducedMotion';

/**
 * Probes WebGL support and picks an adaptive quality tier once on mount,
 * and keeps reduced-motion in sync. Returns whether the scene may render.
 */
export function useSceneCapabilities(): {
  webglAvailable: boolean | null;
  quality: ReturnType<typeof useSceneStore.getState>['quality'];
  reducedMotion: boolean;
} {
  const webglAvailable = useSceneStore((s) => s.webglAvailable);
  const quality = useSceneStore((s) => s.quality);
  const setWebglAvailable = useSceneStore((s) => s.setWebglAvailable);
  const setQuality = useSceneStore((s) => s.setQuality);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
    setQuality(qualityOverride() ?? detectQuality());
  }, [setWebglAvailable, setQuality]);

  return { webglAvailable, quality, reducedMotion };
}
