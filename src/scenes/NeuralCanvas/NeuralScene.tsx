'use client';

import { Canvas } from '@react-three/fiber';
import { SceneLighting } from '@/scenes/SceneLighting/SceneLighting';
import { CameraRig } from '@/scenes/CameraRig/CameraRig';
import { Network } from '@/scenes/Network/Network';
import { usePointerParallax } from '@/hooks/usePointerParallax';
import { maxDprFor } from '@/lib/device-detect';
import type { QualityLevel } from '@/stores/sceneStore';

/**
 * The WebGL scene contents. Kept in its own module so it can be dynamically
 * imported with `ssr: false` while still living under a single, persistent
 * <Canvas> that survives route changes (mounted once in the root layout).
 */
export default function NeuralScene({ quality }: { quality: QualityLevel }) {
  usePointerParallax();

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 38, near: 0.1, far: 100 }}
      dpr={[1, maxDprFor(quality)]}
      gl={{
        antialias: quality !== 'low',
        alpha: true,
        powerPreference: quality === 'low' ? 'low-power' : 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      {/* Warm fog fades the periphery of the network into the background. */}
      <fog attach="fog" args={['#24261e', 8, 22]} />
      <SceneLighting />
      <CameraRig />
      <Network quality={quality} />
    </Canvas>
  );
}
