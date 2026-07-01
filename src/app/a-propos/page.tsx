import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/sections/SectionPlaceholder';
import { getSection } from '@/data/sections';

const section = getSection('a-propos')!;

export const metadata: Metadata = {
  title: section.label,
  description: section.description,
};

export default function AProposPage() {
  return <SectionPlaceholder section={section} />;
}
