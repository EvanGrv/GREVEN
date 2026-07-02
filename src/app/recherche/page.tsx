import type { Metadata } from 'next';
import { SectionLayout } from '@/sections/SectionLayout';
import { getSection } from '@/data/sections';
import { SECTION_CONTENT } from '@/data/content';

const section = getSection('recherche')!;

export const metadata: Metadata = {
  title: section.label,
  description: section.description,
};

export default function RecherchePage() {
  return <SectionLayout section={section} content={SECTION_CONTENT.recherche} />;
}
