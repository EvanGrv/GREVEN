import { Logo } from '@/components/ui/Logo/Logo';
import { Navigation } from '@/components/navigation/Navigation';
import { GrevenTitle, Eyebrow, Kanji } from '@/components/typography';
import { ScrollExploration } from '@/sections/ScrollExploration';
import { getSection } from '@/data/sections';
import styles from './page.module.css';

const recherche = getSection('recherche')!;
const projets = getSection('projets')!;

/**
 * Immersive landing composition.
 * The persistent WebGL network fills the viewport behind the content; GRE·VEN
 * sits over its dense core as the centrepiece, kept crisp (real HTML) and
 * readable via a soft scrim. Editorial chrome — signature, vertical nav,
 * "explorer mon univers", discrete kanji and a scroll hint — frames generous
 * empty space, following the reference's calm asymmetry.
 */
export default function HomePage() {
  return (
    <>
      <main id="content" className={styles.hero}>
        <header className={styles.topRow}>
          <Logo />
          <Navigation />
        </header>

        {/* Discrete section kanji anchoring the composition (as in the mockup). */}
        <Kanji
          char={recherche.kanji}
          meaning={recherche.kanjiMeaning}
          size="lg"
          className={styles.kanjiLeft}
        />
        <Kanji
          char={projets.kanji}
          meaning={projets.kanjiMeaning}
          size="lg"
          className={styles.kanjiRight}
        />

        <div className={styles.center}>
          <span aria-hidden="true" className={styles.scrim} />
          <GrevenTitle />
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

      <ScrollExploration />
    </>
  );
}
