'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/neuron.glb';

export interface NeuronAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

/**
 * Loads the neuron tree model once and prepares an instanceable
 * geometry + material. The base-colour texture doubles as the emissive map so
 * the bright filaments glow (and bloom) warmly, while dark areas stay matte —
 * the reference's luminous, organic look. Double-sided because the tree mesh is
 * thin. Suspends until loaded (wrap the consumer in <Suspense>).
 */
export function useNeuronAsset(): NeuronAsset {
  const gltf = useGLTF(MODEL_URL);

  return useMemo(() => {
    let geometry: THREE.BufferGeometry | null = null;
    let source: THREE.MeshStandardMaterial | null = null;
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        geometry = mesh.geometry as THREE.BufferGeometry;
        source = mesh.material as THREE.MeshStandardMaterial;
      }
    });

    const material = source
      ? (source as THREE.MeshStandardMaterial).clone()
      : new THREE.MeshStandardMaterial();
    // Bright texture areas emit (and bloom); warm-tinted, restrained.
    material.emissiveMap = material.map;
    material.emissive = new THREE.Color('#f2d0a7');
    material.emissiveIntensity = 0.55;
    material.roughness = 0.7;
    material.metalness = 0;
    material.side = THREE.DoubleSide;
    material.toneMapped = true;
    material.needsUpdate = true;

    return { geometry: geometry ?? new THREE.BufferGeometry(), material };
  }, [gltf]);
}

useGLTF.preload(MODEL_URL);
