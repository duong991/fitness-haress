'use client';

import { useEffect, useState } from 'react';
import { Check, Footprints, Pencil, Target } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, Meter } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import { saveSteps, type StepsView } from '@/lib/useRecommendation';

/**
 * Step tracking for the day.
 *
 * Steps live inside the daily log (a day is one row), so this writes a partial
 * update and everything else on the day is preserved. The kcal figure shown is
 * the same credit the recommendation engine applies, never a second estimate.
 */
export default function StepsCard({
  date,
  steps,
  editable = true,
  className,
}: {
  date: string;
  steps: StepsView | null;
  editable?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [date]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  if (!steps) {
    return (
      <Card className={cx('p-4', className)}>
        <p className="text-[13px] font-semibold text-ink">Số bước chân</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Điền hồ sơ trước để hệ thống biết mục tiêu vận động và quy đổi calo cho phần đi bộ.
        </p>
      </Card>
    );
  }

  async function handleSave() {
    const value = Number.parseInt(draft.replace(/[.,\s]/g, ''), 10);
    if (!Number.isFinite(value) || value < 0) {
      setError('Nhập một số bước hợp lệ, ví dụ 8500.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ok = await saveSteps(date, value);
      if (ok) {
        setSaved(true);
        setEditing(false);
        setDraft('');
      } else {
        setError('Không lưu được số bước. Thử lại.');
      }
    } catch {
      setError('Không kết nối được máy chủ. Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  const hitTarget = steps.pct >= 100;

  return (
    <Card className={cx('flex flex-col p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center r-card bg-sticker-sky-soft text-sticker-sky-ink">
            <Footprints className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-ink">Số bước chân</p>
            <p className="text-[11px] leading-tight text-ink-faint">
              Mục tiêu {formatNumber(steps.target)} bước
            </p>
          </div>
        </div>

        {editable && !editing ? (
          <Button
            variant="utility"
            size="sm"
            icon={<Pencil />}
            onClick={() => {
              setEditing(true);
              setDraft(steps.steps > 0 ? String(steps.steps) : '');
            }}
          >
            {steps.steps > 0 ? 'Sửa' : 'Ghi'}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`steps-${date}`} className="block text-[13px] font-medium text-ink-secondary">
            Tổng số bước hôm nay
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`steps-${date}`}
              type="number"
              inputMode="numeric"
              min={0}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              placeholder="VD: 8500"
              className="w-full r-input border border-hairline bg-surface px-3 py-2 text-body-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <Button variant="primary" onClick={handleSave} disabled={saving || !draft} icon={<Check />}>
              {saving ? 'Đang lưu' : 'Lưu'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Hủy
            </Button>
          </div>
          {error ? <p className="text-[12px] text-bad">{error}</p> : null}
        </div>
      ) : (
        <>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="font-metric text-heading-2 leading-none text-ink">
              {formatNumber(steps.steps)}
            </span>
            <span className="font-metric text-[13px] text-ink-faint">
              / {formatNumber(steps.target)}
            </span>
            {hitTarget ? (
              <span className="ml-1 r-chip bg-sticker-green-soft px-2 py-[2px] text-[11px] font-semibold text-sticker-green-ink">
                Đạt
              </span>
            ) : null}
          </p>

          <Meter
            className="mt-3"
            value={steps.steps}
            max={steps.target}
            label={`Số bước so với mục tiêu ${formatNumber(steps.target)}`}
            fillClassName={hitTarget ? 'bg-sticker-green' : 'bg-sticker-sky'}
          />

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <div>
              <dt className="text-ink-faint">Đốt cháy (ước tính)</dt>
              <dd className="font-metric text-ink-secondary">~{formatNumber(steps.kcalBurned)} kcal</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Cộng vào hạn mức ăn</dt>
              <dd className="font-metric text-ink-secondary">
                {steps.kcalCredit > 0 ? `+${formatNumber(steps.kcalCredit)} kcal` : '0 kcal'}
              </dd>
            </div>
          </dl>

          {steps.steps === 0 ? (
            <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
              <Target className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-faint" strokeWidth={1.75} />
              Chưa ghi bước chân hôm nay. Nhập số từ đồng hồ hoặc điện thoại, hoặc nhắn Coach
              &ldquo;9000 bước&rdquo;.
            </p>
          ) : steps.remaining > 0 ? (
            <p className="mt-3 text-[12px] text-ink-muted">
              Còn {formatNumber(steps.remaining)} bước để chạm mục tiêu.
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-ink-muted">Đã vượt mục tiêu vận động hôm nay.</p>
          )}
        </>
      )}

      {saved ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-sticker-green-ink">
          <Check className="h-3.5 w-3.5" /> Đã lưu số bước chân vào file ngày.
        </p>
      ) : null}
    </Card>
  );
}
