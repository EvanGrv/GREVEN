'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_CONFIG, countsFor } from '@/data/network.config';
import { generateNetwork } from '@/lib/network-generator';
import { createFieldNoise, cubicBezier, writeNodePosition } from '@/lib/network-motion';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';

/**
 * The organic neural network.
 * A single frame pass evaluates every node's drifting position, then feeds
 * both the node meshes (instanced neurons + synapses, plus the 5 navigation
 * neurons) and the axons from the same positions — so branches always follow
 * the neurons they connect. Deterministic, depth-aware, quality-scaled.
 */

const NEAR = new THREE.Color(NETWORK_CONFIG.palette.axonNear);
const FAR = new THREE.Color(NETWORK_CONFIG.palette.axonFar);

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const model = useMemo(() => generateNetwork(quality), [quality]);
  const counts = countsFor(quality);
  const detail = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;

  // Index lists per kind (nav neurons are always the first nodes).
  const { navIdx, neuronIdx, synapseIdx } = useMemo(() => {
    const nav: number[] = [];
    const neuron: number[] = [];
    const synapse: number[] = [];
    model.nodes.forEach((n, i) => {
      if (n.kind === 'nav') nav.push(i);
      else if (n.kind === 'neuron') neuron.push(i);
      else synapse.push(i);
    });
    return { navIdx: nav, neuronIdx: neuron, synapseIdx: synapse };
  }, [model]);

  // Pre-allocated scratch — no per-frame allocation.
  const positions = useMemo(() => model.nodes.map(() => new THREE.Vector3()), [model]);
  const noise = useMemo(() => createFieldNoise(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(
    () => ({
      pA: new THREE.Vector3(),
      pB: new THREE.Vector3(),
      c1: new THREE.Vector3(),
      c2: new THREE.Vector3(),
      cur: new THREE.Vector3(),
      prev: new THREE.Vector3(),
    }),
    [],
  );

  // Axon vertex buffers.
  const samples = counts.axonSamples;
  const segsPerEdge = samples - 1;
  const vertsPerEdge = segsPerEdge * 2;
  const totalVerts = model.edges.length * vertsPerEdge;

  const axon = useMemo(() => {
    const pos = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);
    // Static depth-based colours computed once from rest positions, laid out in
    // the same (prev, cur) segment order the per-frame position loop uses.
    const c = new THREE.Color();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c1 = new THREE.Vector3();
    const c2 = new THREE.Vector3();
    const cur = new THREE.Vector3();
    const zSpan = NETWORK_CONFIG.radius * NETWORK_CONFIG.depthScale;
    let v = 0;
    for (const edge of model.edges) {
      a.fromArray(model.nodes[edge.a]!.base);
      b.fromArray(model.nodes[edge.b]!.base);
      c1.set(
        a.x + (b.x - a.x) / 3 + edge.c1[0],
        a.y + (b.y - a.y) / 3 + edge.c1[1],
        a.z + (b.z - a.z) / 3 + edge.c1[2],
      );
      c2.set(
        a.x + ((b.x - a.x) * 2) / 3 + edge.c2[0],
        a.y + ((b.y - a.y) * 2) / 3 + edge.c2[1],
        a.z + ((b.z - a.z) * 2) / 3 + edge.c2[2],
      );
      let prevZ = 0;
      for (let s = 0; s < samples; s += 1) {
        cubicBezier(a, c1, c2, b, s / (samples - 1), cur);
        const tDepth = THREE.MathUtils.clamp((cur.z / zSpan) * 0.5 + 0.5, 0, 1);
        if (s > 0) {
          // prev vertex
          c.copy(FAR).lerp(NEAR, prevZ);
          col[v * 3] = c.r;
          col[v * 3 + 1] = c.g;
          col[v * 3 + 2] = c.b;
          v += 1;
          // cur vertex
          c.copy(FAR).lerp(NEAR, tDepth);
          col[v * 3] = c.r;
          col[v * 3 + 1] = c.g;
          col[v * 3 + 2] = c.b;
          v += 1;
        }
        prevZ = tDepth;
      }
    }
    return { pos, col };
  }, [model, samples, totalVerts]);

  const neuronsRef = useRef<THREE.InstancedMesh>(null);
  const synapsesRef = useRef<THREE.InstancedMesh>(null);
  const navRefs = useRef<(THREE.Mesh | null)[]>([]);
  const axonGeomRef = useRef<THREE.BufferGeometry>(null);
  const placed = useRef(false);

  const update = useMemo(() => {
    const cfg = NETWORK_CONFIG.motion;
    return (t: number, still: boolean) => {
      // 1) Evaluate every node position once.
      for (let i = 0; i < model.nodes.length; i += 1) {
        writeNodePosition(model.nodes[i]!, t, cfg.speed, noise, positions[i]!, still);
      }

      // 2) Navigation neurons (individual meshes).
      for (let k = 0; k < navIdx.length; k += 1) {
        const node = model.nodes[navIdx[k]!]!;
        const mesh = navRefs.current[k];
        if (!mesh) continue;
        mesh.position.copy(positions[navIdx[k]!]!);
        const breathe = still ? 1 : 1 + Math.sin(t * 0.5 + node.phase) * cfg.breathe;
        mesh.scale.setScalar(node.radius * breathe);
      }

      // 3) Secondary neurons (instanced).
      const nm = neuronsRef.current;
      if (nm) {
        for (let n = 0; n < neuronIdx.length; n += 1) {
          const node = model.nodes[neuronIdx[n]!]!;
          dummy.position.copy(positions[neuronIdx[n]!]!);
          const breathe = still ? 1 : 1 + Math.sin(t * 0.6 + node.phase) * cfg.breathe;
          dummy.scale.setScalar(node.radius * breathe);
          dummy.updateMatrix();
          nm.setMatrixAt(n, dummy.matrix);
        }
        nm.instanceMatrix.needsUpdate = true;
      }

      // 4) Synapses (instanced, subtle).
      const sm = synapsesRef.current;
      if (sm) {
        for (let n = 0; n < synapseIdx.length; n += 1) {
          const node = model.nodes[synapseIdx[n]!]!;
          dummy.position.copy(positions[synapseIdx[n]!]!);
          dummy.scale.setScalar(node.radius);
          dummy.updateMatrix();
          sm.setMatrixAt(n, dummy.matrix);
        }
        sm.instanceMatrix.needsUpdate = true;
      }

      // 5) Axons — sampled from the same live node positions.
      const geom = axonGeomRef.current;
      if (geom) {
        const { pA, pB, c1, c2, cur, prev } = scratch;
        const arr = axon.pos;
        let v = 0;
        for (const edge of model.edges) {
          pA.copy(positions[edge.a]!);
          pB.copy(positions[edge.b]!);
          c1.set(
            pA.x + (pB.x - pA.x) / 3 + edge.c1[0],
            pA.y + (pB.y - pA.y) / 3 + edge.c1[1],
            pA.z + (pB.z - pA.z) / 3 + edge.c1[2],
          );
          c2.set(
            pA.x + ((pB.x - pA.x) * 2) / 3 + edge.c2[0],
            pA.y + ((pB.y - pA.y) * 2) / 3 + edge.c2[1],
            pA.z + ((pB.z - pA.z) * 2) / 3 + edge.c2[2],
          );
          for (let s = 0; s < samples; s += 1) {
            cubicBezier(pA, c1, c2, pB, s / (samples - 1), cur);
            if (s > 0) {
              arr[v * 3] = prev.x;
              arr[v * 3 + 1] = prev.y;
              arr[v * 3 + 2] = prev.z;
              v += 1;
              arr[v * 3] = cur.x;
              arr[v * 3 + 1] = cur.y;
              arr[v * 3 + 2] = cur.z;
              v += 1;
            }
            prev.copy(cur);
          }
        }
        const attr = geom.getAttribute('position') as THREE.BufferAttribute;
        attr.needsUpdate = true;
      }
    };
  }, [model, noise, positions, dummy, scratch, axon, navIdx, neuronIdx, synapseIdx, samples]);

  // Place everything before first paint to avoid a flash at the origin.
  useLayoutEffect(() => {
    update(0, reducedMotion);
    placed.current = true;
  }, [update, reducedMotion]);

  useFrame((state) => {
    if (reducedMotion && placed.current) return;
    update(state.clock.elapsedTime, reducedMotion);
    placed.current = true;
  });

  return (
    <group>
      {/* Navigation neurons — individually addressable for interaction (Step 7). */}
      {navIdx.map((i, k) => (
        <mesh
          key={model.nodes[i]!.sectionId ?? k}
          ref={(el) => {
            navRefs.current[k] = el;
          }}
        >
          <icosahedronGeometry args={[1, detail]} />
          <meshStandardMaterial
            color={NETWORK_CONFIG.palette.navNeuron}
            emissive={NETWORK_CONFIG.palette.emissive}
            emissiveIntensity={0.32}
            roughness={0.62}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Secondary neurons. */}
      <instancedMesh ref={neuronsRef} args={[undefined, undefined, neuronIdx.length]}>
        <icosahedronGeometry args={[1, detail]} />
        <meshStandardMaterial
          color={NETWORK_CONFIG.palette.neuron}
          emissive={NETWORK_CONFIG.palette.emissive}
          emissiveIntensity={0.16}
          roughness={0.82}
          metalness={0}
        />
      </instancedMesh>

      {/* Synapses. */}
      <instancedMesh ref={synapsesRef} args={[undefined, undefined, synapseIdx.length]}>
        <icosahedronGeometry args={[1, Math.max(1, detail - 1)]} />
        <meshStandardMaterial
          color={NETWORK_CONFIG.palette.synapse}
          emissive={NETWORK_CONFIG.palette.emissive}
          emissiveIntensity={0.1}
          roughness={0.9}
          metalness={0}
        />
      </instancedMesh>

      {/* Axons. */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={axonGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[axon.pos, 3]}
            count={totalVerts}
            usage={THREE.DynamicDrawUsage}
          />
          <bufferAttribute attach="attributes-color" args={[axon.col, 3]} count={totalVerts} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </lineSegments>
    </group>
  );
}
