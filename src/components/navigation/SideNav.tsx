'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS } from '@/data/sections';
import { useSceneStore } from '@/stores/sceneStore';
import styles from './SideNav.module.css';

/**
 * Vertical navigation, mirroring the reference's right-hand rail.
 * Each entry corresponds to a navigation neuron and is a real, keyboard-
 * focusable link — the accessible fallback for the 3D interactions. Hover and
 * focus are mirrored through the scene store, so pointing at a link emphasises
 * its neuron in the network (and vice-versa).
 */
export function SideNav() {
  const pathname = usePathname();
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);

  return (
    <nav className={styles.nav} aria-label="Sections du portfolio">
      <ul className={styles.list}>
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          const hovered = hoveredSection === section.id;
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                className={styles.link}
                aria-current={active ? 'page' : undefined}
                data-active={active || undefined}
                data-hovered={hovered || undefined}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                onFocus={() => setHoveredSection(section.id)}
                onBlur={() => setHoveredSection(null)}
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
