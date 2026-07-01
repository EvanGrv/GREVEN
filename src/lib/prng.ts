/**
 * Deterministic pseudo-random number generation.
 * The whole neural network is generated from a fixed seed so the composition
 * is reproducible across loads (see docs/IMPLEMENTATION_PLAN.md §14).
 */

/** mulberry32: fast, seedable 32-bit PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string into a 32-bit seed (deterministic). */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small deterministic random helper bound to one seed. */
export class SeededRandom {
  private readonly next: () => number;

  constructor(seed: number | string) {
    const numericSeed = typeof seed === 'string' ? hashSeed(seed) : seed;
    this.next = mulberry32(numericSeed);
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next();
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Random point on/inside a sphere shell (radius jittered by `spread`). */
  onSphere(radius: number, spread = 0): [number, number, number] {
    const u = this.next();
    const v = this.next();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius + this.range(-spread, spread);
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  }
}
