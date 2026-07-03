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
  /** Positions traced from the reference board: organic, asymmetric — cells
   *  sit on branches, not on the corners of an X. */
  navPositions: [
    [-1.9, 1.35, 0.3], // Recherche    — upper left, on the rising branch
    [2.5, 1.9, -0.3], // Projets      — upper right cluster
    [3.5, -1.1, 0.2], // Publications — right, below the midline
    [-3.4, -1.6, -0.4], // À propos     — lower left
    [0.55, -1.5, 0.5], // Contact      — small cell just below the central soma
    // (kept OFF the camera axis of the centre neuron: at [~0,0,z>0] it used to
    // project exactly onto the big soma and read as a second neuron in front)
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

  /** Sizes (world units) for each node kind. A modest soma lets the dendrites
   *  define the neuron's silhouette (as in real neurons). */
  size: {
    navNeuron: [0.2, 0.28] as [number, number],
    neuron: [0.08, 0.16] as [number, number],
    synapse: [0.03, 0.08] as [number, number],
  },

  /** Dendrites: fine, branching filaments radiating from each neuron — the
   *  defining organic feature. Generated deterministically, they follow their
   *  neuron and fade toward the tips. */
  dendrite: {
    /** Primary dendrite count range (navigation neurons are richer). */
    perNeuronNav: [8, 12] as [number, number],
    perNeuron: [4, 7] as [number, number],
    /** Length as a multiple of the soma radius. */
    lengthFactor: 6,
    /** Sample points per dendrite (higher = smoother, curvier). */
    segments: 5,
    /** Probability a dendrite spawns a finer sub-branch. */
    branchProb: 0.55,
    /** Curvature / wander of each filament. */
    jitter: 0.55,
    /** Brightness at the soma end (fades to 0 at the tip). */
    baseBrightnessNav: 0.7,
    baseBrightness: 0.5,
  },

  palette: {
    neuron: '#746047',
    navNeuron: '#8a7050',
    synapse: '#564735',
    axonNear: '#8a7050',
    axonFar: '#564735',
    /** Warm patined-beige glow — never a white hotspot. */
    emissive: '#b79a72',
  },
} as const;

export function countsFor(quality: QualityLevel): QualityCounts {
  return NETWORK_CONFIG.counts[quality];
}
