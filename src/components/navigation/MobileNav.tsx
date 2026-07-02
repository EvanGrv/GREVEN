'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS } from '@/data/sections';
import { EgMark } from '@/components/ui/Logo/EgMark';
import styles from './MobileNav.module.css';

/**
 * Compact, accessible mobile menu. A toggle reveals a full-screen overlay of
 * sections (kanji + label). Keyboard-friendly: Escape closes, focus moves to
 * the first item on open. The 3D interactions are pointer-only, so this is the
 * primary navigation on touch devices.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Fermer' : 'Menu'}
      </button>

      {open && (
        <nav id="mobile-menu" className={styles.overlay} aria-label="Sections du portfolio">
          <div className={styles.overlayHeader}>
            <EgMark size={30} />
          </div>
          <ul className={styles.list}>
            {SECTIONS.map((section, i) => (
              <li key={section.id}>
                <Link
                  ref={i === 0 ? firstLink : undefined}
                  href={section.href}
                  className={styles.link}
                  aria-current={pathname === section.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.kanji} aria-hidden="true">
                    {section.kanji}
                  </span>
                  <span>{section.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
