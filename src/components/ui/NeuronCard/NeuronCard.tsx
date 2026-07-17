'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NEURON_SECTIONS, type Section } from '@/data/sections';
import { NETWORK_CONFIG } from '@/data/network.config';
import { useSceneStore } from '@/stores/sceneStore';
import { Eyebrow } from '@/components/typography';
import styles from './NeuronCard.module.css';

/** Once the pointer has left both the card and its neuron, the card closes
 *  after this delay — and never before, so the window feels stable. */
const LEAVE_CLOSE_MS = 1000;
/** How often the supervisor re-evaluates pointer/focus state. */
const SUPERVISE_MS = 120;
/** A different neuron must hold the hover this long before it may steal an
 *  open card (crossing its wide hover zone must not swap the window). */
const RETARGET_INTENT_MS = 250;
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
  const pointerXY = useRef({ x: -1, y: -1 });

  // Track the raw pointer so closing can be decided geometrically. Enter/leave
  // events are not enough: when the neuron hover drops while the pointer is
  // ALREADY inside the card, no new mouseenter ever fires and the card used to
  // fade away under the cursor.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerXY.current.x = e.clientX;
      pointerXY.current.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const pointerRestsOnCard = () => {
    const el = cardRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const { x, y } = pointerXY.current;
    const PAD = 24; // forgiving corridor around the card
    return x >= r.left - PAD && x <= r.right + PAD && y >= r.top - PAD && y <= r.bottom + PAD;
  };

  // Open the card when a neuron gains focus. Retargeting an ALREADY-open card
  // to a different neuron requires intent: the new focus must persist briefly
  // (the wide hover zones would otherwise steal the window from a pointer
  // merely crossing the scene), and it never happens while the pointer rests
  // on the current card.
  const retargetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hoveredSection) return;
    const next = NEURON_SECTIONS.find((s) => s.id === hoveredSection);
    if (!next) return;
    if (retargetTimer.current) {
      clearTimeout(retargetTimer.current);
      retargetTimer.current = null;
    }
    if (!open || !section || next.id === section.id) {
      setSection(next);
      setOpen(true);
      return;
    }
    retargetTimer.current = setTimeout(() => {
      const still = useSceneStore.getState().hoveredSection;
      if (still === next.id && !pointerRestsOnCard()) {
        setSection(next);
        setOpen(true);
      }
    }, RETARGET_INTENT_MS);
    return () => {
      if (retargetTimer.current) clearTimeout(retargetTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredSection]);

  // Supervisor — the whole life of an open card, evaluated geometrically:
  // · pointer resting on the card → it stays open and the section keeps the
  //   focus (highlighted neuron, dimmed title), whatever events did or didn't
  //   fire;
  // · pointer back on the neuron (or its nav link) → stays open;
  // · pointer away from both → closes after LEAVE_CLOSE_MS, the countdown
  //   resetting the moment the pointer returns.
  useEffect(() => {
    if (!open || !section) return;
    let leftAt: number | null = null;
    let focusHeldByCard = false;
    const id = window.setInterval(() => {
      const store = useSceneStore.getState();
      if (pointerRestsOnCard()) {
        leftAt = null;
        if (store.hoveredSection !== section.id) {
          store.setHoveredSection(section.id);
          focusHeldByCard = true;
        }
        return;
      }
      if (focusHeldByCard) {
        // Release our hold so the raycast/nav become the source of truth again.
        store.setHoveredSection(null);
        focusHeldByCard = false;
        leftAt = performance.now();
        return;
      }
      if (store.hoveredSection === section.id) {
        leftAt = null;
        return;
      }
      if (leftAt === null) {
        leftAt = performance.now();
        return;
      }
      if (performance.now() - leftAt >= LEAVE_CLOSE_MS) setOpen(false);
    }, SUPERVISE_MS);
    return () => window.clearInterval(id);
  }, [open, section]);

  // Position the card ONCE from the neuron's screen anchor, then freeze it.
  // The camera has pointer parallax: a card that kept following its neuron
  // slid away from the cursor on approach, making the arrow unclickable.
  const frozenFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !section) return;
    if (frozenFor.current === section.id) return;
    let raf = 0;
    const tick = () => {
      const el = cardRef.current;
      const anchor = useSceneStore.getState().cardAnchor;
      if (el && anchor.visible) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const x = Math.min(Math.max(anchor.x, MARGIN + w / 2), window.innerWidth - MARGIN - w / 2);
        let y = anchor.y + GAP;
        if (y + h > window.innerHeight - MARGIN) y = anchor.y - GAP - h;
        el.style.transform = `translate3d(${x - w / 2}px, ${y}px, 0)`;
        frozenFor.current = section.id;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, section]);

  // Re-arm the one-shot positioning once the card has fully faded out, so the
  // next opening anchors at the neuron's then-current position.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      frozenFor.current = null;
    }, 420);
    return () => clearTimeout(t);
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
