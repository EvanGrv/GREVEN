'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/sceneStore';
import { HOME_POSE, SECTION_POSE } from './poses';

/**
 * Camera rig.
 * - While a neural travel is active, it applies the pose written by the
 *   NeuralTravel controller (GSAP) — the rig is the single owner of the camera.
 * - Otherwise it holds a route-aware resting pose (home vs section) with a very
 *   subtle pointer parallax. Under reduced motion the pose is applied instantly.
 */
const PARALLAX = new THREE.Vector3(0.7, 0.5, 0);

export function CameraRig() {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const pathname = usePathname();

  const base = useMemo(
    () => new THREE.Vector3(...(pathname === '/' ? HOME_POSE.position : SECTION_POSE.position)),
    [pathname],
  );
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const { travelPose, pointer } = useSceneStore.getState();

    // Travel owns the camera while active.
    if (travelPose.active) {
      state.camera.position.set(travelPose.px, travelPose.py, travelPose.pz);
      state.camera.lookAt(travelPose.tx, travelPose.ty, travelPose.tz);
      return;
    }

    if (reducedMotion) {
      state.camera.position.copy(base);
      state.camera.lookAt(0, 0, 0);
      return;
    }

    target.set(base.x + pointer.x * PARALLAX.x, base.y + pointer.y * PARALLAX.y, base.z);
    const alpha = 1 - Math.pow(0.0015, delta);
    state.camera.position.lerp(target, alpha);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
