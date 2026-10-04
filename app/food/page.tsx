'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coffee, Moon, Plus, Sandwich, Sun, Trash2, Utensils } from 'lucide-react';
import { DailyLog, Meal, Profile } from '@/lib/data';
import { formatDecimal, formatNumber, relativeDayLabel, TODAY } from '@/lib/format';
import QuickFoodModal from '@/components/QuickFoodModal';
import Button from '@/components/ui/Button';
import { Card, EmptyState, Meter, SectionHead, SkeletonRows, type StickerTone } from '@/components/ui/Card';
import { DateSwitcher, PageHeader } from '@/components/ui/PageHeader';

const MEAL_ICON: Record<string, typeof Coffee> = {
  'Bữa sáng': Coffee,
  'Bữa trưa': Sun,
  'Bữa xế': Sandwich,
  'Bữa tối': Moon,
};

/* Decorative only: a meal slot gets a sticker tone so the four groups read
   apart at a glance. These never paint a button or a progress fill. */
const MEAL_TONE: Record<string, StickerTone> = {
  'Bữa sáng': 'orange',
  'Bữa trưa': 'sky',
  'Bữa xế': 'purple',
  'Bữa tối': 'teal',
};

export default function FoodPage() {
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadData = useCallback(() => {
    fetch(`/api/daily/${currentDate}`)
      .then((res) => res.json())
      .then(setDailyLog)
      .catch(() => setDailyLog(null));

    fetch('/api/profile')
      .then((res) => res.json())
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [currentDate]);

  useEffect(() => {
    loadData();
    const onUpdated = () => loadData();
    window.addEventListener('fitness-data-updated', onUpdated);
    return () => window.removeEventListener('fitness-data-updated', onUpdated);
  }, [loadData]);

  async function handleDeleteItem(mealId: string, itemIdx: number) {
    if (!dailyLog) return;
    setDeletingKey(`${mealId}-${itemIdx}`);
    try {
      const next: DailyLog = structuredClone(dailyLog);
      const meal = next.meals.find((m) => m.id === mealId);
      if (!meal) return;
      meal.items.splice(itemIdx, 1);
      if (meal.items.length === 0) {
        next.meals = next.meals.filter((m) => m.id !== mealId);
      }
      await fetch(`/api/daily/${currentDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      loadData();
    } finally {
      setDeletingKey(null);
    }
  }

  const header = (
    <PageHeader
      title="Nhật ký dinh dưỡng"
      description="Theo dõi calo nạp vào và phân tách Protein / Carbs / Fat cho từng bữa. Dữ liệu ghi trực tiếp vào data/daily."
      icon={Utensils}
      actions={
        <>
          <DateSwitcher date={currentDate} onChange={setCurrentDate} />
          <Button variant="primary" icon={<Plus />} onClick={() => setIsModalOpen(true)}>
            Thêm bữa ăn
          </Button>
        </>
      }
    />
  );

  if (!dailyLog || !profile) {
    return (
      <div className="space-y-8">
        {header}
        <SkeletonRows rows={2} cols={4} />
        <SkeletonRows rows={4} cols={6} />
      </div>
    );
  }

  const consumed = dailyLog.calories_consumed || 0;
  const target = dailyLog.calories_target || profile.target_calories;
  const remaining = target - consumed;

  const macroCards = [
    {
      label: 'Protein',
      vietnamese: 'Đạm',
      consumed: dailyLog.macros?.protein_g || 0,
      target: profile.macros_target.protein_g,
      fill: 'bg-sticker-teal',
      text: 'text-sticker-teal',
    },
    {
      label: 'Carbs',
      vietnamese: 'Tinh bột',
      consumed: dailyLog.macros?.carbs_g || 0,
      target: profile.macros_target.carbs_g,
      fill: 'bg-sticker-orange',
      text: 'text-sticker-orange-deep',
    },
    {
      label: 'Fat',
      vietnamese: 'Chất béo',
      consumed: dailyLog.macros?.fat_g || 0,
      target: profile.macros_target.fat_g,
      fill: 'bg-sticker-brown',
      text: 'text-sticker-brown',
    },
  ];

  return (
    <div className="space-y-10 pb-8">
      {header}

      {/* Daily energy summary */}
      <section aria-labelledby="day-total" className="space-y-5">
        <SectionHead
          title={<span id="day-total">Tổng năng lượng {relativeDayLabel(currentDate).toLowerCase()}</span>}
          meta={
            remaining >= 0
              ? `Còn lại ${formatNumber(remaining)} kcal trên mục tiêu ${formatNumber(target)} kcal.`
              : `Đã vượt ${formatNumber(Math.abs(remaining))} kcal so với mục tiêu ${formatNumber(target)} kcal.`
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-[12px] font-medium text-ink-faint">Tổng calo nạp</p>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-metric text-heading-2 leading-none text-ink">
                {formatNumber(consumed)}
              </span>
              <span className="font-metric text-[13px] text-ink-faint">/ {formatNumber(target)}</span>
            </p>
            <Meter
              className="mt-3"
              value={consumed}
              max={target}
              label="Calo nạp so với mục tiêu"
              fillClassName={remaining < 0 ? 'bg-sticker-orange' : 'bg-primary'}
            />
            <p className="mt-2.5 text-[12px] text-ink-muted">kcal hôm nay</p>
          </Card>

          {macroCards.map((m) => (
            <Card key={m.label} className="p-4">
              <p className="text-[12px] font-medium text-ink-faint">
                {m.label} <span className="text-ink-faint">· {m.vietnamese}</span>
              </p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className={`font-metric text-heading-2 leading-none ${m.text}`}>
                  {formatDecimal(m.consumed)}
                </span>
                <span className="font-metric text-[13px] text-ink-faint">/ {m.target} g</span>
              </p>
              <Meter
                className="mt-3"
                value={m.consumed}
                max={m.target}
                label={`${m.label} so với mục tiêu`}
                fillClassName={m.fill}
              />
              <p className="mt-2.5 text-[12px] text-ink-muted">
                {m.target - m.consumed > 0
                  ? `Còn thiếu ${formatDecimal(m.target - m.consumed)} g`
                  : 'Đã đạt mục tiêu'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Meals, one card per slot */}
      <section aria-labelledby="meals-detail" className="space-y-5">
        <SectionHead
          title={<span id="meals-detail">Chi tiết bữa ăn</span>}
          meta={`${dailyLog.meals?.length || 0} bữa đã ghi cho ngày ${currentDate}`}
        />

        {dailyLog.meals && dailyLog.meals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {dailyLog.meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                deletingKey={deletingKey}
                onDelete={(idx) => handleDeleteItem(meal.id, idx)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Utensils />}
            title="Chưa có bữa ăn nào cho ngày này"
            description='Nhập tên món kèm số gram, ví dụ "200g ức gà, 150g cơm", hệ thống tự bóc tách calo và macro.'
            action={
              <Button variant="primary" icon={<Plus />} onClick={() => setIsModalOpen(true)}>
                Thêm bữa ăn
              </Button>
            }
          />
        )}
      </section>

      <QuickFoodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}

function MealCard({
  meal,
  deletingKey,
  onDelete,
}: {
  meal: Meal;
  deletingKey: string | null;
  onDelete: (idx: number) => void;
}) {
  const Icon = MEAL_ICON[meal.name] ?? Utensils;
  const tone = MEAL_TONE[meal.name] ?? 'neutral';
  const calories = meal.items.reduce((s, i) => s + i.calories, 0);
  const protein = meal.items.reduce((s, i) => s + i.protein_g, 0);
  const carbs = meal.items.reduce((s, i) => s + i.carbs_g, 0);
  const fat = meal.items.reduce((s, i) => s + i.fat_g, 0);

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center r-card text-white ${
              tone === 'orange'
                ? 'bg-sticker-orange'
                : tone === 'sky'
                  ? 'bg-sticker-sky'
                  : tone === 'purple'
                    ? 'bg-sticker-purple'
                    : tone === 'teal'
                      ? 'bg-sticker-teal'
                      : 'bg-hairline'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{meal.name}</p>
            <p className="font-metric text-[12px] text-ink-faint">
              {meal.time} · {meal.items.length} món
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="font-metric text-[15px] font-semibold text-ink">
            {formatNumber(calories)} kcal
          </p>
          <p className="font-metric text-[11px] text-ink-faint">
            {formatDecimal(protein)}P · {formatDecimal(carbs)}C · {formatDecimal(fat)}F
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="db-table min-w-[560px]">
          <thead>
            <tr>
              <th>Thực phẩm</th>
              <th className="text-right">Khối lượng</th>
              <th className="text-right">Calo</th>
              <th className="text-right">P</th>
              <th className="text-right">C</th>
              <th className="text-right">F</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {meal.items.map((item, idx) => (
              <tr key={`${meal.id}-${idx}`}>
                <td className="text-ink">{item.name}</td>
                <td className="text-right font-metric text-ink-muted">{item.amount_g}g</td>
                <td className="text-right font-metric font-semibold">
                  {formatNumber(item.calories)}
                </td>
                <td className="text-right font-metric text-sticker-teal">
                  {formatDecimal(item.protein_g)}
                </td>
                <td className="text-right font-metric text-sticker-orange-deep">
                  {formatDecimal(item.carbs_g)}
                </td>
                <td className="text-right font-metric text-sticker-brown">
                  {formatDecimal(item.fat_g)}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(idx)}
                    disabled={deletingKey === `${meal.id}-${idx}`}
                    aria-label={`Xóa ${item.name}`}
                    className="row-action inline-flex h-7 w-7 items-center justify-center r-row text-ink-faint transition-colors hover:bg-canvas hover:text-bad disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
