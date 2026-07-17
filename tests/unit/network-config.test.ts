import { describe, expect, it } from 'vitest';
import { NETWORK_CONFIG } from '@/data/network.config';
import { NEURON_SECTIONS } from '@/data/sections';

/** Camera looks down -z from [0,0,9]; the viewport half-extents at z=0 are
 *  ~±5.5 wide × ±3.1 tall. Nav neurons must stay reachable and visible. */
const VIEW_X = 5.5;
const VIEW_Y = 3.1;

describe('NETWORK_CONFIG.navPositions', () => {
  it('provides exactly one position per navigation section', () => {
    expect(NETWORK_CONFIG.navPositions).toHaveLength(NEURON_SECTIONS.length);
  });

  it('keeps every nav neuron inside the visible frame', () => {
    for (const [x, y] of NETWORK_CONFIG.navPositions) {
      expect(Math.abs(x)).toBeLessThanOrEqual(VIEW_X);
      expect(Math.abs(y)).toBeLessThanOrEqual(VIEW_Y);
    }
  });

  it('never places a nav neuron on the camera axis of the central soma', () => {
    // Regression guard: a node near [0,0,z>0] projects exactly onto the big
    // central neuron and reads as a phantom second cell in front of it.
    for (const [x, y, z] of NETWORK_CONFIG.navPositions) {
      if (z > 0.2) {
        expect(Math.hypot(x, y)).toBeGreaterThan(0.9);
      }
    }
  });

  it('spreads the nav neurons apart so hit-testing stays unambiguous', () => {
    const positions = NETWORK_CONFIG.navPositions;
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const [ax, ay, az] = positions[i]!;
        const [bx, by, bz] = positions[j]!;
        const d = Math.hypot(ax - bx, ay - by, az - bz);
        expect(d).toBeGreaterThan(1.2);
      }
    }
  });

  it('keeps the palette warm and mineral — no white, no neon', () => {
    for (const hex of Object.values(NETWORK_CONFIG.palette)) {
      const value = parseInt(hex.slice(1), 16);
      const r = (value >> 16) & 0xff;
      const g = (value >> 8) & 0xff;
      const b = value & 0xff;
      // Never a white hotspot…
      expect(Math.min(r, g, b)).toBeLessThan(160);
      // …and always warm: red channel leads, blue trails.
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
  });
});
