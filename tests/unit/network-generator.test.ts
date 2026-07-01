import { describe, expect, it } from 'vitest';
import { generateNetwork } from '@/lib/network-generator';
import { NEURON_SECTIONS } from '@/data/sections';
import { countsFor } from '@/data/network.config';

describe('generateNetwork', () => {
  it('is deterministic for a given quality', () => {
    const a = generateNetwork('medium');
    const b = generateNetwork('medium');
    expect(a).toEqual(b);
  });

  it('produces different compositions across quality tiers', () => {
    expect(generateNetwork('high').nodes.length).not.toBe(generateNetwork('low').nodes.length);
  });

  it('always yields exactly one navigation neuron per section, mapped in order', () => {
    const model = generateNetwork('high');
    expect(model.navIndices).toHaveLength(NEURON_SECTIONS.length);
    const navSections = model.navIndices.map((i) => model.nodes[i]?.sectionId);
    expect(navSections).toEqual(NEURON_SECTIONS.map((s) => s.id));
  });

  it('has node counts matching the quality config (nav + neurons + synapses)', () => {
    const counts = countsFor('high');
    const model = generateNetwork('high');
    expect(model.nodes).toHaveLength(NEURON_SECTIONS.length + counts.neurons + counts.synapses);
  });

  it('connects the network (every navigation neuron has at least one axon)', () => {
    const model = generateNetwork('high');
    for (const navIndex of model.navIndices) {
      const connected = model.edges.some((e) => e.a === navIndex || e.b === navIndex);
      expect(connected).toBe(true);
    }
  });
});
