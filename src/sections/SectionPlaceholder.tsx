import Link from 'next/link';
import type { Section } from '@/data/sections';
import styles from './SectionPlaceholder.module.css';

/**
 * Temporary section shell. Establishes the editorial "region of the same
 * network" layout and the persistent "retour au réseau" affordance.
 * Rich, ML-focused content and per-section visualisations arrive in Step 9.
 */
export function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <main id="content" className={styles.page}>
      <header className={styles.header}>
        <span className={styles.kanji} title={section.kanjiMeaning} aria-hidden="true">
          {section.kanji}
        </span>
        <p className={styles.eyebrow}>{section.kanjiMeaning}</p>
        <h1 className={styles.title}>{section.label}</h1>
        <p className={styles.description}>{section.description}</p>
      </header>

      <Link href="/" className={styles.back}>
        ← retour au réseau
      </Link>
    </main>
  );
}
