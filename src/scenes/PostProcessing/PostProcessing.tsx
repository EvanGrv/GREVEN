'use client';

import { useMemo } from 'react';
import { Bloom, DepthOfField, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { QualityLevel } from '@/stores/sceneStore';

/**
 * Post-processing.
 * - Bloom (high + medium): the neurons' Pearl cores read as glowing cells.
 * - Depth of field (high only): focused on the network core so the periphery
 *   softens into the reference's microscopic look, while the central hub stays
 *   sharp. The GREVEN wordmark is HTML (never in the canvas), so it is never
 *   blurred. Restrained throughout (the brief forbids excessive glow).
 * Disabled entirely on the low tier.
 */
export function PostProcessing({ quality }: { quality: QualityLevel }) {
  const focusTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  if (quality === 'low') return null;

  if (quality === 'high') {
    return (
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <Bloom
          intensity={0.45}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.85}
          mipmapBlur
          radius={0.7}
        />
        <DepthOfField target={focusTarget} focalLength={0.018} bokehScale={2.4} height={480} />
      </EffectComposer>
    );
  }

  // Medium: bloom only.
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.85}
        mipmapBlur
        radius={0.7}
      />
    </EffectComposer>
  );
}
