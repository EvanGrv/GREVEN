'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_A_URL = '/models/soma-a.glb';
const MODEL_B_URL = '/models/soma-b.glb';
const MODEL_C_URL = '/models/soma-c.glb';

export interface NeuronMeshAsset {
  /** Geometry centred on its own origin, with normals computed for lighting. */
  geometry: THREE.BufferGeometry;
  /** Longest half-extent of the mesh, so instances can be normalised to a
   *  target world size regardless of which variant they use. */
  radius: number;
}

export interface NeuronAssets {
  /** Round soma. */
  a: NeuronMeshAsset;
  /** Elongated ovoid soma. */
  b: NeuronMeshAsset;
  /** Gently lobed soma. */
  c: NeuronMeshAsset;
  /** Shared smoked-membrane material (rim-lit against the dark scene). */
  material: THREE.MeshStandardMaterial;
}

/** Pulls the first mesh out of a loaded GLTF, centres it, and gives it normals
 *  (the source meshes carry POSITION only) so it lights properly. Vertices are
 *  welded in the export, so the computed normals come out smooth. */
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
 * Loads the three clean single-soma heads (round / ovoid / lobed, POSITION-only
 * Meshy exports decimated to 5–11k tris) and prepares them for the composed
 * network: centred, normal-equipped geometries plus one shared membrane
 * material. Emissive nuclei and the fibres between neurons are added in
 * <Network>, not here. Suspends until loaded (wrap the consumer in <Suspense>).
 */
export function useNeuronAsset(): NeuronAssets {
  const gltfA = useGLTF(MODEL_A_URL);
  const gltfB = useGLTF(MODEL_B_URL);
  const gltfC = useGLTF(MODEL_C_URL);

  return useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      // Smoked-resin membrane: a dark warm body that melts into the backdrop;
      // the silhouette is drawn by the rim, and the slight transparency lets
      // the emissive nucleus inside breathe through like subsurface glow.
      color: new THREE.Color('#524434'),
      emissive: new THREE.Color('#2b2115'),
      emissiveIntensity: 0.45,
      roughness: 0.5,
      metalness: 0,
      transparent: true,
      opacity: 0.94,
      side: THREE.FrontSide,
      toneMapped: true,
    });

    // Fresnel rim glow: the smooth spheroids catch a warm patined-beige light
    // on their grazing edges (vNormal is view-space, so facing surfaces stay
    // dark), which reads as a translucent organic membrane, never clay.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: new THREE.Color('#b79a72') };
      shader.uniforms.uRimPower = { value: 2.6 };
      shader.uniforms.uRimStrength = { value: 0.9 };
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
      c: prepareGeometry(gltfC.scene),
      material,
    };
  }, [gltfA, gltfB, gltfC]);
}

useGLTF.preload(MODEL_A_URL);
useGLTF.preload(MODEL_B_URL);
useGLTF.preload(MODEL_C_URL);
