import type { SectionContent, SectionContentMap } from './types';

/**
 * Editable content for the five portfolio sections.
 * This is demonstration content — structured and ML-focused, but generic.
 * Replace the strings below with real material; the layout adapts automatically.
 * No fake publications or diplomas are invented (see the brief).
 */

const recherche: SectionContent = {
  intro:
    'Mes intérêts de recherche en apprentissage automatique : de la modélisation de séries temporelles au raisonnement structuré, en passant par la décision séquentielle.',
  visual: 'graph',
  placeholder: true,
  groups: [
    {
      heading: 'Axes de recherche',
      items: [
        'Machine Learning',
        'Reinforcement Learning',
        'Réseaux de neurones profonds',
        'Systèmes RAG (Retrieval-Augmented Generation)',
        'Knowledge Graphs',
        'Apprentissage sous incertitude',
      ],
    },
    {
      heading: 'Travaux en cours',
      items: [
        'Projet doctoral — à préciser',
        'Exploration de représentations latentes',
        'Méthodes d’évaluation robustes',
      ],
    },
  ],
};

const projets: SectionContent = {
  intro: 'Une sélection de projets académiques et professionnels en apprentissage automatique.',
  visual: 'layers',
  placeholder: true,
  groups: [
    {
      heading: 'Projets',
      items: [
        'Détection d’exoplanètes — classification de courbes de lumière',
        'Transformer — implémentation from scratch',
        'Système RAG — recherche augmentée par récupération',
        'Reinforcement Learning — agent de contrôle',
        'Graph Neural Networks — apprentissage sur graphes',
        'Analyse de données — pipeline exploratoire',
      ],
    },
  ],
};

const publications: SectionContent = {
  intro: 'Articles, notes de recherche, conférences et contributions scientifiques.',
  visual: 'flow',
  emptyNote:
    'Aucune publication publique pour le moment. Cette section se remplira au fil des travaux.',
  groups: [
    { heading: 'Articles', items: [] },
    { heading: 'Conférences & posters', items: [] },
    { heading: 'Notes de recherche', items: [] },
  ],
};

const apropos: SectionContent = {
  intro:
    'Mon parcours, ma vision de la recherche et les compétences qui structurent mon travail en intelligence artificielle.',
  visual: 'trajectory',
  placeholder: true,
  groups: [
    {
      heading: 'Parcours',
      items: ['Formation en informatique / mathématiques appliquées — à préciser'],
    },
    {
      heading: 'Compétences',
      items: [
        'Python, PyTorch, NumPy',
        'Modélisation & entraînement de réseaux de neurones',
        'Reinforcement Learning',
        'Traitement et analyse de données',
        'Visualisation scientifique',
      ],
    },
    {
      heading: 'Objectifs',
      items: ['Poursuite en doctorat', 'Recherche appliquée en apprentissage automatique'],
    },
  ],
};

const contact: SectionContent = {
  intro: 'Pour échanger sur la recherche, un projet, ou une collaboration.',
  visual: 'converge',
  groups: [],
  contact: {
    email: 'evangrevenn@gmail.com',
    form: true,
    links: [
      {
        label: 'Email',
        kind: 'email',
        value: 'evangrevenn@gmail.com',
        href: 'mailto:evangrevenn@gmail.com',
      },
      {
        label: 'GitHub',
        kind: 'github',
        value: 'github.com/EvanGrv',
        href: 'https://github.com/EvanGrv',
      },
      {
        label: 'LinkedIn',
        kind: 'linkedin',
        value: 'linkedin.com/in/evan-gréven',
        href: 'https://www.linkedin.com/in/evan-gr%C3%A9ven-b2800b22b/',
      },
    ],
  },
};

export const SECTION_CONTENT: SectionContentMap = {
  recherche,
  projets,
  publications,
  'a-propos': apropos,
  contact,
};
