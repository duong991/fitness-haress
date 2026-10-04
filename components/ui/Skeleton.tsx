import { cx } from '@/lib/cx';

/**
 * Loading placeholders that mimic the shape of the content they replace.
 * §4.5 — a skeletal loader matching the final layout, never a lone spinner.
 */
export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="border-b border-hairline bg-canvas px-3 py-2.5">
        <div className="h-3 w-28 r-row bg-hairline-soft" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid items-center gap-3 border-b border-hairline-soft px-3 py-3 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              className={cx('h-3 r-row bg-hairline-soft')}
              style={{ width: c === 0 ? '70%' : '45%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 r-row bg-hairline-soft"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
