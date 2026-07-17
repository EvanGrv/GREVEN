import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import { mulberry32 } from '@/lib/prng';
import type { NetworkNode } from '@/types/network';

/**
 * Shared motion helpers. Both the node meshes and the axons read node
 * positions from the *same* evaluation, so connections stay physically
 * coherent with their neurons when everything drifts.
 */

export type FieldNoise = ReturnType<typeof createNoise3D>;

export function createFieldNoise(seed = 20240517): FieldNoise {
  return createNoise3D(mulberry32(seed));
}

/**
 * Write a node's current position (rest + organic drift) into `out`.
 * When `still` is true the node holds its rest position (reduced motion).
 */
export function writeNodePosition(
  node: NetworkNode,
  t: number,
  speed: number,
  noise: FieldNoise,
  out: THREE.Vector3,
  still = false,
): void {
  const [bx, by, bz] = node.base;
  if (still || node.amplitude === 0) {
    out.set(bx, by, bz);
    return;
  }
  const [ox, oy, oz] = node.noiseOffset;
  const a = node.amplitude;
  const nx = noise(ox + t * speed, by * 0.35, bz * 0.35);
  const ny = noise(bx * 0.35, oy + t * speed, bz * 0.35);
  const nz = noise(bx * 0.35, by * 0.35, oz + t * speed);
  out.set(bx + a * nx, by + a * ny, bz + a * nz);
}

/** Cubic Bézier sample into `out`. p1/p2 are control points. */
export function cubicBezier(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  u: number,
  out: THREE.Vector3,
): void {
  const iu = 1 - u;
  const b0 = iu * iu * iu;
  const b1 = 3 * iu * iu * u;
  const b2 = 3 * iu * u * u;
  const b3 = u * u * u;
  out.set(
    b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
    b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z,
  );
}
