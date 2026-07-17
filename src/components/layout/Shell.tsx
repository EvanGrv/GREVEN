import styles from './Shell.module.css';

export interface ShellProps {
  children: React.ReactNode;
  /** Vertical alignment of the main content within the viewport. */
  align?: 'center' | 'start';
  className?: string;
  id?: string;
}

/**
 * Full-viewport editorial page frame: consistent page margins, min-height,
 * and a place for the persistent header/footer chrome to sit around content.
 * Uses the shared spacing tokens so every route breathes the same way.
 */
export function Shell({ children, align = 'center', className, id = 'content' }: ShellProps) {
  return (
    <main
      id={id}
      className={`${styles.shell} ${align === 'center' ? styles.center : styles.start} ${
        className ?? ''
      }`}
    >
      {children}
    </main>
  );
}
