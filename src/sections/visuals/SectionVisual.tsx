import type { VisualKind } from '@/data/content/types';
import styles from './SectionVisual.module.css';

/**
 * Bespoke, palette-consistent Machine-Learning visualisations — one per
 * section. Pure SVG (crisp, cheap, accessible), matching the brief's required
 * illustration for each page. Decorative only, so aria-hidden.
 */
export function SectionVisual({ kind }: { kind: VisualKind }) {
  return (
    <svg
      className={styles.visual}
      viewBox="0 0 320 240"
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {kind === 'graph' && <ReasoningGraph />}
      {kind === 'layers' && <ModelLayers />}
      {kind === 'flow' && <EmbeddingFlow />}
      {kind === 'trajectory' && <Trajectory />}
      {kind === 'converge' && <ConvergingNode />}
    </svg>
  );
}

/** Recherche (知) — a dense reasoning graph with a highlighted path. */
function ReasoningGraph() {
  const nodes: [number, number][] = [
    [40, 60],
    [110, 40],
    [90, 130],
    [160, 90],
    [150, 180],
    [230, 60],
    [250, 150],
    [290, 110],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [2, 4],
    [3, 5],
    [3, 6],
    [4, 6],
    [5, 7],
    [6, 7],
  ];
  const path = [0, 3, 6, 7];
  return (
    <g>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          className={styles.line}
          x1={nodes[a]![0]}
          y1={nodes[a]![1]}
          x2={nodes[b]![0]}
          y2={nodes[b]![1]}
        />
      ))}
      <polyline
        className={`${styles.accent} ${styles.flow}`}
        points={path.map((n) => nodes[n]!.join(',')).join(' ')}
      />
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          className={path.includes(i) ? styles.nodePearl : styles.node}
          cx={x}
          cy={y}
          r={i === 3 ? 6 : 4}
        />
      ))}
    </g>
  );
}

/** Projets (美) — stacked model layers / modules connected across columns. */
function ModelLayers() {
  const cols = [30, 100, 170, 240];
  const rows = [70, 110, 150];
  return (
    <g>
      {cols
        .slice(0, -1)
        .map((cx, c) =>
          rows.map((y1) =>
            rows.map((y2, r2) => (
              <line
                key={`${c}-${y1}-${r2}`}
                className={styles.line}
                x1={cx + 24}
                y1={y1 + 10}
                x2={cols[c + 1]!}
                y2={y2 + 10}
              />
            )),
          ),
        )}
      {cols.map((cx, c) =>
        rows.map((y, r) => (
          <rect
            key={`${c}-${r}`}
            className={styles.rect}
            x={cx}
            y={y}
            width={24}
            height={20}
            rx={2}
          />
        )),
      )}
      <rect
        className={`${styles.accent}`}
        x={cols[3]!}
        y={rows[1]!}
        width={24}
        height={20}
        rx={2}
      />
      <line className={`${styles.accent} ${styles.flow}`} x1={54} y1={120} x2={240} y2={120} />
    </g>
  );
}

/** Publications (道) — structured vectors flowing through a bottleneck. */
function EmbeddingFlow() {
  const rowsY = [70, 110, 150];
  return (
    <g>
      {rowsY.map((y, r) =>
        Array.from({ length: 4 }).map((_, i) => (
          <rect
            key={`${r}-${i}`}
            className={styles.rect}
            x={24 + i * 16}
            y={y}
            width={12}
            height={16}
            rx={1.5}
          />
        )),
      )}
      {rowsY.map((y, r) => (
        <line
          key={`f-${r}`}
          className={`${styles.line} ${styles.flow}`}
          x1={96}
          y1={y + 8}
          x2={168}
          y2={120}
        />
      ))}
      <circle className={styles.nodePearl} cx={168} cy={120} r={7} />
      <line className={`${styles.accent} ${styles.flow}`} x1={175} y1={120} x2={270} y2={120} />
      {[104, 120, 136].map((y, i) => (
        <rect
          key={`o-${i}`}
          className={styles.rect}
          x={270}
          y={y - 6}
          width={22}
          height={12}
          rx={1.5}
        />
      ))}
    </g>
  );
}

/** À propos (質) — a continuous neural trajectory (the path/parcours). */
function Trajectory() {
  const pts: [number, number][] = [
    [24, 180],
    [70, 120],
    [110, 160],
    [150, 90],
    [200, 130],
    [240, 70],
    [296, 110],
  ];
  return (
    <g>
      <polyline
        className={`${styles.accent} ${styles.flow}`}
        points={pts.map((p) => p.join(',')).join(' ')}
      />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          className={i === pts.length - 1 ? styles.nodePearl : styles.node}
          cx={x}
          cy={y}
          r={i === pts.length - 1 ? 6 : 4}
        />
      ))}
    </g>
  );
}

/** Contact (特) — many connections converging to a central node. */
function ConvergingNode() {
  const cx = 160;
  const cy = 120;
  const ring: [number, number][] = Array.from({ length: 10 }).map((_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [cx + Math.cos(a) * 120, cy + Math.sin(a) * 90];
  });
  return (
    <g>
      {ring.map(([x, y], i) => (
        <line key={i} className={`${styles.line} ${styles.flow}`} x1={x} y1={y} x2={cx} y2={cy} />
      ))}
      {ring.map(([x, y], i) => (
        <circle key={`n-${i}`} className={styles.node} cx={x} cy={y} r={3} />
      ))}
      <circle className={`${styles.nodePearl} ${styles.pulse}`} cx={cx} cy={cy} r={9} />
    </g>
  );
}
