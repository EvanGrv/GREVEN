'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NEURON_SECTIONS, type Section } from '@/data/sections';
import { NETWORK_CONFIG } from '@/data/network.config';
import { useSceneStore } from '@/stores/sceneStore';
import { Eyebrow } from '@/components/typography';
import styles from './NeuronCard.module.css';

/** Delay before the card hides once the neuron is no longer hovered — long
 *  enough to travel the pointer from the neuron onto the card. */
const CLOSE_GRACE_MS = 280;
/** Gap between the neuron core and the card edge (px). */
const GAP = 26;
const MARGIN = 16;

/**
 * Floating preview card for the hovered navigation neuron.
 * Anchored to the neuron's projected screen position (written each frame by
 * the Network into `cardAnchor`), it mirrors the section pages' editorial
 * design — eyebrow, serif title, description — and its arrow launches the same
 * cinematic neural travel as the scene. Hover-driven, so it only augments the
 * always-available side navigation.
 */
export function NeuronCard() {
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);

  const [section, setSection] = useState<Section | null>(null);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show on hover; hide after a grace period so the pointer can reach the card.
  useEffect(() => {
    if (hoveredSection) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      const next = NEURON_SECTIONS.find((s) => s.id === hoveredSection);
      if (next) {
        setSection(next);
        setOpen(true);
      }
      return;
    }
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [hoveredSection]);

  // Follow the neuron's screen anchor (in-place store value, no re-renders).
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const el = cardRef.current;
      if (el) {
        const anchor = useSceneStore.getState().cardAnchor;
        if (anchor.visible) {
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          const x = Math.min(
            Math.max(anchor.x, MARGIN + w / 2),
            window.innerWidth - MARGIN - w / 2,
          );
          let y = anchor.y + GAP;
          if (y + h > window.innerHeight - MARGIN) y = anchor.y - GAP - h;
          el.style.transform = `translate3d(${x - w / 2}px, ${y}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const index = section ? NEURON_SECTIONS.findIndex((s) => s.id === section.id) : -1;

  const onEnter = (e: React.MouseEvent) => {
    if (!section || index < 0) return;
    const { webglAvailable, reducedMotion } = useSceneStore.getState();
    // Let the plain link navigate when the cinematic travel can't run.
    if (!webglAvailable || reducedMotion) return;
    e.preventDefault();
    const pos = NETWORK_CONFIG.navPositions[index]!;
    setActiveSection(section.id);
    requestTravel(section.id, [pos[0], pos[1], pos[2]]);
    setHoveredSection(null);
    setOpen(false);
  };

  if (!section) return null;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      data-open={open || undefined}
      onMouseEnter={() => setHoveredSection(section.id)}
      onMouseLeave={() => setHoveredSection(null)}
      role="dialog"
      aria-label={`Aperçu — ${section.label}`}
    >
      <Eyebrow className={styles.eyebrow}>{`0${index + 1} · ${section.kanjiMeaning}`}</Eyebrow>
      <p className={styles.title}>{section.label}</p>
      <p className={styles.desc}>{section.description}</p>
      <Link
        href={section.href}
        className={styles.enter}
        aria-label={`Explorer ${section.label}`}
        onClick={onEnter}
      >
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
