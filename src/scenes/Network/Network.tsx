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
 * The neural network, hand-composed from three clean single-soma heads the
 * user supplied (round / ovoid / lobed spheroids). Every neuron = a membrane
 * soma mesh + an emissive **nucleus** inside (glowing through the slightly
 * transparent membrane) — the large central neuron sits in the GRE·VEN gap,
 * five smaller ones are the clickable nav nodes, and a few deeper ones frame
 * the scene. The **fibres** (axons, dendrite tendrils, deep crossing
 * filaments) are all procedural, branch mid-way, and link neuron to neuron so
 * the network reads as a distributed organic mesh, matching the reference.
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
const CENTER_TARGET_R = 0.62;
const NAV_TARGET_R = 0.3;
const DECO_TARGET_R = 0.42;
const NAV_HIT_RADIUS = 0.85;
const PULSE_DURATION = 0.85;

/** Deeper, non-interactive neuron masses that add parallax depth and frame the
 *  core. Pushed well behind the focal plane — the fog + DoF melt them into the
 *  haze so they read as a ramified background, never competing with the title. */
const DECO_POSITIONS: [number, number, number][] = [
  [-4.9, 2.4, -2.8],
  [5.1, -2.2, -3.1],
  [-1.1, -3.3, -3.3],
  [5.4, 1.6, -2.5],
  [-5.6, -0.9, -2.7],
];

/** Long, thin fibres crossing the frame far behind the focal plane: the
 *  distributed organic network the reference shows in its depths. */
const BACK_FIBER_COUNT = 7;
/** Free-ending tendrils radiating from the central mass. */
const TENDRIL_COUNT = 6;

const EMISSIVE = NETWORK_CONFIG.palette.emissive;

type Variant = 'a' | 'b' | 'c';

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

/** Organic curve between two points (bowed off-axis so nothing is straight). */
function makeFiberCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rng: SeededRandom,
): THREE.CubicBezierCurve3 {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const perp = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.4);
  if (perp.lengthSq() < 1e-4) perp.set(0, 1, 0);
  perp.normalize();
  const amp = len * 0.2;
  const c1 = start
    .clone()
    .addScaledVector(dir, 0.34)
    .addScaledVector(perp, amp * rng.range(-1, 1));
  const c2 = start
    .clone()
    .addScaledVector(dir, 0.68)
    .addScaledVector(perp, amp * rng.range(-1, 1));
  return new THREE.CubicBezierCurve3(start, c1, c2, end);
}

/** Warm filament (axon or dendrite) between two points in the network. */
function buildFiber(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rng: SeededRandom,
  radius = 0.014,
): THREE.TubeGeometry {
  return new THREE.TubeGeometry(makeFiberCurve(start, end, rng), 26, radius, 6, false);
}

/** A finer sub-branch leaving a parent fibre part-way along, wandering off in
 *  a related but diverging direction — what makes the network read ramified. */
function buildBranch(
  parent: THREE.CubicBezierCurve3,
  rng: SeededRandom,
  radius: number,
): THREE.TubeGeometry {
  const t = rng.range(0.35, 0.7);
  const start = parent.getPoint(t);
  const along = parent.getTangent(t);
  const away = new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-0.5, 0.5));
  if (away.lengthSq() < 1e-4) away.set(0, 1, 0);
  away.normalize();
  const len = rng.range(0.5, 1.3);
  const end = start
    .clone()
    .addScaledVector(along, len * 0.5)
    .addScaledVector(away, len);
  return new THREE.TubeGeometry(makeFiberCurve(start, end, rng), 16, radius, 5, false);
}

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);

  const camera = useThree((s) => s.camera);
  const { a, b, c, material } = useNeuronAsset();

  const coreSegments = quality === 'low' ? 12 : 20;
  const geoOf = useCallback(
    (v: Variant): NeuronMeshAsset => (v === 'a' ? a : v === 'b' ? b : c),
    [a, b, c],
  );

  // Deterministic composition: central + 5 nav + decorative, mixing variants.
  const placements = useMemo<Placement[]>(() => {
    const rng = new SeededRandom(`${NETWORK_CONFIG.seed}-compose`);
    const out: Placement[] = [];

    const scaleFor = (v: Variant, targetR: number) => targetR / geoOf(v).radius;
    const randRot = () =>
      new THREE.Euler(rng.range(-0.5, 0.5), rng.range(-Math.PI, Math.PI), rng.range(-0.4, 0.4));

    // Central neuron — the round soma, the anchor of the composition.
    out.push({
      key: 'center',
      position: new THREE.Vector3(0, 0, 0),
      variant: 'a',
      rotation: new THREE.Euler(-0.16, 0.22, 0.05),
      meshScale: scaleFor('a', CENTER_TARGET_R),
      coreRadius: 0.2,
      coreIntensity: 1.15,
      wobble: 0.02,
      connect: false,
      showMesh: true,
    });

    // Five clickable secondary neurons: a small soma head each (variants
    // mixed, sizes slightly varied) with a nucleus glowing through the
    // membrane — real cells on the branches, as in the reference.
    const navVariants: Variant[] = ['b', 'c', 'a', 'c', 'b'];
    NEURON_SECTIONS.forEach((section, i) => {
      const v = navVariants[i]!;
      out.push({
        key: `nav-${section.id}`,
        sectionId: section.id,
        position: new THREE.Vector3(...NETWORK_CONFIG.navPositions[i]!),
        variant: v,
        rotation: randRot(),
        meshScale: scaleFor(v, NAV_TARGET_R * rng.range(0.85, 1.2)),
        coreRadius: 0.12,
        coreIntensity: 1.2,
        wobble: 0.05,
        connect: true,
        showMesh: true,
      });
    });

    // A few deeper decorative neuron masses for parallax + depth-of-field.
    DECO_POSITIONS.forEach((p, i) => {
      const v: Variant = i % 2 === 0 ? 'b' : 'c';
      out.push({
        key: `deco-${i}`,
        position: new THREE.Vector3(...p),
        variant: v,
        rotation: randRot(),
        meshScale: scaleFor(v, DECO_TARGET_R * rng.range(0.8, 1.2)),
        coreRadius: 0.1,
        coreIntensity: 0.6,
        wobble: 0.06,
        connect: true,
        showMesh: true,
      });
    });

    return out;
  }, [geoOf]);

  // Procedural fibre graph. The reference network is NOT a star: fibres link
  // neuron to neuron across the frame, branch mid-way, and a deeper layer of
  // long crossing filaments fills the background. Origins on the central mass
  // are offset from (0,0,0) so nothing converges on a single point.
  const tubes = useMemo(() => {
    const rng = new SeededRandom(`${NETWORK_CONFIG.seed}-axons`);
    const list: { key: string; geometry: THREE.TubeGeometry; layer: 'link' | 'fine' | 'back' }[] =
      [];

    const offsetOrigin = () =>
      new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-0.6, 0.6))
        .normalize()
        .multiplyScalar(rng.range(0.3, 0.6));

    // Central soma → each connecting neuron (leaves the soma off-centre), with
    // an occasional finer branch escaping part-way along.
    const connected = placements.filter((p) => p.connect);
    connected.forEach((p) => {
      const curve = makeFiberCurve(offsetOrigin(), p.position, rng);
      list.push({
        key: p.key,
        geometry: new THREE.TubeGeometry(curve, 26, 0.014, 6, false),
        layer: 'link',
      });
      if (rng.float() < 0.7) {
        list.push({ key: `br-${p.key}`, geometry: buildBranch(curve, rng, 0.005), layer: 'fine' });
      }
    });

    // Neuron ↔ neuron web: each connected node also reaches its nearest
    // neighbour, so the network reads as a distributed mesh, not a star.
    connected.forEach((p, i) => {
      let nearest: Placement | null = null;
      let best = Infinity;
      connected.forEach((q, j) => {
        if (j <= i) return;
        const d = p.position.distanceToSquared(q.position);
        if (d < best) {
          best = d;
          nearest = q;
        }
      });
      if (nearest) {
        list.push({
          key: `web-${p.key}`,
          geometry: buildFiber(p.position, (nearest as Placement).position, rng, 0.009),
          layer: 'fine',
        });
      }
    });

    // Free-ending tendrils from the central soma — thin, asymmetric, half of
    // them forking once, so the central neuron reads as a living dendrite tree.
    for (let i = 0; i < TENDRIL_COUNT; i += 1) {
      const angle = (i / TENDRIL_COUNT) * Math.PI * 2 + rng.range(-0.6, 0.6);
      const len = rng.range(1.6, 3.1);
      const end = new THREE.Vector3(
        Math.cos(angle) * len,
        Math.sin(angle) * len * rng.range(0.6, 1),
        rng.range(-0.8, 0.4),
      );
      const curve = makeFiberCurve(offsetOrigin(), end, rng);
      list.push({
        key: `dend-${i}`,
        geometry: new THREE.TubeGeometry(curve, 26, 0.005, 5, false),
        layer: 'fine',
      });
      if (rng.float() < 0.5) {
        list.push({ key: `dend-br-${i}`, geometry: buildBranch(curve, rng, 0.003), layer: 'fine' });
      }
    }

    // Deep crossing filaments — the hazy ramified background of the reference —
    // each with a branch so the depths look grown, not drawn.
    for (let i = 0; i < BACK_FIBER_COUNT; i += 1) {
      const y1 = rng.range(-3, 3);
      const start = new THREE.Vector3(rng.range(-7.5, -2), y1, rng.range(-4.5, -2.2));
      const end = new THREE.Vector3(
        rng.range(2, 7.5),
        y1 + rng.range(-2.4, 2.4),
        rng.range(-4.5, -2.2),
      );
      const curve = makeFiberCurve(start, end, rng);
      list.push({
        key: `back-${i}`,
        geometry: new THREE.TubeGeometry(curve, 26, 0.008, 6, false),
        layer: 'back',
      });
      list.push({ key: `back-br-${i}`, geometry: buildBranch(curve, rng, 0.005), layer: 'back' });
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
          p.coreIntensity + e[i]! * 1.1;
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
      {/* Fibre graph — dark organic filaments, lit edges only, never neon. */}
      {tubes.map((tube) => (
        <mesh key={`tube-${tube.key}`} geometry={tube.geometry} frustumCulled={false}>
          <meshStandardMaterial
            color={tube.layer === 'back' ? '#3f352a' : '#564735'}
            emissive={tube.layer === 'link' ? '#4a3a26' : '#382c1c'}
            emissiveIntensity={tube.layer === 'link' ? 0.5 : 0.35}
            roughness={0.75}
            metalness={0}
            transparent
            opacity={tube.layer === 'back' ? 0.4 : tube.layer === 'fine' ? 0.55 : 0.8}
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
              roughness={0.4}
              metalness={0}
              toneMapped
            />
          </mesh>
        </group>
      ))}

      {/* Suspended dust — faint warm motes drifting in the haze (depth cue). */}
      <Dust />

      {/* Core → neuron selection pulse. */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={EMISSIVE}
          emissive={EMISSIVE}
          emissiveIntensity={1.8}
          roughness={0.4}
          metalness={0}
          toneMapped
        />
      </mesh>
    </group>
  );
}

/** Sparse warm dust suspended through the depth range. Deterministic, static
 *  (the camera parallax alone makes it drift), cheap: one Points draw call. */
function Dust() {
  const positions = useMemo(() => {
    const rng = new SeededRandom(`${NETWORK_CONFIG.seed}-dust`);
    const COUNT = 140;
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3] = rng.range(-7, 7);
      arr[i * 3 + 1] = rng.range(-4, 4);
      arr[i * 3 + 2] = rng.range(-4.5, 2.5);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8a7050"
        size={0.03}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}
