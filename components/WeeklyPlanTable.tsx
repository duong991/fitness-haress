'use client';

import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  MinusCircle,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, EmptyState, Pill, SectionHead, SkeletonRows } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import { formatDateShort, formatDecimal, formatNumber } from '@/lib/format';
import type { PlanEvaluationView } from '@/lib/useRecommendation';
import type { WeeklyMilestone, WeeklyPlan } from '@/lib/data';

type Status = WeeklyMilestone['status'];

const STATUS_META: Record<Status, { label: string; tone: 'green' | 'orange' | 'neutral' | 'primary' }> = {
  done: { label: 'Đạt mốc', tone: 'green' },
  missed: { label: 'Lệch mốc', tone: 'orange' },
  active: { label: 'Đang diễn ra', tone: 'primary' },
  upcoming: { label: 'Sắp tới', tone: 'neutral' },
};

/**
 * The long-term goal, split into weeks.
 *
 * The point of this table is that a far-off target becomes a dated checkpoint
 * you can pass or miss one week at a time, and a finished week keeps the verdict
 * it had at the time rather than being silently recomputed.
 */
export default function WeeklyPlanTable({
  plan,
  milestones,
  evaluation,
  loading,
  onRegenerate,
  currentDate,
}: {
  plan: WeeklyPlan | null;
  milestones: WeeklyMilestone[];
  evaluation: PlanEvaluationView | null;
  loading?: boolean;
  onRegenerate?: () => Promise<void> | void;
  currentDate: string;
}) {
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonRows rows={2} cols={4} />
        <SkeletonRows rows={6} cols={7} />
      </div>
    );
  }

  if (!plan || !evaluation) {
    return (
      <EmptyState
        icon={<CalendarRange />}
        title="Chưa lập được kế hoạch tuần"
        description="Cần cân nặng hiện tại, cân nặng mục tiêu và tốc độ thay đổi mỗi tuần trong hồ sơ. Sau đó hệ thống chia mục tiêu thành từng mốc 7 ngày."
        action={
          <Button variant="utility" href="/profile" icon={<ArrowUpRight />}>
            Điền hồ sơ
          </Button>
        }
      />
    );
  }

  async function handleRegenerate() {
    if (!onRegenerate) return;
    setBusy(true);
    try {
      await onRegenerate();
    } finally {
      setBusy(false);
    }
  }

  const goingDown = plan.target_weight_kg < plan.start_weight_kg;
  const totalChange = Math.round((plan.target_weight_kg - plan.start_weight_kg) * 100) / 100;
  const progressPct =
    Math.abs(totalChange) > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((evaluation.expectedNowKg !== null
                ? Math.abs(evaluation.expectedNowKg - plan.start_weight_kg)
                : 0) /
                Math.abs(totalChange)) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Where the goal stands right now */}
      <section aria-labelledby="plan-summary" className="space-y-5">
        <SectionHead
          title={<span id="plan-summary">Mục tiêu dài hạn chia theo tuần</span>}
          meta={`${plan.start_weight_kg} kg → ${plan.target_weight_kg} kg · ${formatDecimal(
            Math.abs(plan.weekly_rate_kg),
          )} kg mỗi tuần · ${evaluation.targetDates} tuần`}
          action={
            onRegenerate ? (
              <Button
                variant="utility"
                size="sm"
                icon={<RefreshCw className={busy ? 'animate-spin' : undefined} />}
                onClick={handleRegenerate}
                disabled={busy}
              >
                {busy ? 'Đang tạo lại...' : 'Tạo lại kế hoạch'}
              </Button>
            ) : null
          }
        />

        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <div>
              <dt className="text-[12px] font-medium text-ink-faint">Tổng thay đổi cần đạt</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="font-metric text-heading-3 leading-none text-ink">
                  {totalChange > 0 ? '+' : ''}
                  {formatDecimal(totalChange)} kg
                </span>
                {goingDown ? (
                  <TrendingDown className="h-4 w-4 text-sticker-teal" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-sticker-orange" />
                )}
              </dd>
              <dd className="mt-1.5 text-[12px] text-ink-muted">
                Mốc hiện tại: {evaluation.expectedNowKg ?? plan.start_weight_kg} kg
              </dd>
            </div>

            <div>
              <dt className="text-[12px] font-medium text-ink-faint">Lệch so với kế hoạch</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={cx(
                    'font-metric text-heading-3 leading-none',
                    evaluation.varianceKg === null
                      ? 'text-ink-faint'
                      : Math.sign(evaluation.varianceKg) === Math.sign(totalChange)
                        ? 'text-sticker-orange-deep'
                        : 'text-sticker-green-ink',
                  )}
                >
                  {evaluation.varianceKg === null
                    ? '—'
                    : `${evaluation.varianceKg > 0 ? '+' : ''}${formatDecimal(evaluation.varianceKg)} kg`}
                </span>
                {evaluation.varianceKg !== null ? (
                  Math.sign(evaluation.varianceKg) === Math.sign(totalChange) ? (
                    <ArrowUpRight className="h-4 w-4 text-sticker-orange-deep" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-sticker-green-ink" />
                  )
                ) : null}
              </dd>
              <dd className="mt-1.5 text-[12px] text-ink-muted">
                {evaluation.varianceKg === null
                  ? 'Chưa có lần cân nào để so'
                  : Math.sign(evaluation.varianceKg) === Math.sign(totalChange)
                    ? 'Đang chậm hơn mốc tuần này'
                    : 'Đang nhanh hơn mốc tuần này'}
              </dd>
            </div>

            <div>
              <dt className="text-[12px] font-medium text-ink-faint">Tốc độ thực đo (14 ngày)</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="font-metric text-heading-3 leading-none text-ink">
                  {evaluation.actualRateKgPerWeek === null
                    ? '—'
                    : `${evaluation.actualRateKgPerWeek > 0 ? '+' : ''}${formatDecimal(
                        evaluation.actualRateKgPerWeek,
                        2,
                      )}`}
                </span>
                <span className="text-[12px] text-ink-faint">kg/tuần</span>
              </dd>
              <dd className="mt-1.5 text-[12px] text-ink-muted">
                Kế hoạch cần {formatDecimal(Math.abs(plan.weekly_rate_kg))} kg/tuần
              </dd>
            </div>

            <div>
              <dt className="text-[12px] font-medium text-ink-faint">Tiến độ mốc</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="font-metric text-heading-3 leading-none text-ink">
                  {evaluation.done}
                  <span className="text-ink-faint">/{evaluation.elapsed}</span>
                </span>
                {evaluation.missed > 0 ? (
                  <span className="text-[12px] text-sticker-orange-deep">
                    lệch {evaluation.missed} tuần
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-sticker-green" />
                )}
              </dd>
              <dd className="mt-1.5 text-[12px] text-ink-muted">
                Còn {evaluation.weeksRemaining} tuần sau tuần hiện tại
              </dd>
            </div>
          </dl>

          {/* Overall progress along the goal, not a target-vs-actual scoreboard */}
          <div className="mt-5 border-t border-hairline-soft pt-4">
            <div className="flex items-center justify-between text-[12px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
                Đã đi được {progressPct}% chặng đường
              </span>
              <span className="font-metric">
                {evaluation.expectedNowKg ?? plan.start_weight_kg} / {plan.target_weight_kg} kg
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden r-chip bg-hairline-soft">
              <div
                className={cx('h-full r-chip', goingDown ? 'bg-sticker-teal' : 'bg-sticker-orange')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {evaluation.behindSchedule ? (
            <p className="mt-4 flex items-start gap-2 r-card border border-bad-line bg-bad-surface px-3 py-2.5 text-[13px] text-ink">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-bad" />
              <span>
                Tốc độ thực đo đang chậm hơn kế hoạch. Kiểm tra lại calo nạp trung bình và số bước
                chân, hoặc chạy đánh giá Adaptive TDEE để điều chỉnh hạn mức.
              </span>
            </p>
          ) : null}
        </Card>
      </section>

      {/* The week-by-week ladder */}
      <section aria-labelledby="plan-table" className="space-y-5">
        <SectionHead
          title={<span id="plan-table">Bảng mốc từng tuần</span>}
          meta={`Bắt đầu ${plan.start_date} · tạo ngày ${plan.created_at} · đơn vị kg`}
        />

        <div className="card overflow-hidden">
          <div className="max-h-[560px] overflow-auto">
            <table className="db-table min-w-[860px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Tuần</th>
                  <th>Khoảng ngày</th>
                  <th className="text-right">Mốc cần đạt</th>
                  <th className="text-right">Chênh lệch</th>
                  <th className="text-right">Calo mục tiêu</th>
                  <th className="text-right">Cân thực tế</th>
                  <th className="text-right">Lệch</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => {
                  const meta = STATUS_META[m.status];
                  const isCurrent = m.status === 'active';
                  return (
                    <tr key={m.week} className={isCurrent ? 'bg-primary-soft/50' : undefined}>
                      <td className="font-metric font-semibold text-ink">Tuần {m.week}</td>
                      <td className="whitespace-nowrap font-metric text-ink-muted">
                        {formatDateShort(m.start_date)} → {formatDateShort(m.end_date)}
                      </td>
                      <td className="text-right font-metric font-semibold text-ink">
                        {m.target_weight_kg} kg
                      </td>
                      <td className="text-right font-metric text-ink-muted">
                        {m.delta_kg > 0 ? '+' : ''}
                        {formatDecimal(m.delta_kg, 2)} kg
                      </td>
                      <td className="text-right font-metric text-ink-muted">
                        {formatNumber(m.target_calories)} kcal
                      </td>
                      <td className="text-right font-metric">
                        {m.actual_weight_kg !== undefined ? (
                          `${m.actual_weight_kg} kg`
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="text-right font-metric">
                        {m.variance_kg === undefined ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <span
                            className={cx(
                              Math.abs(m.variance_kg) <= 0.3
                                ? 'text-sticker-green-ink'
                                : 'text-sticker-orange-deep',
                            )}
                          >
                            {m.variance_kg > 0 ? '+' : ''}
                            {formatDecimal(m.variance_kg, 2)} kg
                          </span>
                        )}
                      </td>
                      <td>
                        <Pill tone={meta.tone}>
                          {m.status === 'done' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : m.status === 'missed' ? (
                            <TriangleAlert className="h-3 w-3" />
                          ) : m.status === 'active' ? (
                            <Target className="h-3 w-3" />
                          ) : (
                            <MinusCircle className="h-3 w-3" />
                          )}
                          {meta.label}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[12px] leading-relaxed text-ink-muted">
          Mốc của mỗi tuần được chốt bằng cân nặng trung bình trong khoảng ±4 ngày quanh ngày kết
          thúc tuần, và sai số cho phép là ±0,3 kg. Tuần không có lần cân nào được coi là chưa đủ
          dữ liệu để kết luận, không bị tính là trượt mốc.
        </p>
      </section>
    </div>
  );
}
