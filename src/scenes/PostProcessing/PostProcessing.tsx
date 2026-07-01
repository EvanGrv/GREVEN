'use client';

import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { QualityLevel } from '@/stores/sceneStore';

/**
 * Subtle bloom so the neurons' Pearl cores read as glowing, organic cells
 * rather than matte spheres — the biggest lever for the reference's luminous,
 * microscopic look. Deliberately restrained (the brief forbids excessive glow).
 * Disabled on the low tier. Depth-of-field is added in Step 11.
 */
export function PostProcessing({ quality }: { quality: QualityLevel }) {
  if (quality === 'low') return null;
  const intensity = quality === 'high' ? 0.72 : 0.5;

  return (
    <EffectComposer multisampling={quality === 'high' ? 2 : 0} enableNormalPass={false}>
      <Bloom
        intensity={intensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.62}
      />
    </EffectComposer>
  );
}
