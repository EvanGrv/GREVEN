import { SideNav } from './SideNav';
import { MobileNav } from './MobileNav';
import styles from './Navigation.module.css';

/**
 * Responsive navigation: the vertical rail on desktop/tablet, a compact menu on
 * mobile. Both are real, keyboard-accessible links (the fallback for the 3D
 * neuron interactions).
 */
export function Navigation() {
  return (
    <>
      <div className={styles.desktop}>
        <SideNav />
      </div>
      <div className={styles.mobile}>
        <MobileNav />
      </div>
    </>
  );
}
