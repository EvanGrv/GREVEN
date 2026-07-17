import { describe, expect, it } from 'vitest';
import { SECTION_CONTENT } from '@/data/content';
import { NEURON_SECTIONS } from '@/data/sections';

describe('SECTION_CONTENT', () => {
  it('provides content for every navigation section', () => {
    for (const section of NEURON_SECTIONS) {
      expect(SECTION_CONTENT[section.id as keyof typeof SECTION_CONTENT]).toBeDefined();
    }
  });

  it('gives each section an intro and an ML visualisation', () => {
    const validVisuals = ['graph', 'layers', 'flow', 'trajectory', 'converge'];
    for (const key of Object.keys(SECTION_CONTENT) as (keyof typeof SECTION_CONTENT)[]) {
      const content = SECTION_CONTENT[key];
      expect(content.intro.length).toBeGreaterThan(0);
      expect(validVisuals).toContain(content.visual);
    }
  });

  it('exposes contact links including the email, without inventing publications', () => {
    expect(SECTION_CONTENT.contact.contact?.email).toBe('evangrevenn@gmail.com');
    expect(SECTION_CONTENT.contact.contact?.links.some((l) => l.kind === 'github')).toBe(true);
    // Publications stays an honest empty state (no fabricated entries).
    expect(SECTION_CONTENT.publications.groups.every((g) => g.items.length === 0)).toBe(true);
  });
});
