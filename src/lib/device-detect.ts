import type { QualityLevel } from '@/stores/sceneStore';

/**
 * Lightweight, privacy-respecting device capability detection.
 * Uses only coarse, non-identifying signals (core count, memory hint, pointer
 * type, pixel ratio) to pick a quality tier. No fingerprinting, no storage.
 */

/** Probe for a usable WebGL context. */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
}

/** Choose an adaptive quality tier from coarse device signals. */
export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'medium';

  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const dpr = window.devicePixelRatio ?? 1;

  // Treat touch-first, low-core or low-memory devices conservatively.
  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  if (!coarsePointer) score += 1;
  // Very high DPR on a weak device is expensive; nudge down.
  if (coarsePointer && dpr > 2.5) score -= 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/** Cap the device pixel ratio per quality tier to bound fill-rate cost.
 *  Every canvas pixel runs the full post chain (bloom, DoF, grain), so cost
 *  grows with dpr² — 1.6 instead of 2 cuts ~36% of the GPU work for a
 *  difference the soft, filmic scene hides completely. */
export function maxDprFor(quality: QualityLevel): number {
  switch (quality) {
    case 'high':
      return 1.6;
    case 'medium':
      return 1.3;
    case 'low':
      return 1;
  }
}
