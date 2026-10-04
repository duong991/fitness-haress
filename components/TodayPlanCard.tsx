'use client';

import Link from 'next/link';
import {
  AlarmClock,
  ArrowUpRight,
  BedDouble,
  Dumbbell,
  Footprints,
  Flame,
  Info,
  Plus,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, Pill, SkeletonRows } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import { formatDecimal, formatNumber } from '@/lib/format';
import type { EnergyRecommendationView, WorkoutRecommendationView } from '@/lib/useRecommendation';

/**
 * "So what do I do today?"
 *
 * One surface that answers with three concrete numbers: what to eat, what to
 * train, and how much to move. Every figure is computed by lib/core/recommend
 * from the JSON store; nothing here is decorative or invented.
 */
export default function TodayPlanCard({
  workout,
  energy,
  loading,
  onLogWorkout,
  onLogFood,
  className,
}: {
  workout: WorkoutRecommendationView | null;
  energy: EnergyRecommendationView | null;
  loading?: boolean;
  onLogWorkout: () => void;
  onLogFood: () => void;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cx('space-y-4', className)}>
        <SkeletonRows rows={3} cols={3} />
      </div>
    );
  }

  /* Neither engine can run without real body data. Say that once, clearly,
     instead of rendering zeroes that look like targets. */
  if (!workout?.ready || !energy?.ready) {
    return (
      <Card className={cx('p-5', className)}>
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-faint" strokeWidth={1.75} />
          <div>
            <p className="text-[15px] font-semibold text-ink">Chưa đủ dữ liệu để đề xuất</p>
            <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-muted">
              {workout?.blockedReason ??
                energy?.blockedReason ??
                'Cần thông số cơ thể, calo mục tiêu và giáo án trong hồ sơ trước khi hệ thống tính được buổi tập và hạn mức ăn cho hôm nay.'}
            </p>
            <Link href="/profile" className="mt-3 inline-block">
              <Button variant="utility" size="sm" icon={<ArrowUpRight />}>
                Điền hồ sơ
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const isRest = workout.is_rest_day;

  return (
    <Card className={cx('flex flex-col overflow-hidden', className)}>
      {/* Head: which session, and why this one */}
      <div className="border-b border-hairline px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cx(
                'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center r-card text-white',
                isRest ? 'bg-sticker-purple' : 'bg-night',
              )}
            >
              {isRest ? (
                <BedDouble className="h-[18px] w-[18px]" strokeWidth={1.75} />
              ) : (
                <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.125px] text-ink-faint">
                Đề xuất hôm nay
              </p>
              <h2 className="mt-0.5 text-title text-ink">{workout.day_name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
                {!isRest ? (
                  <Pill tone="primary">
                    Buổi {workout.day_index}/{workout.total_days}
                  </Pill>
                ) : (
                  <Pill tone="purple">Ngày nghỉ</Pill>
                )}
                {/* An override is the user's own call, so it is labelled as one. */}
                {workout.overridden ? <Pill tone="orange">Đã đổi buổi</Pill> : null}
                <span>{workout.split_name}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" icon={<Plus />} onClick={onLogWorkout}>
              Ghi set tập
            </Button>
            <Button variant="utility" size="sm" icon={<Utensils />} onClick={onLogFood}>
              Thêm bữa ăn
            </Button>
          </div>
        </div>

        <p className="mt-3 max-w-[74ch] text-[13px] leading-relaxed text-ink-muted">
          {workout.rationale}
        </p>
      </div>

      {/* Body: the three actionable numbers */}
      <div className="grid grid-cols-1 divide-y divide-hairline-soft lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        {/* 1. The session: the widest column, because exercise names wrap first */}
        <section aria-label="Buổi tập đề xuất" className="p-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Dumbbell className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
            {isRest ? 'Vận động nhẹ' : 'Buổi tập đề xuất'}
          </h3>

          {isRest ? (
            <>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                Không xếp buổi tạ nào hôm nay. Đi bộ hoặc giãn cơ nhẹ để giữ nhịp vận động, và ngủ
                đủ để buổi sau khỏe hơn.
              </p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-metric text-heading-3 leading-none text-ink">
                  {formatNumber(workout.cardio.stepsTarget)}
                </span>
                <span className="text-[13px] text-ink-faint">bước, khoảng {formatNumber(workout.cardio.kcal)} kcal</span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                <span className="flex items-center gap-1">
                  <AlarmClock className="h-3 w-3" /> ~{workout.estimated_minutes} phút
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" /> ~{formatNumber(workout.estimated_volume_kg)} kg volume
                </span>
              </p>

              <ol className="mt-3 space-y-2.5">
                {workout.items.map((item) => (
                  <li key={item.exercise_id} className="border-t border-hairline-soft pt-2.5 first:border-0 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[13px] font-medium leading-snug text-ink">
                        {item.name}
                        <span className="ml-1.5 font-normal text-ink-faint">{item.target_muscle}</span>
                      </p>
                      <span
                        className={cx(
                          'flex-shrink-0 r-chip px-2 py-[2px] text-[10px] font-semibold',
                          item.one_rm_source === 'personal_record'
                            ? 'bg-sticker-green-soft text-sticker-green-ink'
                            : 'bg-canvas text-ink-faint',
                        )}
                        title={
                          item.one_rm_source === 'personal_record'
                            ? 'Tính từ PR đã ghi'
                            : 'Ước tính theo cân nặng cơ thể, chưa có PR'
                        }
                      >
                        {item.one_rm_source === 'personal_record' ? 'PR' : 'ước tính'}
                      </span>
                    </div>
                    <p className="mt-0.5 font-metric text-[12px] text-ink-secondary">
                      {item.sets} set × {item.reps} reps · đỉnh {item.top_set_weight_kg} kg
                      {item.set_weights.length > 1 ? (
                        <span className="text-ink-faint"> ({item.set_weights.join(' / ')} kg)</span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {/* 2. Food budget, then the reasoning, stacked in the narrow column */}
        <section aria-label="Hạn mức ăn hôm nay" className="p-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Utensils className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
            Ăn bao nhiêu hôm nay
          </h3>

          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="font-metric text-heading-2 leading-none text-ink">
              {formatNumber(Math.max(0, energy.remainingToEat))}
            </span>
            <span className="text-[13px] text-ink-faint">
              kcal {energy.remainingToEat < 0 ? 'vượt' : 'còn lại'}
            </span>
          </p>

          <dl className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-faint">Mục tiêu gốc</dt>
              <dd className="font-metric text-ink-secondary">{formatNumber(energy.baseTarget)} kcal</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1 text-ink-faint">
                <Footprints className="h-3 w-3" /> Vận động cộng lại
              </dt>
              <dd className="font-metric text-ink-secondary">
                {energy.activityAdjustment > 0 ? '+' : ''}
                {formatNumber(energy.activityAdjustment)} kcal
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-hairline-soft pt-1.5">
              <dt className="font-medium text-ink-secondary">Hạn mức sau điều chỉnh</dt>
              <dd className="font-metric font-semibold text-ink">
                {formatNumber(energy.adjustedTarget)} kcal
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-faint">Đã nạp</dt>
              <dd className="font-metric text-ink-secondary">{formatNumber(energy.consumed)} kcal</dd>
            </div>
          </dl>

          {energy.remainingToEat > 0 ? (
            <div className="mt-3 border-t border-hairline-soft pt-3">
              <p className="text-[12px] text-ink-faint">Còn thiếu theo macro</p>
              <p className="mt-1 font-metric text-[13px] text-ink">
                {formatDecimal(energy.remainingMacros.protein_g)}g đạm
                <span className="text-ink-faint"> · </span>
                {formatDecimal(energy.remainingMacros.carbs_g)}g tinh bột
                <span className="text-ink-faint"> · </span>
                {formatDecimal(energy.remainingMacros.fat_g)}g béo
              </p>
            </div>
          ) : (
            <p className="mt-3 border-t border-hairline-soft pt-3 text-[12px] text-ink-muted">
              {energy.status === 'on-target'
                ? 'Đã chạm hạn mức hôm nay. Giữ nguyên và ưu tiên đạm cho bữa còn lại.'
                : 'Đã vượt hạn mức. Không cần bù bằng cách bỏ bữa, chỉ cần quay lại đúng mức vào ngày mai.'}
            </p>
          )}

          {energy.mealSuggestion ? (
            <p className="mt-3 flex items-start gap-1.5 r-card bg-canvas px-3 py-2 text-[12px] leading-snug text-ink-muted">
              <Flame className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sticker-orange" strokeWidth={1.75} />
              <span>
                Gợi ý bữa tới: khoảng{' '}
                <strong className="font-metric text-ink">
                  {formatNumber(energy.mealSuggestion.calories)} kcal
                </strong>{' '}
                ({energy.mealSuggestion.macros.protein_g}g đạm, {energy.mealSuggestion.macros.carbs_g}g
                tinh bột, {energy.mealSuggestion.macros.fat_g}g béo).
              </span>
            </p>
          ) : null}
        </section>

        {/* 3. Why these numbers */}
        <section aria-label="Cách tính đề xuất" className="bg-canvas/60 p-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Info className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
            Vì sao ra con số này
          </h3>

          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-muted">
            {energy.notes.map((note, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 r-chip bg-ink-faint" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
            {!isRest ? (
              <li className="flex gap-1.5">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 r-chip bg-ink-faint" aria-hidden />
                <span>
                  Ca tập được tính ~{formatNumber(workout.estimated_minutes)} phút, cộng lại một phần
                  calo để bù năng lượng mà không phá thâm hụt.
                </span>
              </li>
            ) : null}
            <li className="flex gap-1.5">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 r-chip bg-ink-faint" aria-hidden />
              <span>
                Mỗi mốc vận động chỉ cộng lại một nửa calo đốt thêm, vì mục tiêu calo đã bao gồm
                mức vận động nền.
              </span>
            </li>
          </ul>

          {workout.last_session ? (
            <p className="mt-3 flex items-start gap-1.5 border-t border-hairline-soft pt-3 text-[12px] text-ink-muted">
              <Trophy className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sticker-orange" strokeWidth={1.75} />
              <span>
                Buổi gần nhất: {workout.last_session.name} ({workout.last_session.date}).
              </span>
            </p>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
