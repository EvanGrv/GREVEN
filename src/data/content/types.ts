import type { SectionId } from '@/data/sections';

/** Which ML-themed visualisation a section renders (never decorative imagery). */
export type VisualKind = 'graph' | 'layers' | 'flow' | 'trajectory' | 'converge';

export interface ContentGroup {
  heading: string;
  items: string[];
}

export interface ContactLink {
  label: string;
  href: string;
  kind: 'email' | 'github' | 'linkedin';
  /** Displayed value (e.g. the address) distinct from the label. */
  value: string;
}

export interface ContactContent {
  email: string;
  links: ContactLink[];
  /** Render the contact form (mailto fallback). */
  form: boolean;
}

export interface SectionContent {
  intro: string;
  visual: VisualKind;
  groups: ContentGroup[];
  /** Shown when a section has no entries yet (e.g. publications). */
  emptyNote?: string;
  /** Marks demo content to be replaced with real material. */
  placeholder?: boolean;
  contact?: ContactContent;
}

export type SectionContentMap = Record<Exclude<SectionId, 'accueil'>, SectionContent>;
