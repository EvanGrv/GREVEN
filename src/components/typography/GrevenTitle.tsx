import styles from './GrevenTitle.module.css';

export interface GrevenTitleProps {
  /**
   * Element rendered in the gap between GRE and VEN.
   * On the landing this is the persistent WebGL network; elsewhere it can be
   * a subtle glyph or left empty.
   */
  children?: React.ReactNode;
  /** Heading level for semantics (default h1 on the landing). */
  as?: 'h1' | 'div';
  className?: string;
}

/**
 * The GREVEN wordmark, always split as `GRE [slot] VEN`.
 * Rendered as real, crisp HTML text — never inside WebGL — so it stays sharp,
 * accessible and indexable. The middle slot hosts the neural network.
 */
export function GrevenTitle({ children, as = 'h1', className }: GrevenTitleProps) {
  const Tag = as;
  return (
    <Tag className={`${styles.title} ${className ?? ''}`} aria-label="GREVEN">
      <span className={styles.part} aria-hidden="true">
        GRE
      </span>
      <span className={styles.slot} aria-hidden="true">
        {children}
      </span>
      <span className={styles.part} aria-hidden="true">
        VEN
      </span>
    </Tag>
  );
}
