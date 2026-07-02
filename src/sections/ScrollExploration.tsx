'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { NEURON_SECTIONS, type SectionId } from '@/data/sections';
import { NETWORK_CONFIG } from '@/data/network.config';
import { useSceneStore } from '@/stores/sceneStore';
import { Eyebrow, Heading } from '@/components/typography';
import { scrollToNetworkTop } from '@/components/layout/SmoothScroll';
import styles from './ScrollExploration.module.css';

/**
 * Scroll-driven exploration of the network.
 * Each step focuses one navigation neuron: as it reaches the viewport centre it
 * sets the shared `hoveredSection`, which highlights that neuron + its axons
 * (same channel as hover) and gently orients the camera toward it. "Entrer"
 * launches the same cinematic travel as clicking the neuron (with an accessible
 * link fallback). This keeps scroll and click one coherent system.
 */
export function ScrollExploration() {
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const visible = new Map<SectionId, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-section') as SectionId | null;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }
        // Focus the most-centred step, or clear when back at the top.
        let best: SectionId | null = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        setHoveredSection(best);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    );

    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [setHoveredSection]);

  const onEnter = (
    e: React.MouseEvent,
    section: (typeof NEURON_SECTIONS)[number],
    index: number,
  ) => {
    const { webglAvailable, reducedMotion } = useSceneStore.getState();
    // Let the plain link navigate when the cinematic travel can't run.
    if (!webglAvailable || reducedMotion) return;
    e.preventDefault();
    const pos = NETWORK_CONFIG.navPositions[index]!;
    setActiveSection(section.id);
    requestTravel(section.id, [pos[0], pos[1], pos[2]]);
  };

  return (
    <div className={styles.exploration}>
      {NEURON_SECTIONS.map((section, index) => (
        <section
          key={section.id}
          data-section={section.id}
          ref={(el) => {
            stepRefs.current[index] = el;
          }}
          className={`${styles.step} ${index % 2 === 1 ? styles.right : styles.left}`}
        >
          <div className={styles.block}>
            <Eyebrow>{`0${index + 1} · ${section.kanjiMeaning}`}</Eyebrow>
            <Heading level={2}>{section.label}</Heading>
            <p className={styles.desc}>{section.description}</p>
            <Link
              href={section.href}
              className={styles.enter}
              onClick={(e) => onEnter(e, section, index)}
            >
              Entrer →
            </Link>
          </div>
        </section>
      ))}

      <button type="button" className={styles.reset} onClick={scrollToNetworkTop}>
        ↑ retour au réseau
      </button>
    </div>
  );
}
