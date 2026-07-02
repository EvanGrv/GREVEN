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

/** Desired camera pose during a neural travel, written in place by the travel
 *  controller (GSAP) and applied by the CameraRig. Mutated without `set` to
 *  avoid per-frame re-renders. */
export interface TravelPose {
  active: boolean;
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

/** A request to fly to a section's neuron, raised on 3D neuron selection. */
export interface TravelRequest {
  section: SectionId;
  /** Neuron world position at selection time. */
  target: [number, number, number];
  /** Monotonic id so the controller reacts to each new request. */
  nonce: number;
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
  /** In-place camera travel pose (see note above). */
  travelPose: TravelPose;
  /** Latest travel request (null when none pending/handled). */
  travelRequest: TravelRequest | null;

  setQuality: (quality: QualityLevel) => void;
  setReducedMotion: (reduced: boolean) => void;
  setWebglAvailable: (available: boolean) => void;
  setActiveSection: (id: SectionId | null) => void;
  setHoveredSection: (id: SectionId | null) => void;
  requestTravel: (section: SectionId, target: [number, number, number]) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  quality: null,
  reducedMotion: false,
  webglAvailable: null,
  activeSection: null,
  hoveredSection: null,
  pointer: { x: 0, y: 0 },
  travelPose: { active: false, px: 0, py: 0, pz: 9, tx: 0, ty: 0, tz: 0 },
  travelRequest: null,

  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setHoveredSection: (hoveredSection) => set({ hoveredSection }),
  requestTravel: (section, target) =>
    set((s) => ({ travelRequest: { section, target, nonce: (s.travelRequest?.nonce ?? 0) + 1 } })),
}));
