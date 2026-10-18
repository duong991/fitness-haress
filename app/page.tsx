'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Dumbbell,
  Flame,
  ArrowUpRight,
  ClipboardList,
  Plus,
  Scale,
  TrendingDown,
  UserRound,
  Utensils,
  Trash2,
} from 'lucide-react';
import { DailyLog, Profile } from '@/lib/data';
import { isProfileReady } from '@/lib/profile';
import {
  formatDateLong,
  formatDecimal,
  formatNumber,
  relativeDayLabel,
  shiftDay,
  TODAY,
} from '@/lib/format';
import QuickFoodModal from '@/components/QuickFoodModal';
import QuickWorkoutModal from '@/components/QuickWorkoutModal';
import TodayPlanCard from '@/components/TodayPlanCard';
import StepsCard from '@/components/StepsCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadError from '@/components/ui/LoadError';
import { getJson } from '@/lib/fetchJson';
import { Card, EmptyState, Meter, Pill, SectionHead, SkeletonRows, type StickerTone } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { DateSwitcher, PageHeader } from '@/components/ui/PageHeader';
import TrendCharts from '@/components/TrendCharts';
import { useRecommendation } from '@/lib/useRecommendation';

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  /* The recommendation engine runs server-side (it reads the JSON store), so the
     screen consumes one payload instead of recomputing the maths twice. */
  const {
    data: recommendation,
    loading: recommendationLoading,
  } = useRecommendation(currentDate);

  const loadData = useCallback(() => {
    setLoadError(false);
    getJson<DailyLog>(`/api/daily/${currentDate}`)
      .then(setDailyLog)
      .catch(() => setLoadError(true));

    getJson<DailyLog[]>('/api/daily')
      .then(setAllLogs)
      .catch(() => setAllLogs([]));

    getJson<Profile>('/api/profile')
      .then((data) => {
        setProfile(data);
        setNewWeight((prev) => prev || String(data.current_weight_kg));
      })
      .catch(() => setLoadError(true));
  }, [currentDate]);

  useEffect(() => {
    loadData();
    const onUpdated = () => loadData();
    window.addEventListener('fitness-data-updated', onUpdated);
    return () => window.removeEventListener('fitness-data-updated', onUpdated);
  }, [loadData]);

  async function handleSaveWeight() {
    if (!dailyLog || !newWeight) return;
    const weight = Number.parseFloat(newWeight);
    if (Number.isNaN(weight)) return;

    setSavingWeight(true);
    try {
      await fetch(`/api/daily/${currentDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dailyLog, weight_kg: weight }),
      });

      if (profile) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profile, current_weight_kg: weight }),
        });
      }

      setIsWeightModalOpen(false);
      loadData();
      window.dispatchEvent(new CustomEvent('fitness-data-updated'));
    } finally {
      setSavingWeight(false);
    }
  }

  async function persistLog(next: DailyLog) {
    await fetch(`/api/daily/${currentDate}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    loadData();
  }

  async function handleDeleteMealItem(mealId: string, itemIdx: number) {
    if (!dailyLog) return;
    const next = structuredClone(dailyLog);
    const meal = next.meals.find((m) => m.id === mealId);
    if (!meal) return;
    meal.items.splice(itemIdx, 1);
    if (meal.items.length === 0) {
      next.meals = next.meals.filter((m) => m.id !== mealId);
    }
    await persistLog(next);
  }

  async function handleDeleteWorkoutSet(exIdx: number, setIdx: number) {
    if (!dailyLog?.workout) return;
    const next = structuredClone(dailyLog);
    next.workout.exercises[exIdx].sets.splice(setIdx, 1);
    if (next.workout.exercises[exIdx].sets.length === 0) {
      next.workout.exercises.splice(exIdx, 1);
    }
    if (next.workout.exercises.length === 0) {
      next.workout.completed = false;
    }
    await persistLog(next);
  }

  if (loadError && (!dailyLog || !profile)) {
    return <LoadError onRetry={loadData} />;
  }

  if (!dailyLog || !profile) {
    return (
      <div className="space-y-8">
        <div className="h-[168px] animate-pulse r-well bg-night/20" />
        <SkeletonRows rows={3} cols={4} />
        <SkeletonRows rows={4} cols={6} />
      </div>
    );
  }

  const calConsumed = dailyLog.calories_consumed || 0;
  const calTarget = dailyLog.calories_target || profile.target_calories || 0;
  const calRemaining = calTarget - calConsumed;
  const calPct = calTarget > 0 ? Math.min(100, Math.round((calConsumed / calTarget) * 100)) : 0;
  const overBudget = calConsumed > calTarget;
  /* Prefer the recommendation engine's adjusted target when it has one. */
  const recTarget = recommendation?.energy.ready
    ? recommendation.energy.adjustedTarget
    : calTarget;
  const recRemaining = recTarget - calConsumed;

  const macros = [
    {
      key: 'protein',
      label: 'Protein',
      vietnamese: 'Đạm',
      consumed: dailyLog.macros?.protein_g || 0,
      target: profile.macros_target.protein_g || 0,
      tone: 'teal' as StickerTone,
      chip: 'text-sticker-teal bg-sticker-teal-soft',
      fill: 'bg-sticker-teal',
    },
    {
      key: 'carbs',
      label: 'Carbs',
      vietnamese: 'Tinh bột',
      consumed: dailyLog.macros?.carbs_g || 0,
      target: profile.macros_target.carbs_g || 0,
      tone: 'orange' as StickerTone,
      chip: 'text-sticker-orange-deep bg-sticker-orange-soft',
      fill: 'bg-sticker-orange',
    },
    {
      key: 'fat',
      label: 'Fat',
      vietnamese: 'Chất béo',
      consumed: dailyLog.macros?.fat_g || 0,
      target: profile.macros_target.fat_g || 0,
      tone: 'brown' as StickerTone,
      chip: 'text-sticker-brown bg-sticker-brown-soft',
      fill: 'bg-sticker-brown',
    },
  ];

  const workouts = dailyLog.workout;
  const hasWorkout = Boolean(workouts?.completed && workouts.exercises.length > 0);
  const hasMeals = Boolean(dailyLog.meals && dailyLog.meals.length > 0);

  return (
    <div className="space-y-10 pb-8">
      <PageHeader
        title="Nhật ký hôm nay"
        description="Ghi bữa ăn, set tập và cân nặng vào đúng file ngày. Mọi con số dưới đây đọc trực tiếp từ data/daily."
        actions={
          <>
            <DateSwitcher date={currentDate} onChange={setCurrentDate} />
            <Button
              variant="primary"
              icon={<Plus />}
              onClick={() => setIsFoodModalOpen(true)}
            >
              Thêm bữa ăn
            </Button>
          </>
        }
      />

      {/* ── Profile intake prompt: the store holds no invented numbers ─── */}
      {!isProfileReady(profile) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 r-card border border-dashed border-hairline bg-surface px-4 py-3">
          <div className="flex items-start gap-2.5">
            <UserRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-faint" />
            <p className="text-[13px] text-ink-muted">
              Hồ sơ đang trống nên chưa có TDEE, calo mục tiêu hay macro thật. Nhắn cho Coach
              thông tin cơ thể và mục tiêu của bạn, hoặc tự điền ở trang Hồ sơ.
            </p>
          </div>
          <Link href="/profile">
            <Button variant="utility" size="sm" icon={<ArrowUpRight />}>
              Điền hồ sơ
            </Button>
          </Link>
        </div>
      ) : null}

      {/* ── The single inverted "night" band for this page ─────────────── */}
      {/* The band and the suggestion below must quote the same number, so the
          band's remaining figure comes from the same engine that adjusts for
          today's movement. */}
      <NightBand
        remaining={recRemaining}
        overBudget={recRemaining < 0}
        consumed={calConsumed}
        target={recTarget}
        progress={calPct}
        dateLabel={formatDateLong(currentDate)}
        relative={relativeDayLabel(currentDate)}
        onLogWorkout={() => setIsWorkoutModalOpen(true)}
      />

      {/* ── Notion property strip ──────────────────────────────────────── */}
      <section aria-label="Thuộc tính ngày" className="border-y border-hairline py-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <PropertyRow
            icon={CalendarDays}
            label="Ngày theo dõi"
            value={formatDateLong(currentDate)}
            meta={`ISO ${currentDate}`}
          />
          <PropertyRow
            icon={Scale}
            label="Cân nặng"
            value={dailyLog.weight_kg ? `${dailyLog.weight_kg} kg` : 'Chưa ghi'}
            meta={
              dailyLog.weight_kg
                ? `Mục tiêu ${profile.target_weight_kg} kg`
                : 'Cân buổi sáng để TDEE chính xác hơn'
            }
            action={
              <Button
                variant="utility"
                size="sm"
                icon={<Plus />}
                onClick={() => setIsWeightModalOpen(true)}
              >
                Ghi
              </Button>
            }
          />
          <PropertyRow
            icon={TrendingDown}
            label="Mục tiêu"
            value={
              !isProfileReady(profile)
                ? 'Chưa thiết lập'
                : profile.goal_type === 'cut'
                  ? 'Cắt mỡ'
                  : profile.goal_type === 'bulk'
                    ? 'Tăng cơ'
                    : 'Recomp'
            }
            meta={
              isProfileReady(profile)
                ? `${profile.weekly_target_rate_kg} kg / tuần · ${profile.split_name ?? ''}`
                : 'Điền hồ sơ để Coach tính mục tiêu'
            }
            action={<Pill tone="orange">Cut</Pill>}
          />
          <PropertyRow
            icon={Flame}
            label="Adaptive TDEE"
            value={`${formatNumber(profile.current_tdee)} kcal`}
            meta={`Thâm hụt ${formatNumber(profile.current_tdee - calTarget)} kcal / ngày`}
            action={
              <Link
                href="/tdee"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-active"
              >
                Chi tiết <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        </dl>
      </section>

      {/* ── What to do today: session, food budget, movement ───────────── */}
      <section aria-labelledby="today-recommendation" className="space-y-5">
        <SectionHead
          title={<span id="today-recommendation">Đề xuất cho hôm nay</span>}
          meta="Buổi tập kế tiếp theo vòng xoay giáo án, hạn mức ăn sau khi tính vận động, và mục tiêu bước chân."
          action={
            <Link
              href="/plan"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-active"
            >
              Kế hoạch tuần <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <TodayPlanCard
            workout={recommendation?.workout ?? null}
            energy={recommendation?.energy ?? null}
            loading={recommendationLoading}
            onLogWorkout={() => setIsWorkoutModalOpen(true)}
            onLogFood={() => setIsFoodModalOpen(true)}
          />
          <StepsCard date={currentDate} steps={recommendation?.steps ?? null} />
        </div>
      </section>

      {/* ── Energy & macro tiles ───────────────────────────────────────── */}
      <section aria-labelledby="energy-heading" className="space-y-5">
        <SectionHead
          title={<span id="energy-heading">Tiến trình năng lượng &amp; macro</span>}
          meta={
            overBudget
              ? `Đã vượt ${formatNumber(Math.abs(calRemaining))} kcal so với mục tiêu ${formatNumber(calTarget)} kcal.`
              : `Còn lại ${formatNumber(calRemaining)} kcal trên mục tiêu ${formatNumber(calTarget)} kcal.`
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Calorie tile: the one tile with a filled head band, because it is
              the primary metric of the whole screen. */}
          <Card tone={overBudget ? 'orange' : 'primary'} bandHeight={38} bandLabel="Calo" className="flex flex-col">
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="flex items-baseline gap-1.5">
                <span className="font-metric text-heading-2 leading-none text-ink">
                  {formatNumber(calConsumed)}
                </span>
                <span className="font-metric text-[13px] text-ink-faint">
                  / {formatNumber(calTarget)}
                </span>
              </p>
              <Meter
                value={calConsumed}
                max={calTarget}
                label="Calo nạp so với mục tiêu"
                fillClassName={overBudget ? 'bg-sticker-orange' : 'bg-primary'}
              />
              <p className="mt-auto text-[12px] text-ink-muted">
                {overBudget
                  ? `Vượt ${formatNumber(Math.abs(calRemaining))} kcal`
                  : `Còn ${formatNumber(calRemaining)} kcal`}
                <span className="text-ink-faint"> · {calPct}% mục tiêu</span>
              </p>
            </div>
          </Card>

          {macros.map((m) => {
            const remaining = Math.round((m.target - m.consumed) * 10) / 10;
            const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;

            return (
              <Card key={m.key} className="flex flex-col">
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink">
                      {m.label}
                      <span className="ml-1.5 font-normal text-ink-faint">{m.vietnamese}</span>
                    </p>
                    <span className={`r-chip px-2 py-[3px] text-[11px] font-semibold ${m.chip}`}>
                      {pct}%
                    </span>
                  </div>

                  <p className="flex items-baseline gap-1.5">
                    <span className="font-metric text-heading-3 leading-none text-ink">
                      {formatDecimal(m.consumed)}
                    </span>
                    <span className="font-metric text-[13px] text-ink-faint">
                      / {formatNumber(m.target)} g
                    </span>
                  </p>

                  <Meter
                    value={m.consumed}
                    max={m.target}
                    label={`${m.label} so với mục tiêu`}
                    fillClassName={m.fill}
                  />

                  <p className="mt-auto text-[12px] text-ink-muted">
                    {remaining > 0 ? `Còn thiếu ${formatDecimal(remaining)} g` : 'Đã đạt mục tiêu'}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Meals database view ────────────────────────────────────────── */}
      <section aria-labelledby="meals-heading" className="space-y-4">
        <SectionHead
          title={<span id="meals-heading">Bữa ăn trong ngày</span>}
          meta={`${dailyLog.meals?.length || 0} bữa · ${formatNumber(calConsumed)} kcal đã ghi`}
          action={
            <Button variant="utility" size="sm" icon={<Plus />} onClick={() => setIsFoodModalOpen(true)}>
              Thêm món
            </Button>
          }
        />

        {hasMeals ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="db-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Bữa ăn / Món</th>
                    <th>Khối lượng</th>
                    <th className="text-right">Calo</th>
                    <th className="text-right">Protein</th>
                    <th className="text-right">Carbs</th>
                    <th className="text-right">Fat</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                {dailyLog.meals.map((meal) => {
                  const cals = meal.items.reduce((s, i) => s + i.calories, 0);
                  const p = Math.round(meal.items.reduce((s, i) => s + i.protein_g, 0) * 10) / 10;
                  const c = Math.round(meal.items.reduce((s, i) => s + i.carbs_g, 0) * 10) / 10;
                  const f = Math.round(meal.items.reduce((s, i) => s + i.fat_g, 0) * 10) / 10;

                  return (
                    <tbody key={meal.id}>
                      <tr className="group-row">
                        <td>
                          <span className="flex items-center gap-2">
                            <Utensils className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
                            {meal.name}
                            <span className="font-metric text-[11px] font-normal text-ink-faint">
                              {meal.time}
                            </span>
                          </span>
                        </td>
                        <td className="text-[11px] text-ink-faint">
                          {meal.items.length} món
                        </td>
                        <td className="text-right font-metric font-semibold">{formatNumber(cals)}</td>
                        <td className="text-right font-metric text-sticker-teal">{formatDecimal(p)}g</td>
                        <td className="text-right font-metric text-sticker-orange-deep">{formatDecimal(c)}g</td>
                        <td className="text-right font-metric text-sticker-brown">{formatDecimal(f)}g</td>
                        <td />
                      </tr>
                      {meal.items.map((item, idx) => (
                        <tr key={`${meal.id}-${idx}`}>
                          <td className="pl-9 text-ink">{item.name}</td>
                          <td className="font-metric text-ink-muted">{item.amount_g}g</td>
                          <td className="text-right font-metric">{formatNumber(item.calories)}</td>
                          <td className="text-right font-metric text-sticker-teal">
                            {formatDecimal(item.protein_g)}g
                          </td>
                          <td className="text-right font-metric text-sticker-orange-deep">
                            {formatDecimal(item.carbs_g)}g
                          </td>
                          <td className="text-right font-metric text-sticker-brown">
                            {formatDecimal(item.fat_g)}g
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteMealItem(meal.id, idx)}
                              aria-label={`Xóa ${item.name}`}
                              className="row-action inline-flex h-7 w-7 items-center justify-center r-row text-ink-faint transition-colors hover:bg-canvas hover:text-bad"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Utensils />}
            title="Chưa có bữa ăn nào cho ngày này"
            description="Nhập tên món kèm số gram, hệ thống sẽ tự tra bảng dinh dưỡng và cộng dồn macro vào file ngày."
            action={
              <Button variant="primary" icon={<Plus />} onClick={() => setIsFoodModalOpen(true)}>
                Thêm bữa ăn
              </Button>
            }
          />
        )}
      </section>

      {/* ── Workout database view ──────────────────────────────────────── */}
      <section aria-labelledby="workout-heading" className="space-y-4">
        <SectionHead
          title={<span id="workout-heading">Buổi tập gym hôm nay</span>}
          meta={
            hasWorkout
              ? `${workouts?.session_name ?? 'Buổi tập'} · ${workouts?.duration_minutes ?? 0} phút · tổng volume ${formatNumber(workouts?.total_volume_kg ?? 0)} kg`
              : 'Chưa ghi set nào cho ngày này'
          }
          action={
            <Button variant="utility" size="sm" icon={<Plus />} onClick={() => setIsWorkoutModalOpen(true)}>
              Thêm set
            </Button>
          }
        />

        {hasWorkout && workouts ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="db-table min-w-[680px]">
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th className="text-right">Mức tạ</th>
                    <th className="text-right">Reps</th>
                    <th className="text-right">RPE</th>
                    <th className="text-right">Volume set</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                {workouts.exercises.map((ex, exIdx) => (
                  <tbody key={`${ex.exercise_id}-${exIdx}`}>
                    <tr className="group-row">
                      <td>
                        <span className="flex items-center gap-2">
                          <Dumbbell className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
                          {ex.exercise_name}
                        </span>
                      </td>
                      <td colSpan={4} className="text-[11px] font-normal text-ink-faint">
                        {ex.sets.length} set hoàn thành
                      </td>
                      <td />
                    </tr>
                    {ex.sets.map((set, sIdx) => (
                      <tr key={`${exIdx}-${sIdx}`}>
                        <td className="pl-9 text-ink-muted">Set {set.set_number}</td>
                        <td className="text-right font-metric font-semibold text-ink">
                          {set.weight_kg} kg
                        </td>
                        <td className="text-right font-metric">{set.reps}</td>
                        <td className="text-right font-metric text-ink-muted">
                          {set.rpe ? `RPE ${set.rpe}` : '—'}
                        </td>
                        <td className="text-right font-metric">
                          {formatNumber(set.weight_kg * set.reps)} kg
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkoutSet(exIdx, sIdx)}
                            aria-label={`Xóa set ${set.set_number} của ${ex.exercise_name}`}
                            className="row-action inline-flex h-7 w-7 items-center justify-center r-row text-ink-faint transition-colors hover:bg-canvas hover:text-bad"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardList />}
            title="Chưa ghi set tập nào cho ngày này"
            description="Mỗi set lưu set number, mức tạ, số reps và RPE. Hệ thống tự so với kỷ lục để cập nhật PR."
            action={
              <Button variant="utility" icon={<Plus />} onClick={() => setIsWorkoutModalOpen(true)}>
                Ghi set tập
              </Button>
            }
          />
        )}
      </section>

      {/* ── 7-day trend ────────────────────────────────────────────────── */}
      <TrendCharts
        logs={allLogs.filter((l) => l.date <= currentDate).slice(-7)}
        targetCalories={profile.target_calories}
      />

      {/* ── Weight modal ───────────────────────────────────────────────── */}
      <Modal
        open={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Ghi nhận cân nặng"
        description="Cân vào buổi sáng sau khi thức dậy để dữ liệu Adaptive TDEE có độ chính xác cao nhất."
        size="sm"
        icon={<Scale />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsWeightModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveWeight}
              disabled={savingWeight || !newWeight}
            >
              {savingWeight ? 'Đang lưu...' : 'Lưu cân nặng'}
            </Button>
          </>
        }
      >
        <TextField
          label="Cân nặng hôm nay (kg)"
          type="number"
          step="0.1"
          inputMode="decimal"
          autoFocus
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          hint={`Lần ghi gần nhất: ${profile.current_weight_kg} kg`}
        />
      </Modal>

      <QuickFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />

      <QuickWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}

/**
 * The one inverted band on the page: deep indigo "night", a sticker
 * constellation, and the single most important number in the product.
 * Elevation here comes from illustration and light, not from shadow.
 */
function NightBand({
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

  /* Sticker constellation: fixed coordinates so it renders identically on the
     server and the client. Decorative only, and hidden from assistive tech. */
  const stickers = [
    { left: '6%', top: '22%', size: 12, color: 'var(--sticker-purple)' },
    { left: '13%', top: '68%', size: 8, color: 'var(--sticker-sky)' },
    { left: '24%', top: '14%', size: 7, color: 'var(--sticker-pink)' },
    { left: '38%', top: '82%', size: 9, color: 'var(--sticker-teal)' },
    { left: '52%', top: '10%', size: 6, color: 'var(--sticker-green)' },
    { left: '63%', top: '74%', size: 11, color: 'var(--sticker-purple)' },
    { left: '78%', top: '18%', size: 7, color: 'var(--sticker-orange)' },
    { left: '88%', top: '62%', size: 9, color: 'var(--sticker-sky)' },
    { left: '94%', top: '30%', size: 6, color: 'var(--sticker-pink)' },
  ];

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
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {stickers.map((s, i) => (
          <span
            key={i}
            className="absolute r-chip"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 14px ${s.color}`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

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

/** One row of the Notion-style property list. */
function PropertyRow({
  icon: Icon,
  label,
  value,
  meta,
  action,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </dt>
        <dd className="mt-1 truncate font-metric text-[15px] font-semibold text-ink">{value}</dd>
        {meta ? <dd className="mt-0.5 truncate text-[12px] text-ink-muted">{meta}</dd> : null}
      </div>
      {action ? <div className="flex-shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
