'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_CONFIG, countsFor } from '@/data/network.config';
import { generateNetwork } from '@/lib/network-generator';
import { createFieldNoise, cubicBezier, writeNodePosition } from '@/lib/network-motion';
import type { SectionId } from '@/data/sections';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';

/**
 * The organic neural network + its interactions.
 * A single frame pass evaluates every node's drifting position, then feeds the
 * node meshes (instanced neurons + synapses, plus the 5 navigation neurons),
 * the axons, and the selection pulses from the same positions — so branches
 * always follow the neurons they connect.
 *
 * Interaction is driven by manual raycasting against the 5 navigation neurons
 * (the canvas stays pointer-events:none so the HTML nav remains fully usable).
 * Hover/selection is mirrored through the scene store, unifying the 3D neurons
 * with the accessible HTML SideNav.
 */

const NEAR = new THREE.Color(NETWORK_CONFIG.palette.axonNear);
const FAR = new THREE.Color(NETWORK_CONFIG.palette.axonFar);
const HILITE = new THREE.Color(NETWORK_CONFIG.palette.emissive);
const MAX_PULSES = NETWORK_CONFIG.axon.maxDegree + 1;
const PULSE_SPEED = 1.15; // progress units per second

interface PulseEdge {
  edge: number;
  forward: boolean;
}

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const activeSection = useSceneStore((s) => s.activeSection);

  const camera = useThree((s) => s.camera);

  const model = useMemo(() => generateNetwork(quality), [quality]);
  const counts = countsFor(quality);
  const detail = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;

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

  // sectionId → node index (for hover/selection highlight + pulses).
  const navNodeIndex = useMemo(() => {
    const map = new Map<SectionId, number>();
    navIdx.forEach((i) => {
      const sid = model.nodes[i]!.sectionId;
      if (sid) map.set(sid, i);
    });
    return map;
  }, [model, navIdx]);

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

  // Dendrite vertex buffers (2 verts per segment). Colours are static (depth +
  // brightness fade toward the tips); positions follow the parent neuron.
  const dendriteCount = model.dendrites.length;
  const dendrite = useMemo(() => {
    const pos = new Float32Array(dendriteCount * 2 * 3);
    const col = new Float32Array(dendriteCount * 2 * 3);
    const base = new THREE.Color(NETWORK_CONFIG.palette.axonNear);
    const warm = new THREE.Color(NETWORK_CONFIG.palette.emissive);
    const c = new THREE.Color();
    model.dendrites.forEach((d, i) => {
      c.copy(FAR)
        .lerp(base, d.ba)
        .lerp(warm, d.ba * 0.25);
      col[i * 6] = c.r;
      col[i * 6 + 1] = c.g;
      col[i * 6 + 2] = c.b;
      c.copy(FAR)
        .lerp(base, d.bb)
        .lerp(warm, d.bb * 0.25);
      col[i * 6 + 3] = c.r;
      col[i * 6 + 4] = c.g;
      col[i * 6 + 5] = c.b;
    });
    return { pos, col };
  }, [model, dendriteCount]);

  const neuronsRef = useRef<THREE.InstancedMesh>(null);
  const synapsesRef = useRef<THREE.InstancedMesh>(null);
  const navRefs = useRef<(THREE.Mesh | null)[]>([]);
  const axonGeomRef = useRef<THREE.BufferGeometry>(null);
  const dendriteGeomRef = useRef<THREE.BufferGeometry>(null);
  const pulseRef = useRef<THREE.InstancedMesh>(null);
  const placed = useRef(false);

  // Interaction / animation state (refs — no re-render churn).
  const hoverFactors = useRef<Float32Array>(new Float32Array(navIdx.length));
  const lastHovered = useRef<SectionId | null>(null);
  const pulseEdges = useRef<PulseEdge[]>([]);
  const pulseStart = useRef<number | null>(null);

  // Write depth-based axon colours, brightening the highlighted node's edges.
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
      const geom = axonGeomRef.current;
      const attr = geom?.getAttribute('color') as THREE.BufferAttribute | undefined;
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

      // 2) Navigation neurons (individual meshes), with hover/active emphasis.
      for (let k = 0; k < navIdx.length; k += 1) {
        const node = model.nodes[navIdx[k]!]!;
        const mesh = navRefs.current[k];
        if (!mesh) continue;
        const emphasised = node.sectionId === hov || node.sectionId === act ? 1 : 0;
        const hf = hoverFactors.current;
        hf[k] = THREE.MathUtils.damp(hf[k]!, emphasised, 8, 1 / 60);
        mesh.position.copy(positions[navIdx[k]!]!);
        const breathe = still ? 1 : 1 + Math.sin(t * 0.5 + node.phase) * cfg.breathe;
        mesh.scale.setScalar(node.radius * breathe * (1 + hf[k]! * 0.38));
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.55 + hf[k]! * 0.7;
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
        (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }

      // 5b) Dendrites — local filaments translated with their parent neuron.
      const dg = dendriteGeomRef.current;
      if (dg) {
        const arr = dendrite.pos;
        const dends = model.dendrites;
        for (let i = 0; i < dends.length; i += 1) {
          const d = dends[i]!;
          const p = positions[d.node]!;
          arr[i * 6] = p.x + d.a[0];
          arr[i * 6 + 1] = p.y + d.a[1];
          arr[i * 6 + 2] = p.z + d.a[2];
          arr[i * 6 + 3] = p.x + d.b[0];
          arr[i * 6 + 4] = p.y + d.b[1];
          arr[i * 6 + 5] = p.z + d.b[2];
        }
        (dg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }

      // 6) Selection pulses travelling along the active neuron's axons.
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
  }, [
    model,
    noise,
    positions,
    dummy,
    scratch,
    axon,
    dendrite,
    navIdx,
    neuronIdx,
    synapseIdx,
    samples,
  ]);

  // Initial placement + colours before first paint.
  useLayoutEffect(() => {
    update(0, reducedMotion);
    fillAxonColors(null);
    placed.current = true;
  }, [update, fillAxonColors, reducedMotion]);

  // Recompute axon highlight + pulse targets when hover/selection changes.
  useEffect(() => {
    const activeNav = activeSection ? (navNodeIndex.get(activeSection) ?? null) : null;
    const hoverNav = hoveredSection ? (navNodeIndex.get(hoveredSection) ?? null) : null;
    fillAxonColors(activeNav ?? hoverNav);

    // Rebuild pulse edges for the newly selected neuron.
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

  // Pointer cursor while hovering a neuron.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = hoveredSection ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoveredSection]);

  // Select a neuron → highlight it and request the cinematic travel, using the
  // neuron's current world position (the NeuralTravel controller does the rest).
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

  // Click on a hovered neuron → select + travel.
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
    // Raycast the 5 nav neurons for hover (canvas is pointer-events:none).
    const { pointer } = useSceneStore.getState();
    scratch.ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(scratch.ndc, camera);
    const meshes = navRefs.current.filter((m): m is THREE.Mesh => m !== null);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    const hoveredId = (hit?.object.userData.sectionId as SectionId | undefined) ?? null;
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
      {/* Navigation neurons — individually addressable + raycast targets. */}
      {navIdx.map((i, k) => (
        <mesh
          key={model.nodes[i]!.sectionId ?? k}
          ref={(el) => {
            navRefs.current[k] = el;
          }}
          userData={{ sectionId: model.nodes[i]!.sectionId }}
        >
          <icosahedronGeometry args={[1, detail]} />
          <meshStandardMaterial
            color={NETWORK_CONFIG.palette.navNeuron}
            emissive={NETWORK_CONFIG.palette.emissive}
            emissiveIntensity={0.55}
            roughness={0.55}
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
          emissiveIntensity={0.24}
          roughness={0.78}
          metalness={0}
        />
      </instancedMesh>

      {/* Synapses. */}
      <instancedMesh ref={synapsesRef} args={[undefined, undefined, synapseIdx.length]}>
        <icosahedronGeometry args={[1, Math.max(1, detail - 1)]} />
        <meshStandardMaterial
          color={NETWORK_CONFIG.palette.synapse}
          emissive={NETWORK_CONFIG.palette.emissive}
          emissiveIntensity={0.16}
          roughness={0.88}
          metalness={0}
        />
      </instancedMesh>

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

      {/* Dendrites — fine radiating filaments (the organic neuron silhouette). */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={dendriteGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[dendrite.pos, 3]}
            count={dendriteCount * 2}
            usage={THREE.DynamicDrawUsage}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[dendrite.col, 3]}
            count={dendriteCount * 2}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </lineSegments>

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
