import type { Metadata } from 'next';
import { SectionLayout } from '@/sections/SectionLayout';
import { getSection } from '@/data/sections';
import { SECTION_CONTENT } from '@/data/content';

const section = getSection('a-propos')!;

export const metadata: Metadata = {
  title: section.label,
  description: section.description,
};

export default function AProposPage() {
  return <SectionLayout section={section} content={SECTION_CONTENT['a-propos']} />;
}
