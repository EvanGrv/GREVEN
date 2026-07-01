'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/sceneStore';

/**
 * Camera rig. For Step 4 it applies a very subtle pointer parallax around the
 * network origin. Cinematic neuron-to-page travel paths are layered on here in
 * Step 8. Pointer is read via getState() (no re-renders); motion is disabled
 * under prefers-reduced-motion.
 */
const BASE = new THREE.Vector3(0, 0, 9);
const PARALLAX = new THREE.Vector3(0.7, 0.5, 0);

export function CameraRig() {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const { pointer } = useSceneStore.getState();
    if (reducedMotion) {
      target.copy(BASE);
    } else {
      target.set(BASE.x + pointer.x * PARALLAX.x, BASE.y + pointer.y * PARALLAX.y, BASE.z);
    }
    // Frame-rate independent smoothing toward the target.
    const alpha = 1 - Math.pow(0.0015, delta);
    state.camera.position.lerp(target, alpha);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
