import styles from './Kanji.module.css';

export interface KanjiProps {
  /** The kanji glyph. */
  char: string;
  /** Documented meaning — surfaced as a tooltip/label, never decorative. */
  meaning: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * A single kanji with its documented meaning. Every kanji on the site carries
 * a defined significance (see docs/IMPLEMENTATION_PLAN.md §4). The glyph is
 * aria-hidden; the meaning is exposed to assistive tech.
 */
export function Kanji({ char, meaning, size = 'md', className }: KanjiProps) {
  return (
    <span className={`${styles.kanji} ${styles[size]} ${className ?? ''}`} title={meaning}>
      <span aria-hidden="true">{char}</span>
      <span className="sr-only">{meaning}</span>
    </span>
  );
}
