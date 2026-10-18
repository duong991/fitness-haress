'use client';

import Link from 'next/link';
import { ArrowUpRight, Dumbbell } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/lib/format';

/**
 * The one inverted band on the page: deep indigo "night" and the single
 * most important number in the product.
 * Elevation here comes from illustration and light, not from shadow.
 */
export default function NightBand({
  remaining,
  overBudget,
  consumed,
  target,
  progress,
  dateLabel,
  relative,
  onLogWorkout,
}: {
  remaining: number;
  overBudget: boolean;
  consumed: number;
  target: number;
  progress: number;
  dateLabel: string;
  relative: string;
  onLogWorkout: () => void;
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, progress) / 100) * circumference;

  return (
    <section
      aria-label="Tổng quan năng lượng hôm nay"
      className="relative overflow-hidden r-well bg-night text-white"
    >
      {/* Decorative depth: two drifting light fields, nothing that moves text. */}
      <div
        aria-hidden
        className="animate-night-drift pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 120% at 12% 0%, rgba(98,174,240,0.45) 0%, transparent 55%), radial-gradient(50% 110% at 88% 100%, rgba(214,182,246,0.35) 0%, transparent 60%)',
        }}
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.125px] text-white/65">
            <span className="h-1.5 w-1.5 r-chip bg-white/70" aria-hidden />
            {relative} · {dateLabel}
          </p>

          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-display-2 leading-none text-white sm:text-display-1">
              {formatNumber(Math.abs(remaining))}
            </span>
            <span className="text-body-sm text-white/70">
              kcal {overBudget ? 'vượt mục tiêu' : 'còn lại hôm nay'}
            </span>
          </p>

          <p className="mt-3 max-w-[52ch] text-body-sm text-white/70">
            Đã nạp {formatNumber(consumed)} / {formatNumber(target)} kcal. Ghi thêm bữa ăn hoặc set tập
            để cập nhật ngay.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button variant="night" icon={<Dumbbell />} onClick={onLogWorkout}>
              Ghi set tập
            </Button>
            <Link
              href="/tdee"
              className="inline-flex h-10 items-center gap-1.5 r-chip border border-white/30 px-4 text-body-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Xem TDEE
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Progress ring: light-on-indigo, no filled track behind it. */}
        <div className="relative flex flex-shrink-0 items-center justify-center self-start lg:self-auto">
          <svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label={`Đã nạp ${progress}% mục tiêu calo`}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={overBudget ? 'var(--sticker-orange)' : 'var(--sticker-sky)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 400ms cubic-bezier(0.2,0.8,0.2,1)' }}
            />
          </svg>
          <div className="absolute text-center">
            <p className="font-metric text-heading-3 leading-none text-white">{progress}%</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.125px] text-white/60">mục tiêu</p>
          </div>
        </div>
      </div>
    </section>
  );
}
