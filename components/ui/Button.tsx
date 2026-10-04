import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

type Variant =
  /** THE blue action. One per screen, maximum. */
  | 'primary'
  /** White pill on a soft layered shadow. Pairs beside primary. */
  | 'secondary'
  /** Tighter 8px chrome for nav rows, table actions and plan-select. */
  | 'utility'
  /** Text-only, for Hủy / dismiss controls. */
  | 'ghost'
  /** White-on-indigo, for use inside the single night band. */
  | 'night';

type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  /** Leading glyph slot. Keep it a lucide icon, never a hand-rolled path. */
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Renders a Next.js Link with identical chrome. */
  href?: string;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white border border-transparent hover:bg-primary-active active:bg-primary-active active:scale-[0.98] elev-1',
  secondary:
    'bg-surface text-ink border border-hairline hover:bg-canvas active:scale-[0.98] elev-1',
  utility:
    'bg-surface text-ink border border-hairline hover:bg-canvas active:scale-[0.98] r-utility',
  ghost:
    'bg-transparent text-ink-muted border border-transparent hover:bg-canvas hover:text-ink',
  night:
    'bg-white text-night border border-transparent hover:bg-white/90 active:scale-[0.98] elev-1',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-body-sm gap-2',
  lg: 'h-12 px-6 text-button gap-2',
};

const RADIUS: Record<Variant, string> = {
  primary: 'r-chip',
  secondary: 'r-chip',
  utility: 'r-utility',
  ghost: 'r-utility',
  night: 'r-chip',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className,
  icon,
  trailingIcon,
  href,
  fullWidth,
  ...rest
}: BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>) {
  const classes = cx(
    'inline-flex items-center justify-center font-medium whitespace-nowrap',
    'transition-[background-color,transform,box-shadow,color] duration-150',
    'disabled:opacity-55 disabled:pointer-events-none select-none',
    SIZES[size],
    VARIANTS[variant],
    RADIUS[variant],
    fullWidth && 'w-full',
    className,
  );

  const content = (
    <>
      {icon ? <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      <span>{children}</span>
      {trailingIcon ? (
        <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{trailingIcon}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}
