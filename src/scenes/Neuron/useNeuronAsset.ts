'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_A_URL = '/models/neuron-a.glb';
const MODEL_B_URL = '/models/neuron-b.glb';

export interface NeuronMeshAsset {
  /** Geometry centred on its own origin, with normals computed for lighting. */
  geometry: THREE.BufferGeometry;
  /** Longest half-extent of the mesh, so instances can be normalised to a
   *  target world size regardless of which variant they use. */
  radius: number;
}

export interface NeuronAssets {
  a: NeuronMeshAsset;
  b: NeuronMeshAsset;
  /** Shared warm-matte dendrite material (rim-lit against the dark scene). */
  material: THREE.MeshStandardMaterial;
}

/** Pulls the first mesh out of a loaded GLTF, centres it, and gives it normals
 *  (the source meshes carry POSITION only) so it lights properly. */
function prepareGeometry(scene: THREE.Object3D): NeuronMeshAsset {
  let geometry: THREE.BufferGeometry | null = null;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && !geometry) geometry = mesh.geometry as THREE.BufferGeometry;
  });

  const geo = (geometry ?? new THREE.BufferGeometry()).clone();
  geo.center();
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const radius = geo.boundingSphere?.radius ?? 1;

  return { geometry: geo, radius };
}

/**
 * Loads the two bare neuron meshes (dendrite trees, POSITION-only) the user
 * supplied and prepares them for a hand-composed network: centred, normal-
 * equipped geometries plus one shared warm-matte material. Cores/somas and the
 * connections between neurons are added in <Network>, not here. Suspends until
 * loaded (wrap the consumer in <Suspense>).
 */
export function useNeuronAsset(): NeuronAssets {
  const gltfA = useGLTF(MODEL_A_URL);
  const gltfB = useGLTF(MODEL_B_URL);

  return useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7d6647'),
      // A restrained warm self-glow keeps the filaments visible in the dark
      // without turning them into neon; the bright cores + bloom do the drama.
      emissive: new THREE.Color('#48341f'),
      emissiveIntensity: 0.65,
      roughness: 0.8,
      metalness: 0.15,
      side: THREE.DoubleSide,
      toneMapped: true,
    });

    // Fresnel rim glow: silhouettes and the thin dendrite processes catch a warm
    // light, so the solid blob sculpt reads as a luminous neuron (as in the
    // reference) instead of a matte rock. vNormal is view-space, so facing
    // surfaces stay dark and grazing edges glow.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: new THREE.Color('#f3ce9a') };
      shader.uniforms.uRimPower = { value: 2.1 };
      shader.uniforms.uRimStrength = { value: 1.35 };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
{
  float rim = pow(1.0 - abs(normalize(vNormal).z), uRimPower);
  gl_FragColor.rgb += uRimColor * rim * uRimStrength;
}`,
        );
    };

    return {
      a: prepareGeometry(gltfA.scene),
      b: prepareGeometry(gltfB.scene),
      material,
    };
  }, [gltfA, gltfB]);
}

useGLTF.preload(MODEL_A_URL);
useGLTF.preload(MODEL_B_URL);
