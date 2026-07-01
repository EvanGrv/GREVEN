import { describe, expect, it } from 'vitest';
import { SeededRandom, hashSeed, mulberry32 } from '@/lib/prng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('returns floats within [0, 1)', () => {
    const next = mulberry32(42);
    for (let i = 0; i < 100; i += 1) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe('hashSeed', () => {
  it('is stable and unsigned', () => {
    expect(hashSeed('greven')).toBe(hashSeed('greven'));
    expect(hashSeed('greven')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('recherche')).not.toBe(hashSeed('projets'));
  });
});

describe('SeededRandom', () => {
  it('reproduces the same network coordinates for the same seed', () => {
    const p1 = new SeededRandom('greven').onSphere(10, 1);
    const p2 = new SeededRandom('greven').onSphere(10, 1);
    expect(p1).toEqual(p2);
  });

  it('keeps range() within bounds', () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 100; i += 1) {
      const v = rng.range(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });
});
