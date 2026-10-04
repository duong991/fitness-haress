'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2, Utensils } from 'lucide-react';
import { FoodItem } from '@/lib/data';
import { cx } from '@/lib/cx';
import { formatDecimal, formatNumber } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';

interface QuickFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSuccess: () => void;
}

const MEAL_SLOTS = ['Bữa sáng', 'Bữa trưa', 'Bữa xế', 'Bữa tối'];

export default function QuickFoodModal({ isOpen, onClose, date, onSuccess }: QuickFoodModalProps) {
  const [mealName, setMealName] = useState('Bữa trưa');
  const [naturalText, setNaturalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* Reset the draft every time the sheet reopens, so a cancelled parse never
     leaks into the next meal. */
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setNaturalText('');
      setError(null);
    }
  }, [isOpen]);

  async function handleParseNaturalText() {
    if (!naturalText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: naturalText }),
      });
      const data = await res.json();
      if (data.items?.length) {
        setItems((prev) => [...prev, ...data.items]);
        setNaturalText('');
      } else {
        setError('Không nhận diện được món nào. Thử ghi rõ khối lượng, ví dụ "200g ức gà".');
      }
    } catch {
      setError('Không kết nối được bộ bóc tách dinh dưỡng. Thử lại sau giây lát.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/daily/${date}`);
      const dailyLog = await res.json();

      const newMeal = {
        id: `meal-${Date.now()}`,
        name: mealName,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        items,
      };

      await fetch(`/api/daily/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dailyLog, meals: [...(dailyLog.meals || []), newMeal] }),
      });

      onSuccess();
      onClose();
      setItems([]);
    } catch {
      setError('Không lưu được bữa ăn vào file ngày. Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  const totals = items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein_g,
      carbs: sum.carbs + item.carbs_g,
      fat: sum.fat + item.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Ghi bữa ăn"
      description={`Ngày ${date} · bóc tách calo và macro theo gram trước khi lưu.`}
      icon={<Utensils />}
      footer={
        <>
          <span className="mr-auto text-[12px] text-ink-muted">
            {items.length > 0
              ? `${items.length} món · ${formatNumber(totals.calories)} kcal`
              : 'Chưa có món nào'}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={items.length === 0 || saving}
            icon={<Plus />}
          >
            {saving ? 'Đang lưu...' : 'Lưu vào nhật ký'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Meal slot: segmented control, tighter than the surrounding pills. */}
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-secondary">Phân loại bữa</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MEAL_SLOTS.map((slot) => {
              const active = mealName === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMealName(slot)}
                  className={cx(
                    'r-utility border px-3 py-2 text-[13px] font-medium transition-colors active:scale-[0.98]',
                    active
                      ? 'border-primary bg-primary-soft text-primary-active'
                      : 'border-hairline bg-surface text-ink-muted hover:bg-canvas hover:text-ink',
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Natural-language parse: the product's signature input. */}
        <div className="r-card border border-hairline bg-canvas p-4">
          <TextField
            label="Nhập món và khối lượng"
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleParseNaturalText();
              }
            }}
            placeholder="VD: 200g ức gà, 150g cơm, 1 quả trứng"
            hint="Tra bảng dinh dưỡng nội bộ trước, sau đó mới ước tính theo chuẩn USDA."
          />
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleParseNaturalText}
              disabled={loading || !naturalText.trim()}
              icon={<Sparkles />}
            >
              {loading ? 'Đang bóc tách...' : 'Bóc tách dinh dưỡng'}
            </Button>
            {totals.calories > 0 ? (
              <span className="font-metric text-[12px] text-ink-muted">
                Tạm tính {formatNumber(totals.calories)} kcal
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="r-card border border-bad-line bg-bad-surface px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        ) : null}

        {/* Parsed lines */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-ink-secondary">
              Món đã nhận diện
              <span className="ml-2 font-metric font-normal text-ink-faint">
                {formatNumber(totals.calories)} kcal · {formatDecimal(totals.protein)}P{' '}
                {formatDecimal(totals.carbs)}C {formatDecimal(totals.fat)}F
              </span>
            </p>

            <ul className="divide-y divide-hairline-soft r-card border border-hairline">
              {items.map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{item.name}</p>
                    <p className="mt-0.5 font-metric text-[11px] text-ink-muted">
                      {item.amount_g}g ·{' '}
                      <span className="text-sticker-teal">{formatDecimal(item.protein_g)}P</span>{' '}
                      <span className="text-sticker-orange-deep">
                        {formatDecimal(item.carbs_g)}C
                      </span>{' '}
                      <span className="text-sticker-brown">{formatDecimal(item.fat_g)}F</span>
                    </p>
                  </div>
                  <span className="font-metric text-[13px] font-semibold text-ink">
                    {formatNumber(item.calories)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    aria-label={`Xóa ${item.name}`}
                    className="flex h-7 w-7 items-center justify-center r-row text-ink-faint transition-colors hover:bg-canvas hover:text-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
