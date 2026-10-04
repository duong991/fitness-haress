'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import { formatDateLong, relativeDayLabel, shiftDay, TODAY } from '@/lib/format';
import Button from '@/components/ui/Button';

const TRAIL: Record<string, string> = {
  '/': 'Nhật ký hôm nay',
  '/food': 'Dinh dưỡng',
  '/workout': 'Buổi tập',
  '/tdee': 'Adaptive TDEE',
  '/exercises': 'Bài tập & PR',
  '/profile': 'Hồ sơ',
};

/**
 * Document header, in the shape of a Notion page: a breadcrumb rail, then one
 * large H1. No eyebrow label here — that slot is reserved so the page never
 * carries two small uppercase labels above a single heading.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const crumb = TRAIL[pathname] ?? 'Nhật ký';

  return (
    <header className="mb-8">
      <nav aria-label="Đường dẫn" className="mb-3">
        <ol className="flex items-center gap-1.5 text-[13px] text-ink-faint">
          <li>Fitness Harness</li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-secondary">{crumb}</li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center r-card bg-surface text-ink-secondary elev-1">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-heading-2 text-ink sm:text-heading-1">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-[62ch] text-body-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * The date control that every tracking screen shares. One component, one set of
 * labels, so the same action never reads "Ngày trước" on one page and "Lùi
 * ngày" on another.
 */
export function DateSwitcher({
  date,
  onChange,
  className,
}: {
  date: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const isToday = date === TODAY;

  return (
    <div
      className={cx(
        'inline-flex items-center gap-1 r-chip border border-hairline bg-surface py-1 pl-1 pr-1.5 elev-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(shiftDay(date, -1))}
        aria-label="Ngày trước"
        className="flex h-7 w-7 items-center justify-center r-chip text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="px-1 text-center">
        <span className="block text-[13px] font-semibold leading-tight text-ink">
          {relativeDayLabel(date)}
        </span>
        <span className="block font-metric text-[11px] leading-tight text-ink-faint">
          {formatDateLong(date)}
        </span>
      </span>

      <button
        type="button"
        onClick={() => onChange(shiftDay(date, 1))}
        aria-label="Ngày sau"
        className="flex h-7 w-7 items-center justify-center r-chip text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isToday ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(TODAY)} className="ml-0.5">
          Về hôm nay
        </Button>
      ) : null}
    </div>
  );
}

/** A single labelled figure. Used in the property strip and summary bands. */
export function StatBlock({
  label,
  value,
  unit,
  meta,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <p className="text-[12px] font-medium text-ink-faint">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="font-metric text-heading-3 leading-none text-ink">{value}</span>
        {unit ? <span className="text-[12px] text-ink-faint">{unit}</span> : null}
      </p>
      {meta ? <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">{meta}</p> : null}
    </div>
  );
}
