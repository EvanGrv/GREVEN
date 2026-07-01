import { Logo } from '@/components/ui/Logo/Logo';
import { SideNav } from '@/components/navigation/SideNav';
import { GrevenTitle, Eyebrow } from '@/components/typography';
import styles from './page.module.css';

/**
 * Landing composition.
 * Chrome and typography follow the reference: signature top-left, vertical
 * nav right, GRE/VEN split centre, editorial intro bottom-left, discrete
 * kanji and a scroll hint. The centre slot will host the persistent WebGL
 * neural network (Step 4+). GREVEN stays real HTML text for crispness and SEO.
 */
export default function HomePage() {
  return (
    <main id="content" className={styles.hero}>
      <header className={styles.topRow}>
        <Logo />
        <SideNav />
      </header>

      <div className={styles.center}>
        <GrevenTitle>
          <span aria-hidden="true" className={styles.networkGlow} />
        </GrevenTitle>
      </div>

      <footer className={styles.footerRow}>
        <Eyebrow className={styles.intro}>
          Explorer
          <br />
          mon univers
        </Eyebrow>

        <span className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollWord}>scroll</span>
          <span className={styles.scrollLine} />
        </span>

        <p className={styles.kanjiRow} aria-hidden="true">
          静·遠·質·道·特
        </p>
      </footer>
    </main>
  );
}
