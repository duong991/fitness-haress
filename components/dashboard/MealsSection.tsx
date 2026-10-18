'use client';

import { Plus, Trash2, Utensils } from 'lucide-react';
import type { DailyLog } from '@/lib/data';
import { formatDecimal, formatNumber } from '@/lib/format';
import Button from '@/components/ui/Button';
import { EmptyState, SectionHead } from '@/components/ui/Card';

/** Meals of the selected day as a grouped table, one row per food item. */
export default function MealsSection({
  dailyLog,
  calConsumed,
  onAdd,
  onDeleteItem,
}: {
  dailyLog: DailyLog;
  calConsumed: number;
  onAdd: () => void;
  onDeleteItem: (mealId: string, itemIdx: number) => void;
}) {
  const hasMeals = Boolean(dailyLog.meals && dailyLog.meals.length > 0);

  return (
  <section aria-labelledby="meals-heading" className="space-y-4">
    <SectionHead
      title={<span id="meals-heading">Bữa ăn trong ngày</span>}
      meta={`${dailyLog.meals?.length || 0} bữa · ${formatNumber(calConsumed)} kcal đã ghi`}
      action={
        <Button variant="utility" size="sm" icon={<Plus />} onClick={onAdd}>
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
                          onClick={() => onDeleteItem(meal.id, idx)}
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
          <Button variant="primary" icon={<Plus />} onClick={onAdd}>
            Thêm bữa ăn
          </Button>
        }
      />
    )}
  </section>
  );
}
