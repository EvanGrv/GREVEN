import type { QualityLevel } from '@/stores/sceneStore';

/**
 * Central configuration for the neural network's generation and behaviour.
 * Every artistic knob lives here so the composition can be tuned without
 * touching component internals (see docs/IMPLEMENTATION_PLAN.md §14).
 */

export interface QualityCounts {
  /** Secondary cell-body neurons (instanced). */
  neurons: number;
  /** Peripheral synapse nodes (instanced). */
  synapses: number;
  /** Sample points per axon curve (higher = smoother). */
  axonSamples: number;
}

export const NETWORK_CONFIG = {
  /** Fixed seed → identical composition on every load. */
  seed: 'greven-neural-v1',

  /** Overall extent of the cloud. */
  radius: 3.5,
  /** Compress depth so the cloud reads as a lens, not a ball. */
  depthScale: 0.8,
  /** Bias exponent toward the centre (>1 = denser core, diffuse periphery). */
  centerDensity: 1.7,
  /** Horizontal spread of the secondary cloud so it fills the wide viewport
   *  instead of clustering in a central ball. */
  spreadX: 1.45,

  /**
   * Explicit, art-directed positions (world units) for the 5 navigation
   * neurons. Spread across the view — corners, top and the central gap — and
   * kept clear of the GREVEN wordmark so a clickable neuron is never hidden
   * behind the text (the network renders behind the HTML). Order matches
   * NEURON_SECTIONS: Recherche, Projets, Publications, À propos, Contact.
   */
  navPositions: [
    [-1.95, 1.68, 0.4], // Recherche    — upper left, above the letters
    [1.95, 1.58, -0.4], // Projets      — upper right, above the letters
    [2.0, -1.66, 0.3], // Publications — lower right, below the letters
    [-2.0, -1.62, -0.3], // À propos     — lower left, below the letters
    [0.05, 0.0, 1.05], // Contact      — central hub in the GRE·VEN gap
  ] as [number, number, number][],

  motion: {
    neuronAmplitude: 0.16,
    navAmplitude: 0.07,
    synapseAmplitude: 0.24,
    /** Time scale of the drift noise. */
    speed: 0.045,
    /** Cell-body breathing depth. */
    breathe: 0.09,
  },

  axon: {
    /** Max distance between two nodes for them to connect. */
    connectRadius: 1.95,
    /** Max connections grown from each node. */
    maxDegree: 3,
    /** Curvature of the axons (0 = straight). */
    curveStrength: 0.5,
  },

  counts: {
    high: { neurons: 20, synapses: 22, axonSamples: 8 },
    medium: { neurons: 14, synapses: 16, axonSamples: 6 },
    low: { neurons: 9, synapses: 10, axonSamples: 4 },
  } satisfies Record<QualityLevel, QualityCounts>,

  /** Sizes (world units) for each node kind. */
  size: {
    navNeuron: [0.3, 0.42] as [number, number],
    neuron: [0.1, 0.24] as [number, number],
    synapse: [0.035, 0.09] as [number, number],
  },

  palette: {
    neuron: '#8a7f6c',
    navNeuron: '#c9a98f',
    synapse: '#6f6858',
    axonNear: '#7c7565',
    axonFar: '#33362b',
    emissive: '#f2d0a7',
  },
} as const;

export function countsFor(quality: QualityLevel): QualityCounts {
  return NETWORK_CONFIG.counts[quality];
}
