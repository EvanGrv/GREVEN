'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { SceneLighting } from '@/scenes/SceneLighting/SceneLighting';
import { CameraRig } from '@/scenes/CameraRig/CameraRig';
import { Network } from '@/scenes/Network/Network';
import { PostProcessing } from '@/scenes/PostProcessing/PostProcessing';
import { NeuralTravel } from '@/transitions/NeuralTravel';
import { usePointerParallax } from '@/hooks/usePointerParallax';
import { maxDprFor } from '@/lib/device-detect';
import type { QualityLevel } from '@/stores/sceneStore';

/** Deep, warm background baked into the scene. Rendering opaque keeps the bloom
 *  compositor correct and matches the reference's flat, mineral darkness. */
const SCENE_BG = '#1c1e19';
/** Slightly lifted olive haze — reads as depth mist, not black falloff. */
const SCENE_FOG = '#282a21';

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
        alpha: false,
        powerPreference: quality === 'low' ? 'low-power' : 'high-performance',
      }}
    >
      <color attach="background" args={[SCENE_BG]} />
      {/* Warm haze fades the deep layers of the network into the background. */}
      <fog attach="fog" args={[SCENE_FOG, 6, 17]} />
      <SceneLighting />
      {/* Procedural studio environment (no HDRI download): two warm softboxes
          and a faint olive floor bounce, baked once into a tiny env map. This
          is what the membranes' clearcoat/sheen reflect — the cinematic
          "wet organic" read. Skipped on the low tier. */}
      {quality !== 'low' && (
        <Environment resolution={64} frames={1}>
          <Lightformer
            form="rect"
            color="#b79a72"
            intensity={2.2}
            position={[-4, 4, 5]}
            scale={[5, 3, 1]}
          />
          <Lightformer
            form="rect"
            color="#65371f"
            intensity={1.4}
            position={[5, -3, -4]}
            scale={[4, 3, 1]}
          />
          <Lightformer
            form="ring"
            color="#343328"
            intensity={0.8}
            position={[0, -5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[8, 8, 1]}
          />
        </Environment>
      )}
      <CameraRig />
      <NeuralTravel />
      <Suspense fallback={null}>
        <Network quality={quality} />
      </Suspense>
      <PostProcessing quality={quality} />
    </Canvas>
  );
}
