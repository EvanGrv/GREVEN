import { NETWORK_CONFIG, countsFor } from '@/data/network.config';
import { NEURON_SECTIONS } from '@/data/sections';
import { SeededRandom } from '@/lib/prng';
import type { QualityLevel } from '@/stores/sceneStore';
import type { NetworkEdge, NetworkNode, NetworkModel, Vec3 } from '@/types/network';

/**
 * Deterministic neural-network generator.
 * Given a quality tier it always returns the same organic, centre-dense,
 * asymmetric composition: 5 stable navigation neurons, a field of secondary
 * neurons, diffuse peripheral synapses, and proximity-grown curved axons.
 */

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function len(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}
function normalize(v: Vec3): Vec3 {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** A unit vector perpendicular to `dir`, seeded from `rng`. */
function perpendicular(dir: Vec3, rng: SeededRandom): Vec3 {
  const [rx, ry, rz] = rng.onSphere(1, 0);
  const r: Vec3 = [rx, ry, rz];
  const d = dot(r, dir);
  const perp: Vec3 = [r[0] - dir[0] * d, r[1] - dir[1] * d, r[2] - dir[2] * d];
  return normalize(perp);
}

function makeNode(
  kind: NetworkNode['kind'],
  base: Vec3,
  radius: number,
  amplitude: number,
  rng: SeededRandom,
  sectionId?: NetworkNode['sectionId'],
): NetworkNode {
  return {
    kind,
    base,
    radius,
    amplitude,
    noiseOffset: [rng.range(0, 40), rng.range(0, 40), rng.range(0, 40)],
    phase: rng.range(0, Math.PI * 2),
    ...(sectionId ? { sectionId } : {}),
  };
}

export function generateNetwork(quality: QualityLevel): NetworkModel {
  const cfg = NETWORK_CONFIG;
  const counts = countsFor(quality);
  const rng = new SeededRandom(`${cfg.seed}:${quality}`);
  const nodes: NetworkNode[] = [];

  // --- Navigation neurons: 5, stable, spread with jitter (not a perfect ring). ---
  const navCount = NEURON_SECTIONS.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < navCount; i += 1) {
    const section = NEURON_SECTIONS[i]!;
    const angle = i * golden + rng.range(-0.25, 0.25);
    const band = cfg.navRadius + rng.range(-0.35, 0.35);
    const depth = rng.range(-1, 1) * cfg.radius * cfg.depthScale * 0.5;
    const base: Vec3 = [Math.cos(angle) * band, Math.sin(angle) * band * 0.72, depth];
    const radius = rng.range(cfg.size.navNeuron[0], cfg.size.navNeuron[1]);
    nodes.push(makeNode('nav', base, radius, cfg.motion.navAmplitude, rng, section.id));
  }

  // --- Secondary neurons: centre-dense cloud. ---
  for (let i = 0; i < counts.neurons; i += 1) {
    const t = Math.pow(rng.float(), cfg.centerDensity);
    const [x, y, z] = rng.onSphere(cfg.radius * t + 0.2, 0.3);
    const base: Vec3 = [x, y, z * cfg.depthScale];
    const radius = rng.range(cfg.size.neuron[0], cfg.size.neuron[1]);
    nodes.push(makeNode('neuron', base, radius, cfg.motion.neuronAmplitude, rng));
  }

  // --- Synapses: diffuse, biased outward. ---
  for (let i = 0; i < counts.synapses; i += 1) {
    const t = Math.pow(rng.float(), 0.75);
    const [x, y, z] = rng.onSphere(cfg.radius * (0.5 + t * 0.7), 0.5);
    const base: Vec3 = [x, y, z * cfg.depthScale];
    const radius = rng.range(cfg.size.synapse[0], cfg.size.synapse[1]);
    nodes.push(makeNode('synapse', base, radius, cfg.motion.synapseAmplitude, rng));
  }

  // --- Axons: connect nearby nodes, curved, capped degree. ---
  const edges: NetworkEdge[] = [];
  const degree = new Array<number>(nodes.length).fill(0);
  const seen = new Set<string>();

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i]!;
    // Rank neighbours by distance.
    const neighbours: { j: number; d: number }[] = [];
    for (let j = 0; j < nodes.length; j += 1) {
      if (j === i) continue;
      const b = nodes[j]!;
      const d = len(sub(a.base, b.base));
      if (d <= cfg.axon.connectRadius) neighbours.push({ j, d });
    }
    neighbours.sort((p, q) => p.d - q.d);

    // Navigation neurons deserve at least one more link to stay well-connected.
    const cap = a.kind === 'nav' ? cfg.axon.maxDegree + 1 : cfg.axon.maxDegree;
    for (const { j } of neighbours) {
      if (degree[i]! >= cap) break;
      if (degree[j]! >= cfg.axon.maxDegree + 1) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const b = nodes[j]!;
      const dir = normalize(sub(b.base, a.base));
      const dist = len(sub(b.base, a.base));
      const s1 = dist * cfg.axon.curveStrength * rng.range(0.35, 1);
      const s2 = dist * cfg.axon.curveStrength * rng.range(0.35, 1);
      const sign = rng.float() > 0.5 ? 1 : -1;
      const p1 = perpendicular(dir, rng);
      const p2 = perpendicular(dir, rng);
      const c1: Vec3 = [p1[0] * s1 * sign, p1[1] * s1 * sign, p1[2] * s1 * sign];
      const c2: Vec3 = [p2[0] * s2 * -sign, p2[1] * s2 * -sign, p2[2] * s2 * -sign];
      edges.push({ a: i, b: j, c1, c2 });
      degree[i] = degree[i]! + 1;
      degree[j] = degree[j]! + 1;
    }
  }

  return {
    nodes,
    edges,
    navIndices: Array.from({ length: navCount }, (_, i) => i),
  };
}
