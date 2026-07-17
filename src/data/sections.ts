/**
 * Canonical list of portfolio sections.
 * Each section maps to one navigation neuron in the 3D network.
 * Edit here to update the whole site.
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
  /** One-word theme of the section (eyebrow above the heading). */
  kanjiMeaning: string;
  /** Short editorial description. */
  description: string;
}

export const SECTIONS: Section[] = [
  {
    id: 'accueil',
    href: '/',
    label: 'Accueil',
    kanjiMeaning: 'calme',
    description: 'Carte du réseau — vue d’ensemble.',
  },
  {
    id: 'recherche',
    href: '/recherche',
    label: 'Recherche',
    kanjiMeaning: 'connaissance',
    description: 'Machine Learning, séries temporelles, RL et réseaux de neurones.',
  },
  {
    id: 'projets',
    href: '/projets',
    label: 'Projets',
    kanjiMeaning: 'accomplissement',
    description: 'Projets académiques et professionnels.',
  },
  {
    id: 'publications',
    href: '/publications',
    label: 'Publications',
    kanjiMeaning: 'voie',
    description: 'Articles, conférences et contributions scientifiques.',
  },
  {
    id: 'a-propos',
    href: '/a-propos',
    label: 'À propos',
    kanjiMeaning: 'essence',
    description: 'Parcours, vision de la recherche et compétences.',
  },
  {
    id: 'contact',
    href: '/contact',
    label: 'Contact',
    kanjiMeaning: 'singularité',
    description: 'Entrer en contact ou collaborer.',
  },
];

/** Sections that own a navigation neuron in the network (everything but Accueil). */
export const NEURON_SECTIONS: Section[] = SECTIONS.filter((s) => s.id !== 'accueil');

export function getSection(id: SectionId): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}
