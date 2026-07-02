'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/neuron.glb';

export interface NeuronAsset {
  /** The whole neural-network model, centred at the origin and tuned to glow. */
  scene: THREE.Group;
}

/**
 * Loads the neuron-network model once and prepares it for a single, centred
 * placement. This GLB is the *entire* network — one large soma, a radiating
 * dendrite tree and several secondary cell bodies on the branches — not a neuron
 * to instance. The base-colour texture doubles as the emissive map so the bright
 * filaments glow (and bloom) warmly while dark areas stay matte — the
 * reference's luminous, organic look. Double-sided because the tree mesh is thin.
 * Suspends until loaded (wrap the consumer in <Suspense>).
 */
export function useNeuronAsset(): NeuronAsset {
  const gltf = useGLTF(MODEL_URL);

  return useMemo(() => {
    const scene = gltf.scene.clone(true);

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const material = src.clone();
      // Bright texture areas emit (and bloom); warm-tinted, restrained.
      material.emissiveMap = material.map;
      material.emissive = new THREE.Color('#f2d0a7');
      material.emissiveIntensity = 0.6;
      material.roughness = 0.7;
      material.metalness = 0;
      material.side = THREE.DoubleSide;
      material.toneMapped = true;
      material.needsUpdate = true;
      mesh.material = material;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
    });

    // Centre the model on the world origin so tilt + scale pivot on its middle
    // (the big soma lands squarely in the GRE·VEN gap).
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);

    return { scene };
  }, [gltf]);
}

useGLTF.preload(MODEL_URL);
