'use client';

import { useMemo } from 'react';
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { QualityLevel } from '@/stores/sceneStore';

/**
 * Post-processing — the film pass.
 * - Bloom (high + medium): the neurons' warm cores read as glowing cells.
 * - Depth of field (high only): focused on the network core so the periphery
 *   softens into the reference's microscopic look, while the central hub stays
 *   sharp. The GREVEN wordmark is HTML (never in the canvas), so it is never
 *   blurred.
 * - Film grain + vignette (high + medium): the cinematic finish — a barely
 *   visible organic grain and a soft darkening of the frame edges that pulls
 *   the eye to the title. Restrained throughout (the brief forbids glow).
 * Disabled entirely on the low tier.
 */
export function PostProcessing({ quality }: { quality: QualityLevel }) {
  const focusTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  if (quality === 'low') return null;

  if (quality === 'high') {
    return (
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.48}
          luminanceSmoothing={0.85}
          mipmapBlur
          radius={0.7}
        />
        <DepthOfField target={focusTarget} focalLength={0.018} bokehScale={2.4} height={480} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.55} />
        <Vignette eskil={false} offset={0.26} darkness={0.62} />
      </EffectComposer>
    );
  }

  // Medium: bloom + the film finish (both cheap), no DoF.
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.48}
        luminanceSmoothing={0.85}
        mipmapBlur
        radius={0.7}
      />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.5} />
      <Vignette eskil={false} offset={0.26} darkness={0.55} />
    </EffectComposer>
  );
}
