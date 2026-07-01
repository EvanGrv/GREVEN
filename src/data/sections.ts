/**
 * Canonical list of portfolio sections.
 * Each section maps to one navigation neuron in the 3D network.
 * Kanji carry a documented meaning (see docs/IMPLEMENTATION_PLAN.md §4);
 * they are never decorative. Edit here to update the whole site.
 */

export type SectionId =
  | 'accueil'
  | 'recherche'
  | 'projets'
  | 'publications'
  | 'a-propos'
  | 'contact';

export interface Section {
  /** Stable identifier, also used as the navigation neuron id. */
  id: SectionId;
  /** Route path (App Router). */
  href: string;
  /** Display label (fr). */
  label: string;
  /** Documented kanji. */
  kanji: string;
  /** Documented meaning of the kanji. */
  kanjiMeaning: string;
  /** Short editorial description. */
  description: string;
}

export const SECTIONS: Section[] = [
  {
    id: 'accueil',
    href: '/',
    label: 'Accueil',
    kanji: '静',
    kanjiMeaning: 'calme',
    description: 'Carte du réseau — vue d’ensemble.',
  },
  {
    id: 'recherche',
    href: '/recherche',
    label: 'Recherche',
    kanji: '知',
    kanjiMeaning: 'connaissance',
    description: 'Machine Learning, séries temporelles, RL et réseaux de neurones.',
  },
  {
    id: 'projets',
    href: '/projets',
    label: 'Projets',
    kanji: '美',
    kanjiMeaning: 'accomplissement',
    description: 'Projets académiques et professionnels.',
  },
  {
    id: 'publications',
    href: '/publications',
    label: 'Publications',
    kanji: '道',
    kanjiMeaning: 'voie',
    description: 'Articles, conférences et contributions scientifiques.',
  },
  {
    id: 'a-propos',
    href: '/a-propos',
    label: 'À propos',
    kanji: '質',
    kanjiMeaning: 'essence',
    description: 'Parcours, vision de la recherche et compétences.',
  },
  {
    id: 'contact',
    href: '/contact',
    label: 'Contact',
    kanji: '特',
    kanjiMeaning: 'singularité',
    description: 'Entrer en contact ou collaborer.',
  },
];

/** Sections that own a navigation neuron in the network (everything but Accueil). */
export const NEURON_SECTIONS: Section[] = SECTIONS.filter((s) => s.id !== 'accueil');

export function getSection(id: SectionId): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}
