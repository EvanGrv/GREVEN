import { Logo } from '@/components/ui/Logo/Logo';
import { Navigation } from '@/components/navigation/Navigation';
import { NeuronCard } from '@/components/ui/NeuronCard/NeuronCard';
import { GrevenTitle, Eyebrow } from '@/components/typography';
import styles from './page.module.css';

/**
 * Immersive landing composition — a single-viewport network map.
 * The persistent WebGL network fills the viewport behind the content; GRE·VEN
 * sits over its dense core as the centrepiece, kept crisp (real HTML) and
 * readable via a soft scrim. Hovering a navigation neuron raises its preview
 * card (NeuronCard), whose arrow launches the cinematic travel into the page.
 */
export default function HomePage() {
  return (
    <>
      <main id="content" className={styles.hero}>
        <header className={styles.topRow}>
          <Logo />
          <Navigation />
        </header>

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
        </footer>
      </main>

      <NeuronCard />
    </>
  );
}
