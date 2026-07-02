import Link from 'next/link';
import { EgMark } from './EgMark';
import styles from './Logo.module.css';

export interface LogoProps {
  /** Compact = mark only (mobile menu, loader, back button). */
  variant?: 'full' | 'compact';
  /** Wrap in a link to home. */
  href?: string;
  className?: string;
}

/**
 * GREVEN signature lockup: the EG monogram beside the wordmark and tagline.
 * Discreet by design — always smaller than the GREVEN hero title.
 */
export function Logo({ variant = 'full', href = '/', className }: LogoProps) {
  const content = (
    <span className={`${styles.logo} ${className ?? ''}`}>
      <EgMark size={variant === 'compact' ? 32 : 44} />
      {variant === 'full' ? (
        <span className={styles.text}>
          <span className={styles.wordmark}>GREVEN</span>
          <span className={styles.tagline}>ML Research Portfolio</span>
        </span>
      ) : (
        <span className="sr-only">GREVEN — ML Research Portfolio</span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className={styles.link} aria-label="GREVEN — retour à l’accueil">
      {content}
    </Link>
  );
}
