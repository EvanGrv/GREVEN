import Link from 'next/link';
import { EgMark } from './Logo/EgMark';
import styles from './BackToNetwork.module.css';

/**
 * "Retour au réseau" affordance — always available, bottom-left, on every
 * section page. Pairs the compact monogram with a clear text label so it works
 * for keyboard and screen-reader users too.
 */
export function BackToNetwork({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className={styles.back}>
      <EgMark size={22} framed={false} />
      <span>retour au réseau</span>
    </Link>
  );
}
