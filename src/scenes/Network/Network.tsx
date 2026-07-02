'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_CONFIG } from '@/data/network.config';
import { NEURON_SECTIONS, type SectionId } from '@/data/sections';
import { useSceneStore, type QualityLevel } from '@/stores/sceneStore';
import { useNeuronAsset } from '@/scenes/Neuron/useNeuronAsset';

/**
 * The neural network is a single 3D model — one large soma with a radiating
 * dendrite tree and secondary cell bodies sitting on its branches. It is placed
 * once, centred at the world origin (the GRE·VEN gap), scaled to fill the hero
 * and tilted so the flat-ish mesh reads with real perspective and depth. Gentle
 * breathing + pointer parallax keep it alive.
 *
 * The five navigation neurons are those secondary cell bodies: glowing marker
 * nodes at art-directed world positions on the branches. They are hit-tested
 * with a cheap ray-sphere test (the model geometry is never raycast) so the
 * canvas can stay pointer-events:none and the accessible HTML nav stays usable.
 * Hover and selection are mirrored through the scene store, unifying the 3D
 * neurons with the HTML SideNav; selecting one sends a pulse from the core out
 * to that body and flies the camera in.
 */

/** Fills the hero while the tilt keeps front branches nearer than the core. */
const MODEL_SCALE = 3.2;
const TILT_X = -0.12;
const TILT_Y = 0.16;
const NAV_HIT_RADIUS = 0.85;
/** Seconds for the selection pulse to travel core → selected body. */
const PULSE_DURATION = 0.85;

interface NavMarker {
  id: SectionId;
  position: THREE.Vector3;
}

export function Network({ quality }: { quality: QualityLevel }) {
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setHoveredSection = useSceneStore((s) => s.setHoveredSection);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const requestTravel = useSceneStore((s) => s.requestTravel);
  const hoveredSection = useSceneStore((s) => s.hoveredSection);
  const activeSection = useSceneStore((s) => s.activeSection);

  const camera = useThree((s) => s.camera);
  const { scene } = useNeuronAsset();

  const markerSegments = quality === 'low' ? 12 : 20;

  // The five secondary cell bodies (navigation neurons), kept in world space so
  // the CameraRig focus, NeuralTravel and ScrollExploration — which all read
  // NETWORK_CONFIG.navPositions — stay perfectly consistent with hover/select.
  const markers = useMemo<NavMarker[]>(
    () =>
      NEURON_SECTIONS.map((section, i) => ({
        id: section.id,
        position: new THREE.Vector3(...NETWORK_CONFIG.navPositions[i]!),
      })),
    [],
  );

  const navBySectionId = useMemo(() => {
    const map = new Map<SectionId, THREE.Vector3>();
    markers.forEach((m) => map.set(m.id, m.position));
    return map;
  }, [markers]);

  const modelRef = useRef<THREE.Group>(null);
  const markerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pulseRef = useRef<THREE.Mesh>(null);

  const hoverFactors = useRef<Float32Array>(new Float32Array(markers.length));
  const lastHovered = useRef<SectionId | null>(null);
  const pulseStart = useRef<number | null>(null);
  const pulseTarget = useRef<THREE.Vector3 | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const scratch = useMemo(
    () => ({
      ndc: new THREE.Vector2(),
      cur: new THREE.Vector3(),
      origin: new THREE.Vector3(0, 0, 0),
    }),
    [],
  );

  // Pointer feedback on hover (the canvas itself is pointer-events:none).
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

  // Arm the core → body pulse whenever a section becomes active.
  useEffect(() => {
    pulseStart.current = null;
    pulseTarget.current = activeSection ? (navBySectionId.get(activeSection) ?? null) : null;
  }, [activeSection, navBySectionId]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { pointer, hoveredSection: hov, activeSection: act } = useSceneStore.getState();

    // 1) Hover hit-test on the five bodies (cheap ray-sphere, no geometry raycast).
    scratch.ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(scratch.ndc, camera);
    let hoveredId: SectionId | null = null;
    let bestDist = Infinity;
    for (let k = 0; k < markers.length; k += 1) {
      const center = markers[k]!.position;
      if (raycaster.ray.distanceToPoint(center) < NAV_HIT_RADIUS) {
        const along = camera.position.distanceToSquared(center);
        if (along < bestDist) {
          bestDist = along;
          hoveredId = markers[k]!.id;
        }
      }
    }
    if (hoveredId !== lastHovered.current) {
      lastHovered.current = hoveredId;
      setHoveredSection(hoveredId);
    }

    // 2) The model: static tilt for perspective + gentle breathing & parallax.
    const grp = modelRef.current;
    if (grp) {
      if (reducedMotion) {
        grp.rotation.set(TILT_X, TILT_Y, 0);
        grp.scale.setScalar(MODEL_SCALE);
      } else {
        const breathe = 1 + Math.sin(t * 0.4) * 0.012;
        grp.rotation.x = TILT_X + pointer.y * 0.05;
        grp.rotation.y = TILT_Y + pointer.x * 0.08;
        grp.scale.setScalar(MODEL_SCALE * breathe);
      }
    }

    // 3) The five bodies: emphasise the hovered/active one, subtle breathing.
    for (let k = 0; k < markers.length; k += 1) {
      const mesh = markerRefs.current[k];
      if (!mesh) continue;
      const emphasised = markers[k]!.id === hov || markers[k]!.id === act ? 1 : 0;
      const hf = hoverFactors.current;
      hf[k] = THREE.MathUtils.damp(hf[k]!, emphasised, 8, 1 / 60);
      const breathe = reducedMotion ? 1 : 1 + Math.sin(t * 0.7 + k) * 0.06;
      mesh.scale.setScalar((0.16 + hf[k]! * 0.12) * breathe);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + hf[k]! * 2.2;
    }

    // 4) Core → body selection pulse.
    const pulse = pulseRef.current;
    if (pulse) {
      const target = pulseTarget.current;
      if (target && act && !reducedMotion) {
        if (pulseStart.current === null) pulseStart.current = t;
        const progress = (t - pulseStart.current) / PULSE_DURATION;
        if (progress >= 0 && progress <= 1) {
          scratch.cur.copy(scratch.origin).lerp(target, progress);
          pulse.position.copy(scratch.cur);
          pulse.scale.setScalar(0.12 * (1 - progress * 0.4));
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
      {/* The whole neural network, placed once, centred, tilted for depth. */}
      <group ref={modelRef} rotation={[TILT_X, TILT_Y, 0]} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>

      {/* The five secondary cell bodies = navigation neurons. */}
      {markers.map((m, i) => (
        <mesh
          key={m.id}
          ref={(el) => {
            markerRefs.current[i] = el;
          }}
          position={m.position}
        >
          <sphereGeometry args={[1, markerSegments, markerSegments]} />
          <meshStandardMaterial
            color={NETWORK_CONFIG.palette.navNeuron}
            emissive={NETWORK_CONFIG.palette.emissive}
            emissiveIntensity={1.6}
            roughness={0.35}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Core → body selection pulse. */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={NETWORK_CONFIG.palette.emissive}
          emissive={NETWORK_CONFIG.palette.emissive}
          emissiveIntensity={2.6}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
