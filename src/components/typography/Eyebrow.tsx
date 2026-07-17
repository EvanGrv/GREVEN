import styles from './Eyebrow.module.css';

export interface EyebrowProps {
  children: React.ReactNode;
  as?: 'p' | 'span' | 'h2';
  className?: string;
}

/** Small, letter-spaced, uppercase editorial label. */
export function Eyebrow({ children, as = 'p', className }: EyebrowProps) {
  const Tag = as;
  return <Tag className={`${styles.eyebrow} ${className ?? ''}`}>{children}</Tag>;
}
