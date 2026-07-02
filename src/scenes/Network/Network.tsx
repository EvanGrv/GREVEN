'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_CONFIG } from '@/data/network.config';
import { NEURON_SECTIONS, type SectionId } from '@/data/sections';
import { SeededRandom } from '@/lib/prng';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';
import { useNeuronAsset, type NeuronMeshAsset } from '@/scenes/Neuron/useNeuronAsset';

/**
 * The neural network, hand-composed from two bare neuron meshes the user
 * supplied (dendrite trees, no cores, no connections). We mix both variants —
 * a large central neuron in the GRE·VEN gap plus secondary neurons around it and
 * a few deeper decorative ones — each rotated/scaled for real perspective. On
 * top of the meshes we add the glowing soma **cores** (emissive spheres → bloom)
 * and the **connections** (procedural warm axon tubes from the core outward),
 * giving the lifeless meshes life and matching the reference render.
 *
 * Every neuron keeps a fixed world position, so the five clickable secondary
 * neurons hit-test exactly (cheap ray-sphere on their cores; the geometry is
 * never raycast) and stay in sync with the CameraRig focus / NeuralTravel /
 * ScrollExploration, which all read NETWORK_CONFIG.navPositions. Life comes from
 * core breathing, gentle per-neuron wobble and the camera parallax — never from
 * moving the neurons, so hover stays accurate. The canvas is pointer-events:none;
 * hover/selection is mirrored through the scene store to unify the 3D neurons
 * with the accessible HTML SideNav.
 */

/** Target world radius of each neuron kind (geometry is scaled to match). */
const CENTER_TARGET_R = 2.5;
const NAV_TARGET_R = 1.05;
const DECO_TARGET_R = 0.8;
const NAV_HIT_RADIUS = 0.85;
const PULSE_DURATION = 0.85;

/** Deeper, non-interactive neuron masses that add parallax depth and frame the
 *  core (kept behind the plane so the DoF softens them, as in the reference). */
const DECO_POSITIONS: [number, number, number][] = [
  [-3.2, 1.5, -1.6],
  [3.3, -1.4, -1.8],
  [-0.4, -2.6, -2.0],
];

const EMISSIVE = NETWORK_CONFIG.palette.emissive;

type Variant = 'a' | 'b';

interface Placement {
  key: string;
  sectionId?: SectionId;
  position: THREE.Vector3;
  variant: Variant;
  /** Base orientation of the dendrite mesh. */
  rotation: THREE.Euler;
  /** World scale applied to the (unit-ish) geometry. */
  meshScale: number;
  coreRadius: number;
  coreIntensity: number;
  wobble: number;
  connect: boolean;
  /** Whether the dendrite mesh renders (nav nodes are core+thread only). */
  showMesh: boolean;
}

/** Organic warm filament (axon or dendrite) from the central core outward. */
function buildTube(end: THREE.Vector3, rng: SeededRandom, radius = 0.018): THREE.TubeGeometry {
  const start = new THREE.Vector3(0, 0, 0);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const perp = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.4);
  if (perp.lengthSq() < 1e-4) perp.set(0, 1, 0);
  perp.normalize();
  const amp = len * 0.14;
  const c1 = start
    .clone()
    .addScaledVector(dir, 0.34)
    .addScaledVector(perp, amp * rng.range(-1, 1));
  const c2 = start
    .clone()
    .addScaledVector(dir, 0.68)
    .addScaledVector(perp, amp * rng.range(-1, 1));
  const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);
  return new THREE.TubeGeometry(curve, 26, radius, 6, false);
}

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);

  const camera = useThree((s) => s.camera);
  const { a, b, material } = useNeuronAsset();

  const coreSegments = quality === 'low' ? 12 : 20;
  const geoOf = useCallback((v: Variant): NeuronMeshAsset => (v === 'a' ? a : b), [a, b]);

  // Deterministic composition: central + 5 nav + decorative, mixing variants.
  const placements = useMemo<Placement[]>(() => {
    const rng = new SeededRandom(`${NETWORK_CONFIG.seed}-compose`);
    const out: Placement[] = [];

    const scaleFor = (v: Variant, targetR: number) => targetR / geoOf(v).radius;
    const randRot = () =>
      new THREE.Euler(rng.range(-0.5, 0.5), rng.range(-Math.PI, Math.PI), rng.range(-0.4, 0.4));

    // Central neuron mass — variant A cluster, the detailed core of the frame.
    out.push({
      key: 'center',
      position: new THREE.Vector3(0, 0, 0),
      variant: 'a',
      rotation: new THREE.Euler(-0.16, 0.22, 0.05),
      meshScale: scaleFor('a', CENTER_TARGET_R),
      coreRadius: 0.28,
      coreIntensity: 2.4,
      wobble: 0.02,
      connect: false,
      showMesh: true,
    });

    // Five clickable secondary neurons: glowing cores on axon threads (no mesh,
    // so the frame stays clean and the nodes read like the reference).
    NEURON_SECTIONS.forEach((section, i) => {
      out.push({
        key: `nav-${section.id}`,
        sectionId: section.id,
        position: new THREE.Vector3(...NETWORK_CONFIG.navPositions[i]!),
        variant: 'a',
        rotation: randRot(),
        meshScale: scaleFor('a', NAV_TARGET_R),
        coreRadius: 0.15,
        coreIntensity: 1.7,
        wobble: 0.05,
        connect: true,
        showMesh: false,
      });
    });

    // A few deeper decorative neuron masses for parallax + depth-of-field.
    DECO_POSITIONS.forEach((p, i) => {
      const v: Variant = i % 2 === 0 ? 'b' : 'a';
      out.push({
        key: `deco-${i}`,
        position: new THREE.Vector3(...p),
        variant: v,
        rotation: randRot(),
        meshScale: scaleFor(v, DECO_TARGET_R),
        coreRadius: 0.09,
        coreIntensity: 0.8,
        wobble: 0.06,
        connect: true,
        showMesh: true,
      });
    });

    return out;
  }, [geoOf]);

  // Procedural connection tubes (central core → each connecting neuron) plus
  // free-ending dendrite tendrils that give the core its radiating starburst.
  const tubes = useMemo(() => {
    const rng = new SeededRandom(`${NETWORK_CONFIG.seed}-axons`);
    const list = placements
      .filter((p) => p.connect)
      .map((p) => ({
        key: p.key,
        geometry: buildTube(p.position, rng),
        dendrite: false,
      }));

    const DENDRITES = 9;
    for (let i = 0; i < DENDRITES; i += 1) {
      const angle = (i / DENDRITES) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const len = rng.range(1.0, 2.0);
      const end = new THREE.Vector3(
        Math.cos(angle) * len,
        Math.sin(angle) * len,
        rng.range(-0.5, 0.5),
      );
      list.push({ key: `dend-${i}`, geometry: buildTube(end, rng, 0.006), dendrite: true });
    }

    return list;
  }, [placements]);

  useEffect(() => {
    // Tube geometries are generated; release them when recomposed.
    return () => tubes.forEach((t) => t.geometry.dispose());
  }, [tubes]);

  const navBySectionId = useMemo(() => {
    const map = new Map<SectionId, THREE.Vector3>();
    placements.forEach((p) => {
      if (p.sectionId) map.set(p.sectionId, p.position);
    });
    return map;
  }, [placements]);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const coreRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pulseRef = useRef<THREE.Mesh>(null);
  const emphasis = useRef<Float32Array>(new Float32Array(placements.length));
  const lastHovered = useRef<SectionId | null>(null);
  const pulseStart = useRef<number | null>(null);
  const pulseTarget = useRef<THREE.Vector3 | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const scratch = useMemo(
    () => ({ ndc: new THREE.Vector2(), cur: new THREE.Vector3(), origin: new THREE.Vector3() }),
    [],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = hoveredSection ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoveredSection]);

  const selectNeuron = useCallback(
    (id: SectionId) => {
      const p = navBySectionId.get(id);
      if (!p) return;
      setActiveSection(id);
      requestTravel(id, [p.x, p.y, p.z]);
    },
    [navBySectionId, setActiveSection, requestTravel],
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

  const activeSection = useSceneStore((s) => s.activeSection);
  useEffect(() => {
    pulseStart.current = null;
    pulseTarget.current = activeSection ? (navBySectionId.get(activeSection) ?? null) : null;
  }, [activeSection, navBySectionId]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { pointer, hoveredSection: hov, activeSection: act } = useSceneStore.getState();

    // 1) Hover hit-test on the five nav cores (cheap ray-sphere).
    scratch.ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(scratch.ndc, camera);
    let hoveredId: SectionId | null = null;
    let best = Infinity;
    for (let i = 0; i < placements.length; i += 1) {
      const p = placements[i]!;
      if (!p.sectionId) continue;
      if (raycaster.ray.distanceToPoint(p.position) < NAV_HIT_RADIUS) {
        const d = camera.position.distanceToSquared(p.position);
        if (d < best) {
          best = d;
          hoveredId = p.sectionId;
        }
      }
    }
    if (hoveredId !== lastHovered.current) {
      lastHovered.current = hoveredId;
      setHoveredSection(hoveredId);
    }

    // 2) Per-neuron wobble + core breathing / hover emphasis.
    for (let i = 0; i < placements.length; i += 1) {
      const p = placements[i]!;
      const grp = groupRefs.current[i];
      if (grp && !reducedMotion) {
        grp.rotation.x = Math.sin(t * 0.3 + i) * p.wobble;
        grp.rotation.y = Math.cos(t * 0.24 + i * 1.7) * p.wobble;
      }
      const core = coreRefs.current[i];
      if (core) {
        const emph = p.sectionId && (p.sectionId === hov || p.sectionId === act) ? 1 : 0;
        const e = emphasis.current;
        e[i] = THREE.MathUtils.damp(e[i]!, emph, 8, 1 / 60);
        const breathe = reducedMotion ? 1 : 1 + Math.sin(t * 0.7 + i) * 0.06;
        core.scale.setScalar(p.coreRadius * (1 + e[i]! * 0.7) * breathe);
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
          p.coreIntensity + e[i]! * 2.4;
      }
    }

    // 3) Core → selected neuron pulse.
    const pulse = pulseRef.current;
    if (pulse) {
      const target = pulseTarget.current;
      if (target && act && !reducedMotion) {
        if (pulseStart.current === null) pulseStart.current = t;
        const progress = (t - pulseStart.current) / PULSE_DURATION;
        if (progress >= 0 && progress <= 1) {
          scratch.cur.copy(scratch.origin).lerp(target, progress);
          pulse.position.copy(scratch.cur);
          pulse.scale.setScalar(0.13 * (1 - progress * 0.4));
          pulse.visible = true;
        } else {
          pulse.visible = false;
        }
      } else {
        pulse.visible = false;
      }
    }
  });

  return (
    <group>
      {/* Connections + dendrite tendrils — procedural warm filaments. */}
      {tubes.map((tube) => (
        <mesh key={`tube-${tube.key}`} geometry={tube.geometry} frustumCulled={false}>
          <meshStandardMaterial
            color="#8a7250"
            emissive="#5a4326"
            emissiveIntensity={tube.dendrite ? 0.55 : 0.7}
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={tube.dendrite ? 0.6 : 0.85}
            toneMapped
          />
        </mesh>
      ))}

      {/* Neurons — dendrite mesh + its glowing soma core. */}
      {placements.map((p, i) => (
        <group
          key={p.key}
          position={p.position}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          {p.showMesh && (
            <mesh
              geometry={geoOf(p.variant).geometry}
              material={material}
              rotation={p.rotation}
              scale={p.meshScale}
              frustumCulled={false}
            />
          )}
          <mesh
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
            scale={p.coreRadius}
          >
            <sphereGeometry args={[1, coreSegments, coreSegments]} />
            <meshStandardMaterial
              color={NETWORK_CONFIG.palette.navNeuron}
              emissive={EMISSIVE}
              emissiveIntensity={p.coreIntensity}
              roughness={0.35}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Core → neuron selection pulse. */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={EMISSIVE}
          emissive={EMISSIVE}
          emissiveIntensity={2.6}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
