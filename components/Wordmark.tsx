/**
 * Workspace mark.
 *
 * A wordmark stand-in built from plain blocks rather than a hand-rolled icon
 * path: three stacked bars of decreasing weight, the universal "load" glyph.
 * Drop in the real SVG the moment one exists — nothing else depends on this.
 */
export default function Wordmark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const bars = [
    { w: 1, h: 0.34, y: 0 },
    { w: 0.72, h: 0.24, y: 0.38 },
    { w: 0.46, h: 0.24, y: 0.66 },
  ];

  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'block', position: 'relative' }}
      aria-hidden
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: `${bar.y * 100}%`,
            width: `${bar.w * 100}%`,
            height: `${bar.h * 100}%`,
            borderRadius: 2,
            background: i === 0 ? 'var(--ink)' : 'var(--ink-muted)',
            opacity: i === 0 ? 1 : 0.55,
          }}
        />
      ))}
    </span>
  );
}
