import { describe, expect, it } from 'vitest';
import { detectQuality, maxDprFor, qualityOverride } from '@/lib/device-detect';

describe('qualityOverride', () => {
  it('honours a valid ?quality= URL parameter', () => {
    window.history.replaceState({}, '', '/?quality=high');
    expect(qualityOverride()).toBe('high');
    window.history.replaceState({}, '', '/?quality=low');
    expect(qualityOverride()).toBe('low');
  });

  it('ignores missing or invalid values', () => {
    window.history.replaceState({}, '', '/');
    expect(qualityOverride()).toBeNull();
    window.history.replaceState({}, '', '/?quality=ultra');
    expect(qualityOverride()).toBeNull();
  });
});

describe('detectQuality', () => {
  it('always returns a valid tier', () => {
    expect(['high', 'medium', 'low']).toContain(detectQuality());
  });
});

describe('maxDprFor', () => {
  it('caps the pixel ratio per tier (fill-rate grows with dpr²)', () => {
    expect(maxDprFor('high')).toBe(1.6);
    expect(maxDprFor('medium')).toBe(1.3);
    expect(maxDprFor('low')).toBe(1);
    expect(maxDprFor('high')).toBeGreaterThan(maxDprFor('medium'));
    expect(maxDprFor('medium')).toBeGreaterThan(maxDprFor('low'));
  });
});
