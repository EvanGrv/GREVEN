import styles from './Heading.module.css';

export interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}

/** Serif editorial heading with a consistent type scale. */
export function Heading({ children, level = 2, className }: HeadingProps) {
  const Tag = `h${level}` as const;
  const sizeClass = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return <Tag className={`${styles.heading} ${sizeClass} ${className ?? ''}`}>{children}</Tag>;
}
