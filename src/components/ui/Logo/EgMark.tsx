/**
 * EG monogram — Evan Greven.
 * A monoline "E" and "G" set inside a thin square, drawn as pure geometry so it
 * renders identically everywhere (no font dependency) and stays cleanly
 * editable. Colour follows `currentColor`; size and framing are configurable
 * for the header lockup, favicon, loader, mobile menu and back-to-network button.
 */

export interface EgMarkProps {
  /** Rendered pixel size (square). */
  size?: number;
  /** Draw the surrounding thin square. Off for the most compact contexts. */
  framed?: boolean;
  /** Stroke weight of the letterforms, in viewBox units. */
  weight?: number;
  /** Accessible title; omit for decorative use (defaults to aria-hidden). */
  title?: string;
  className?: string;
}

export function EgMark({ size = 40, framed = true, weight = 4, title, className }: EgMarkProps) {
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
        <rect
          x={6}
          y={6}
          width={88}
          height={88}
          rx={1.5}
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.55}
        />
      ) : null}
      <g stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        {/* E */}
        <path d="M26 34 V66" />
        <path d="M26 34 H42" />
        <path d="M26 50 H39" />
        <path d="M26 66 H42" />
        {/* G */}
        <path d="M71 41 A15 15 0 1 0 71 59" />
        <path d="M71 59 H59 V51" />
      </g>
    </svg>
  );
}
