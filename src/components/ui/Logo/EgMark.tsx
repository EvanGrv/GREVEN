/**
 * EG monogram — Evan Greven.
 * Two interlocked serif capitals (the display serif of the site) set inside a
 * thin square: E anchored upper-left, G lower-right, overlapping on the
 * diagonal, matching the supplied brand lockup. Rendered as inline SVG text so
 * it stays vector-crisp, inherits `currentColor`, and uses the already-loaded
 * Playfair face (Georgia fallback keeps the shape without it).
 */

export interface EgMarkProps {
  /** Rendered pixel size (square). */
  size?: number;
  /** Draw the surrounding thin square. Off for the most compact contexts. */
  framed?: boolean;
  /** Accessible title; omit for decorative use (defaults to aria-hidden). */
  title?: string;
  className?: string;
}

export function EgMark({ size = 40, framed = true, title, className }: EgMarkProps) {
  const decorative = !title;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {title ? <title>{title}</title> : null}
      {framed ? (
        <rect x={5} y={5} width={90} height={90} stroke="currentColor" strokeWidth={2.5} />
      ) : null}
      <g
        fill="currentColor"
        style={{ fontFamily: "var(--font-serif, 'Georgia', serif)", fontWeight: 500 }}
      >
        <text x={37} y={61} fontSize={54} textAnchor="middle">
          E
        </text>
        <text x={62} y={86} fontSize={54} textAnchor="middle">
          G
        </text>
      </g>
    </svg>
  );
}
