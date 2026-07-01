import { create } from 'zustand';
import type { SectionId } from '@/data/sections';

export type QualityLevel = 'high' | 'medium' | 'low';

/** Shared, non-reactive pointer holder. Mutated in place (never via set) so
 *  high-frequency mousemove updates cause zero React re-renders; the render
 *  loop reads it through `getState()`. */
export interface PointerState {
  /** Normalised device coordinates in [-1, 1]. */
  x: number;
  y: number;
}

export interface SceneState {
  /** Adaptive quality tier; null until device detection runs. */
  quality: QualityLevel | null;
  /** User prefers reduced motion. */
  reducedMotion: boolean;
  /** WebGL availability; null until probed on the client. */
  webglAvailable: boolean | null;
  /** Currently focused/active navigation section (drives highlight + travel). */
  activeSection: SectionId | null;
  /** Section under hover/focus, if any. */
  hoveredSection: SectionId | null;
  /** In-place pointer holder (see note above). */
  pointer: PointerState;

  setQuality: (quality: QualityLevel) => void;
  setReducedMotion: (reduced: boolean) => void;
  setWebglAvailable: (available: boolean) => void;
  setActiveSection: (id: SectionId | null) => void;
  setHoveredSection: (id: SectionId | null) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  quality: null,
  reducedMotion: false,
  webglAvailable: null,
  activeSection: null,
  hoveredSection: null,
  pointer: { x: 0, y: 0 },

  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setHoveredSection: (hoveredSection) => set({ hoveredSection }),
}));
