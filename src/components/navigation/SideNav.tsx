'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS } from '@/data/sections';
import styles from './SideNav.module.css';

/**
 * Vertical navigation, mirroring the reference's right-hand rail.
 * Each entry corresponds to a navigation neuron and is a real, keyboard-
 * focusable link — the accessible fallback for the 3D interactions.
 */
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Sections du portfolio">
      <ul className={styles.list}>
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                className={styles.link}
                aria-current={active ? 'page' : undefined}
                data-active={active || undefined}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.label}>{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
