'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_CONFIG, countsFor } from '@/data/network.config';
import { generateNetwork } from '@/lib/network-generator';
import { createFieldNoise, cubicBezier, writeNodePosition } from '@/lib/network-motion';
import { SeededRandom } from '@/lib/prng';
import type { SectionId } from '@/data/sections';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';
import { useNeuronAsset } from '@/scenes/Neuron/useNeuronAsset';

/**
 * The neural network + its interactions.
 *
 * Neurons are instances of a real 3D neuron-tree model (glowing dendrites baked
 * into the mesh + textures). A single frame pass evaluates every node's drifting
 * position and drives the neuron instances, the connecting axons, and the
 * selection pulses from the same positions — so everything moves coherently.
 *
 * Navigation hit-testing uses a cheap math ray-sphere test (the model geometry
 * is never raycast); the canvas stays pointer-events:none so the HTML nav
 * remains fully usable. Hover/selection is mirrored through the scene store,
 * unifying the 3D neurons with the accessible HTML SideNav.
 */

const NEAR = new THREE.Color(NETWORK_CONFIG.palette.axonNear);
const FAR = new THREE.Color(NETWORK_CONFIG.palette.axonFar);
const HILITE = new THREE.Color(NETWORK_CONFIG.palette.emissive);
const MAX_PULSES = NETWORK_CONFIG.axon.maxDegree + 1;
const PULSE_SPEED = 1.15;
const NAV_HIT_RADIUS = 0.85;

interface PulseEdge {
  edge: number;
  forward: boolean;
}

interface InstanceXform {
  quaternion: THREE.Quaternion;
  scale: number;
}

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const activeSection = useSceneStore((s) => s.activeSection);

  const camera = useThree((s) => s.camera);
  const { geometry, material } = useNeuronAsset();

  const model = useMemo(() => generateNetwork(quality), [quality]);
  const counts = countsFor(quality);

  const { navIdx, neuronIdx } = useMemo(() => {
    const nav: number[] = [];
    const neuron: number[] = [];
    model.nodes.forEach((n, i) => {
      if (n.kind === 'nav') nav.push(i);
      else if (n.kind === 'neuron') neuron.push(i);
    });
    return { navIdx: nav, neuronIdx: neuron };
  }, [model]);

  const navNodeIndex = useMemo(() => {
    const map = new Map<SectionId, number>();
    navIdx.forEach((i) => {
      const sid = model.nodes[i]!.sectionId;
      if (sid) map.set(sid, i);
    });
    return map;
  }, [model, navIdx]);

  // Deterministic per-instance orientation (mostly facing camera) + base scale.
  const xforms = useMemo(() => {
    const rng = new SeededRandom('greven-neuron-xform');
    const make = (count: number, sMin: number, sMax: number): InstanceXform[] =>
      Array.from({ length: count }, () => ({
        quaternion: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            rng.range(-0.55, 0.55),
            rng.range(-0.55, 0.55),
            rng.range(0, Math.PI * 2),
          ),
        ),
        scale: rng.range(sMin, sMax),
      }));
    return {
      nav: make(navIdx.length, 0.62, 0.82),
      sec: make(neuronIdx.length, 0.26, 0.5),
    };
  }, [navIdx.length, neuronIdx.length]);

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
      ndc: new THREE.Vector2(),
    }),
    [],
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Axon vertex buffers.
  const samples = counts.axonSamples;
  const totalVerts = model.edges.length * (samples - 1) * 2;
  const axon = useMemo(
    () => ({ pos: new Float32Array(totalVerts * 3), col: new Float32Array(totalVerts * 3) }),
    [totalVerts],
  );

  const navMeshRef = useRef<THREE.InstancedMesh>(null);
  const secMeshRef = useRef<THREE.InstancedMesh>(null);
  const axonGeomRef = useRef<THREE.BufferGeometry>(null);
  const pulseRef = useRef<THREE.InstancedMesh>(null);
  const placed = useRef(false);

  const hoverFactors = useRef<Float32Array>(new Float32Array(navIdx.length));
  const lastHovered = useRef<SectionId | null>(null);
  const pulseEdges = useRef<PulseEdge[]>([]);
  const pulseStart = useRef<number | null>(null);

  // Depth-based axon colours, brightening the highlighted node's edges.
  const fillAxonColors = useCallback(
    (highlight: number | null) => {
      const col = axon.col;
      const c = new THREE.Color();
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c1 = new THREE.Vector3();
      const c2 = new THREE.Vector3();
      const cur = new THREE.Vector3();
      const zSpan = NETWORK_CONFIG.radius * NETWORK_CONFIG.depthScale;
      let v = 0;
      for (const edge of model.edges) {
        const lit = highlight !== null && (edge.a === highlight || edge.b === highlight);
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
            c.copy(FAR).lerp(NEAR, prevZ);
            if (lit) c.lerp(HILITE, 0.55);
            col[v * 3] = c.r;
            col[v * 3 + 1] = c.g;
            col[v * 3 + 2] = c.b;
            v += 1;
            c.copy(FAR).lerp(NEAR, tDepth);
            if (lit) c.lerp(HILITE, 0.55);
            col[v * 3] = c.r;
            col[v * 3 + 1] = c.g;
            col[v * 3 + 2] = c.b;
            v += 1;
          }
          prevZ = tDepth;
        }
      }
      const attr = axonGeomRef.current?.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (attr) attr.needsUpdate = true;
    },
    [model, samples, axon],
  );

  const update = useMemo(() => {
    const cfg = NETWORK_CONFIG.motion;
    return (t: number, still: boolean) => {
      const { hoveredSection: hov, activeSection: act } = useSceneStore.getState();

      // 1) Evaluate every node position once.
      for (let i = 0; i < model.nodes.length; i += 1) {
        writeNodePosition(model.nodes[i]!, t, cfg.speed, noise, positions[i]!, still);
      }

      // 2) Navigation neuron models (with hover/active emphasis).
      const nm = navMeshRef.current;
      if (nm) {
        for (let k = 0; k < navIdx.length; k += 1) {
          const node = model.nodes[navIdx[k]!]!;
          const emphasised = node.sectionId === hov || node.sectionId === act ? 1 : 0;
          const hf = hoverFactors.current;
          hf[k] = THREE.MathUtils.damp(hf[k]!, emphasised, 8, 1 / 60);
          const xf = xforms.nav[k]!;
          const breathe = still ? 1 : 1 + Math.sin(t * 0.5 + node.phase) * 0.04;
          dummy.position.copy(positions[navIdx[k]!]!);
          dummy.quaternion.copy(xf.quaternion);
          dummy.scale.setScalar(xf.scale * breathe * (1 + hf[k]! * 0.28));
          dummy.updateMatrix();
          nm.setMatrixAt(k, dummy.matrix);
        }
        nm.instanceMatrix.needsUpdate = true;
      }

      // 3) Secondary neuron models.
      const sm = secMeshRef.current;
      if (sm) {
        for (let n = 0; n < neuronIdx.length; n += 1) {
          const node = model.nodes[neuronIdx[n]!]!;
          const xf = xforms.sec[n]!;
          const breathe = still ? 1 : 1 + Math.sin(t * 0.6 + node.phase) * 0.05;
          dummy.position.copy(positions[neuronIdx[n]!]!);
          dummy.quaternion.copy(xf.quaternion);
          dummy.scale.setScalar(xf.scale * breathe);
          dummy.updateMatrix();
          sm.setMatrixAt(n, dummy.matrix);
        }
        sm.instanceMatrix.needsUpdate = true;
      }

      // 4) Axons — sampled from the same live node positions.
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
        (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }

      // 5) Selection pulses travelling along the active neuron's axons.
      const pm = pulseRef.current;
      if (pm) {
        const edges = pulseEdges.current;
        let progress = 0;
        if (act && edges.length > 0 && !still) {
          if (pulseStart.current === null) pulseStart.current = t;
          progress = (t - pulseStart.current) * PULSE_SPEED;
        }
        const { pA, pB, c1, c2, cur } = scratch;
        for (let k = 0; k < MAX_PULSES; k += 1) {
          const pe = edges[k];
          if (pe && progress > 0 && progress <= 1) {
            const edge = model.edges[pe.edge]!;
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
            const u = pe.forward ? progress : 1 - progress;
            cubicBezier(pA, c1, c2, pB, u, cur);
            dummy.position.copy(cur);
            dummy.quaternion.identity();
            dummy.scale.setScalar(0.12);
          } else {
            dummy.scale.setScalar(0);
          }
          dummy.updateMatrix();
          pm.setMatrixAt(k, dummy.matrix);
        }
        pm.instanceMatrix.needsUpdate = true;
      }
    };
  }, [model, noise, positions, dummy, scratch, axon, xforms, navIdx, neuronIdx, samples]);

  useLayoutEffect(() => {
    update(0, reducedMotion);
    fillAxonColors(null);
    placed.current = true;
  }, [update, fillAxonColors, reducedMotion]);

  useEffect(() => {
    const activeNav = activeSection ? (navNodeIndex.get(activeSection) ?? null) : null;
    const hoverNav = hoveredSection ? (navNodeIndex.get(hoveredSection) ?? null) : null;
    fillAxonColors(activeNav ?? hoverNav);

    pulseStart.current = null;
    if (activeNav !== null) {
      const edges: PulseEdge[] = [];
      model.edges.forEach((e, i) => {
        if (e.a === activeNav) edges.push({ edge: i, forward: true });
        else if (e.b === activeNav) edges.push({ edge: i, forward: false });
      });
      pulseEdges.current = edges.slice(0, MAX_PULSES);
    } else {
      pulseEdges.current = [];
    }
  }, [activeSection, hoveredSection, navNodeIndex, model, fillAxonColors]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = hoveredSection ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoveredSection]);

  const selectNeuron = useCallback(
    (id: SectionId) => {
      const idx = navNodeIndex.get(id);
      if (idx === undefined) return;
      setActiveSection(id);
      const p = positions[idx]!;
      requestTravel(id, [p.x, p.y, p.z]);
    },
    [navNodeIndex, positions, setActiveSection, requestTravel],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onClick = () => {
      const id = lastHovered.current;
      if (id) selectNeuron(id);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [selectNeuron]);

  useFrame((state) => {
    // Nav hover via cheap math ray-sphere test (model geometry is never raycast).
    const { pointer } = useSceneStore.getState();
    scratch.ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(scratch.ndc, camera);
    let hoveredId: SectionId | null = null;
    let bestDist = Infinity;
    for (let k = 0; k < navIdx.length; k += 1) {
      const center = positions[navIdx[k]!]!;
      if (raycaster.ray.distanceToPoint(center) < NAV_HIT_RADIUS) {
        const along = camera.position.distanceToSquared(center);
        if (along < bestDist) {
          bestDist = along;
          hoveredId = model.nodes[navIdx[k]!]!.sectionId ?? null;
        }
      }
    }
    if (hoveredId !== lastHovered.current) {
      lastHovered.current = hoveredId;
      setHoveredSection(hoveredId);
    }

    if (reducedMotion && placed.current && !activeSection) return;
    update(state.clock.elapsedTime, reducedMotion);
    placed.current = true;
  });

  return (
    <group>
      {/* Navigation neuron models. */}
      <instancedMesh
        ref={navMeshRef}
        args={[geometry, material, navIdx.length]}
        frustumCulled={false}
      />

      {/* Secondary neuron models. */}
      {neuronIdx.length > 0 && (
        <instancedMesh
          ref={secMeshRef}
          args={[geometry, material, neuronIdx.length]}
          frustumCulled={false}
        />
      )}

      {/* Selection pulses. */}
      <instancedMesh ref={pulseRef} args={[undefined, undefined, MAX_PULSES]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={NETWORK_CONFIG.palette.emissive}
          emissive={NETWORK_CONFIG.palette.emissive}
          emissiveIntensity={2.4}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
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
          opacity={0.4}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </lineSegments>
    </group>
  );
}
