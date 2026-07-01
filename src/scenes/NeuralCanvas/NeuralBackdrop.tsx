'use client';

import dynamic from 'next/dynamic';
import { useSceneCapabilities } from '@/hooks/useSceneCapabilities';
import styles from './NeuralBackdrop.module.css';

// Load the WebGL scene only on the client, after capability detection.
const NeuralScene = dynamic(() => import('./NeuralScene'), { ssr: false });

/**
 * Persistent neural backdrop.
 * Mounted once in the root layout so the <Canvas> survives route changes,
 * enabling continuous, uninterrupted transitions. Renders nothing when WebGL
 * is unavailable — the HTML content is a complete, usable fallback on its own.
 */
export function NeuralBackdrop() {
  const { webglAvailable, quality } = useSceneCapabilities();

  // Not yet probed, or unsupported → no canvas (graceful, no layout shift).
  if (!webglAvailable || !quality) {
    return <div className={styles.backdrop} aria-hidden="true" />;
  }

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <NeuralScene quality={quality} />
    </div>
  );
}
