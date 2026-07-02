'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { NEURON_SECTIONS } from '@/data/sections';
import { NETWORK_CONFIG } from '@/data/network.config';
import { useSceneStore } from '@/stores/sceneStore';
import { HOME_POSE, SECTION_POSE } from './poses';

/**
 * Camera rig.
 * - While a neural travel is active, it applies the pose written by the
 *   NeuralTravel controller (GSAP) — the rig is the single owner of the camera.
 * - On the home route, a focused section (from hover or scroll) gently orients
 *   the camera toward that neuron.
 * - Otherwise it holds a route-aware resting pose with subtle pointer parallax.
 *   Under reduced motion the pose is applied instantly.
 */
const PARALLAX = new THREE.Vector3(0.7, 0.5, 0);

export function CameraRig() {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const pathname = usePathname();
  const isHome = pathname === '/';

  const base = useMemo(
    () => new THREE.Vector3(...(isHome ? HOME_POSE.position : SECTION_POSE.position)),
    [isHome],
  );

  // Neuron the camera should orient toward on home (scroll/hover focus).
  const focus = useMemo(() => {
    if (!isHome || !hoveredSection) return null;
    const index = NEURON_SECTIONS.findIndex((s) => s.id === hoveredSection);
    if (index < 0) return null;
    return new THREE.Vector3(...NETWORK_CONFIG.navPositions[index]!);
  }, [isHome, hoveredSection]);

  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);

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

    // Resting pose + subtle parallax, plus a gentle bias toward the focus.
    target.set(base.x + pointer.x * PARALLAX.x, base.y + pointer.y * PARALLAX.y, base.z);
    desired.set(0, 0, 0);
    if (focus) {
      target.x += focus.x * 0.12;
      target.y += focus.y * 0.12;
      desired.lerp(focus, 0.32);
    }

    const alpha = 1 - Math.pow(0.0015, delta);
    state.camera.position.lerp(target, alpha);
    // Ease the look target so focus changes glide rather than snap.
    look.lerp(desired, 1 - Math.pow(0.02, delta));
    state.camera.lookAt(look);
  });

  return null;
}
