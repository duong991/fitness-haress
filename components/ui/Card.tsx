import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { SkeletonRows } from '@/components/ui/Skeleton';

export { SkeletonRows };

export type StickerTone =
  | 'sky'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'teal'
  | 'green'
  | 'brown'
  | 'neutral'
  | 'primary';

/**
 * R2 / R4 — the workhorse surface: pure white on warm paper, hairline edge,
 * flat by default. `tone` only ever paints the decorative head band or badge,
 * never a call to action.
 */
interface CardProps {
  children: ReactNode;
  className?: string;
  /** Level-1 soft layered lift. Use sparingly; hairline is the default. */
  elevated?: boolean;
  /** Decorative colour-blocked head band, per DESIGN-notion.md §Components. */
  tone?: StickerTone;
  /** Height of the head band in px. Keep it small (a label strip, not a hero). */
  bandHeight?: number;
  bandLabel?: ReactNode;
}

const TONE_BG: Record<StickerTone, string> = {
  sky: 'bg-sticker-sky',
  purple: 'bg-sticker-purple',
  pink: 'bg-sticker-pink',
  orange: 'bg-sticker-orange',
  teal: 'bg-sticker-teal',
  green: 'bg-sticker-green',
  brown: 'bg-sticker-brown',
  neutral: 'bg-hairline-soft',
  primary: 'bg-primary',
};

export function Card({
  children,
  className,
  elevated,
  tone,
  bandHeight = 44,
  bandLabel,
}: CardProps) {
  return (
    <div className={cx('card overflow-hidden', elevated && 'elev-1', className)}>
      {tone ? (
        <div
          className={cx('sticker', TONE_BG[tone])}
          style={{ height: bandHeight }}
          aria-hidden={!bandLabel}
        >
          {bandLabel ? (
            <span
              className={cx(
                'text-eyebrow uppercase',
                tone === 'neutral' ? 'text-ink-muted' : 'text-white/95',
              )}
            >
              {bandLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default Card;

/** Badge / category pill. This is the FIRST of the two allowed small labels. */
export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: StickerTone;
  className?: string;
}) {
  const tones: Record<StickerTone, string> = {
    sky: 'bg-sticker-sky-soft text-sticker-sky-ink',
    purple: 'bg-sticker-purple-soft text-sticker-purple-deep',
    pink: 'bg-sticker-pink-soft text-sticker-pink-ink',
    orange: 'bg-sticker-orange-soft text-sticker-orange-deep',
    teal: 'bg-sticker-teal-soft text-sticker-teal-ink',
    green: 'bg-sticker-green-soft text-sticker-green-ink',
    brown: 'bg-sticker-brown-soft text-sticker-brown',
    neutral: 'bg-canvas text-ink-muted border border-hairline',
    primary: 'bg-primary-soft text-primary-active',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 r-chip px-2 py-[3px] text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Eyebrow / category pill with brand-primary text, per badge-pill spec. */
export function EyebrowPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 r-chip bg-surface border border-hairline px-2.5 py-1 text-eyebrow uppercase text-primary elev-1',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A compact progress meter.
 *
 * §4.7 bans decorated progress bars used as comparison visuals; this one is
 * allowed because tracking a daily target IS the product, so the fill carries
 * real state. It stays thin, keeps a neutral track, and never prints a
 * percentage inside the bar.
 */
export function Meter({
  value,
  max,
  className,
  fillClassName,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  fillClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden r-chip bg-hairline-soft', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
    >
      {/* The fill colour is passed in whole; the track never doubles as a fill. */}
      <div className={cx('h-full r-chip', fillClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Section heading: label above, description beside it is banned (split-header rule). */
export function SectionHead({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-end justify-between gap-x-4 gap-y-2',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-title text-ink truncate">{title}</h2>
        {meta ? <p className="mt-1 text-caption text-ink-muted">{meta}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Empty / loading / error surfaces. Every list needs all three. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="r-card border border-dashed border-hairline bg-surface/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center r-chip bg-canvas text-ink-faint [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      ) : null}
      <p className="text-body-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-[13px] leading-relaxed text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

