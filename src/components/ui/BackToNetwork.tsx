'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NEURON_SECTIONS } from '@/data/sections';
import { useSceneStore } from '@/stores/sceneStore';
import { EgMark } from './Logo/EgMark';
import styles from './BackToNetwork.module.css';

/**
 * "Retour au réseau" affordance — always available, bottom-left, on every
 * section page. Pairs the compact monogram with a clear text label so it works
 * for keyboard and screen-reader users too. When the cinematic travel can run,
 * it plays the reverse journey (pull-back past the section's neuron) instead
 * of a hard route change.
 */
export function BackToNetwork({ href = '/' }: { href?: string }) {
  const pathname = usePathname();
  const requestReturn = useSceneStore((s) => s.requestReturn);

  const onClick = (e: React.MouseEvent) => {
    const { webglAvailable, reducedMotion } = useSceneStore.getState();
    const section = NEURON_SECTIONS.find((s) => s.href === pathname);
    // Let the plain link navigate when the cinematic travel can't run.
    if (!webglAvailable || reducedMotion || !section) return;
    e.preventDefault();
    requestReturn(section.id);
  };

  return (
    <Link href={href} className={styles.back} onClick={onClick}>
      <EgMark size={22} framed={false} />
      <span>retour au réseau</span>
    </Link>
  );
}
