import type { Section } from '@/data/sections';
import { Logo } from '@/components/ui/Logo/Logo';
import { BackToNetwork } from '@/components/ui/BackToNetwork';
import { Kanji, Eyebrow, Heading } from '@/components/typography';
import styles from './SectionPlaceholder.module.css';

/**
 * Temporary section shell. Establishes the editorial "region of the same
 * network" layout and the persistent "retour au réseau" affordance.
 * Rich, ML-focused content and per-section visualisations arrive in Step 9.
 */
export function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <main id="content" className={styles.page}>
      <header className={styles.top}>
        <Logo />
      </header>

      <div className={styles.body}>
        <Kanji char={section.kanji} meaning={section.kanjiMeaning} size="lg" />
        <Eyebrow>{section.kanjiMeaning}</Eyebrow>
        <Heading level={1}>{section.label}</Heading>
        <p className={styles.description}>{section.description}</p>
      </div>

      <footer className={styles.footer}>
        <BackToNetwork />
      </footer>
    </main>
  );
}
