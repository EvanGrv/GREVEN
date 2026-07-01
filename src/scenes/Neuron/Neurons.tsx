'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import { mulberry32, SeededRandom } from '@/lib/prng';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';

/** First-pass neuron field. A deterministic, centre-dense cloud of soft
 *  cell-body spheres that breathe and drift gently. The full organic network
 *  (dendrites, axons, synapses, navigation neurons) replaces this in Step 5. */

const COUNT_BY_QUALITY: Record<QualityLevel, number> = {
  high: 34,
  medium: 22,
  low: 14,
};

const MAX_RADIUS = 3.2;
const SEED = 'greven-neural-v1';

interface NeuronSeed {
  base: THREE.Vector3;
  scale: number;
  phase: number;
  speed: number;
}

function buildNeurons(count: number): NeuronSeed[] {
  const rng = new SeededRandom(SEED);
  const seeds: NeuronSeed[] = [];
  for (let i = 0; i < count; i += 1) {
    // Bias radius toward the centre so the core is dense, periphery diffuse.
    const t = Math.pow(rng.float(), 1.7);
    const [x, y, z] = rng.onSphere(MAX_RADIUS * t + 0.15, 0.25);
    seeds.push({
      base: new THREE.Vector3(x, y, z * 0.8),
      scale: rng.range(0.09, 0.32),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.25, 0.6),
    });
  }
  return seeds;
}

export function Neurons({ quality }: { quality: QualityLevel }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const count = COUNT_BY_QUALITY[quality];

  const seeds = useMemo(() => buildNeurons(count), [count]);
  // Pre-allocated scratch objects — no per-frame allocation.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const noise = useMemo(() => createNoise3D(mulberry32(1337)), []);

  // Place instances once for the reduced-motion / initial case.
  const placed = useRef(false);
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const still = reducedMotion;
    if (still && placed.current) return;

    for (let i = 0; i < seeds.length; i += 1) {
      const s = seeds[i]!;
      const drift = still ? 0 : 0.18;
      const nx = still ? 0 : noise(s.base.x * 0.4, s.base.y * 0.4, t * 0.05) * drift;
      const ny = still ? 0 : noise(s.base.y * 0.4, s.base.z * 0.4, t * 0.05) * drift;
      const nz = still ? 0 : noise(s.base.z * 0.4, s.base.x * 0.4, t * 0.05) * drift;
      dummy.position.set(s.base.x + nx, s.base.y + ny, s.base.z + nz);
      const breathe = still ? 1 : 1 + Math.sin(t * s.speed + s.phase) * 0.09;
      dummy.scale.setScalar(s.scale * breathe);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    placed.current = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial
        color="#8a7f6c"
        roughness={0.82}
        metalness={0}
        emissive="#f2d0a7"
        emissiveIntensity={0.18}
      />
    </instancedMesh>
  );
}
