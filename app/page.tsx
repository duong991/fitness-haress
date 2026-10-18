'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Flame,
  ArrowUpRight,
  Plus,
  Scale,
  TrendingDown,
  UserRound,
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
import { Card, Meter, Pill, SectionHead, SkeletonRows, type StickerTone } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { DateSwitcher, PageHeader } from '@/components/ui/PageHeader';
import TrendCharts from '@/components/TrendCharts';
import NightBand from '@/components/dashboard/NightBand';
import PropertyRow from '@/components/dashboard/PropertyRow';
import MealsSection from '@/components/dashboard/MealsSection';
import WorkoutSection from '@/components/dashboard/WorkoutSection';
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

      <MealsSection
        dailyLog={dailyLog}
        calConsumed={calConsumed}
        onAdd={() => setIsFoodModalOpen(true)}
        onDeleteItem={handleDeleteMealItem}
      />

      <WorkoutSection
        dailyLog={dailyLog}
        onAdd={() => setIsWorkoutModalOpen(true)}
        onDeleteSet={handleDeleteWorkoutSet}
      />

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
