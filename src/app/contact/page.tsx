import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/sections/SectionPlaceholder';
import { getSection } from '@/data/sections';

const section = getSection('contact')!;

export const metadata: Metadata = {
  title: section.label,
  description: section.description,
};

export default function ContactPage() {
  return <SectionPlaceholder section={section} />;
}
