import type { SectionId } from '@/data/sections';

export type NodeKind = 'nav' | 'neuron' | 'synapse';

export type Vec3 = [number, number, number];

export interface NetworkNode {
  kind: NodeKind;
  /** Rest position before organic motion. */
  base: Vec3;
  /** Rendered radius (world units). */
  radius: number;
  /** Drift amplitude. */
  amplitude: number;
  /** Per-node noise-space offset so nodes don't drift in sync. */
  noiseOffset: Vec3;
  /** Breathing phase offset. */
  phase: number;
  /** Navigation neurons only: the section they lead to. */
  sectionId?: SectionId;
}

export interface NetworkEdge {
  /** Index of the two connected nodes. */
  a: number;
  b: number;
  /** Absolute control-point offsets applied at 1/3 and 2/3 along the axon. */
  c1: Vec3;
  c2: Vec3;
}

/** One straight segment of a dendrite filament, in the parent node's local
 *  space (so it translates with the neuron). Brightness fades toward the tip. */
export interface DendriteSegment {
  node: number;
  a: Vec3;
  b: Vec3;
  ba: number;
  bb: number;
}

export interface NetworkModel {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  dendrites: DendriteSegment[];
  /** Indices of the 5 navigation neurons (always the first nodes). */
  navIndices: number[];
}
