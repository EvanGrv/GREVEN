import Link from 'next/link';
import { NEURON_SECTIONS } from '@/data/sections';
import styles from './page.module.css';

/**
 * Landing placeholder for the neural experience.
 * The final composition (persistent WebGL network between GRE and VEN,
 * editorial side panels, cinematic transitions) is built in later steps.
 * This scaffold already establishes the dark palette, the GRE / VEN split,
 * and accessible HTML navigation that mirrors the future 3D neurons.
 */
export default function HomePage() {
  return (
    <main id="content" className={styles.hero}>
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>GREVEN</span>
          <span className={styles.tagline}>AI Research Portfolio</span>
        </div>

        <nav className={styles.nav} aria-label="Navigation principale">
          <Link href="/" className={styles.navLink} aria-current="page">
            Accueil
          </Link>
          {NEURON_SECTIONS.map((section) => (
            <Link key={section.id} href={section.href} className={styles.navLink}>
              {section.label}
            </Link>
          ))}
        </nav>
      </div>

      <h1 className={styles.title}>
        <span>GRE</span>
        <span aria-hidden="true" className={styles.networkSlot} />
        <span>VEN</span>
      </h1>

      <div className={styles.footerRow}>
        <p className={styles.intro}>
          Explorer
          <br />
          mon univers
        </p>
        <p className={styles.kanjiRow} aria-hidden="true">
          静·遠·質·道·特
        </p>
      </div>
    </main>
  );
}
