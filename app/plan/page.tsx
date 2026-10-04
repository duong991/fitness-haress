'use client';

import { useCallback, useState } from 'react';
import { ArrowUpRight, CalendarRange } from 'lucide-react';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import WeeklyPlanTable from '@/components/WeeklyPlanTable';
import { formatDateLong, localIsoDate } from '@/lib/format';
import { useRecommendation } from '@/lib/useRecommendation';

/**
 * Weekly plan screen.
 *
 * Reads the same recommendation payload the dashboard uses, so the goal shown
 * here and the calories shown there can never disagree. Regenerating is an
 * explicit action because it resets past-week verdicts.
 */
export default function PlanPage() {
  const today = localIsoDate();
  const { data, loading, error, reload } = useRecommendation(today);
  const [status, setStatus] = useState<string | null>(null);

  const handleRegenerate = useCallback(async () => {
    setStatus(null);
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebuild: true }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setStatus(payload.error ?? 'Không tạo lại được kế hoạch.');
        return;
      }
      setStatus(
        `Đã tạo lại kế hoạch với ${payload.milestones?.length ?? 0} mốc tuần, tính đến hết ngày ${payload.plan?.milestones?.at(-1)?.end_date ?? ''}.`,
      );
      reload();
      window.dispatchEvent(new CustomEvent('fitness-data-updated'));
    } catch {
      setStatus('Không kết nối được máy chủ. Thử lại.');
    }
  }, [reload]);

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Kế hoạch tuần"
        description="Mục tiêu dài hạn được chia thành từng mốc 7 ngày, mỗi tuần có cân nặng cần đạt và mốc calo riêng, để tiến độ được đánh giá theo tuần thay vì chờ tới đích."
        icon={CalendarRange}
        actions={
          <Button variant="utility" href="/tdee" icon={<ArrowUpRight />}>
            Adaptive TDEE
          </Button>
        }
      />

      {error ? (
        <p className="r-card border border-bad-line bg-bad-surface px-4 py-3 text-[13px] text-ink">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="r-card border border-hairline bg-surface px-4 py-3 text-[13px] text-ink-secondary">
          {status}
        </p>
      ) : null}

      {data?.weekly.ready === false && !loading ? (
        <p className="r-card border border-dashed border-hairline bg-surface px-4 py-3 text-[13px] text-ink-muted">
          {data.weekly.blockedReason}
        </p>
      ) : null}

      <WeeklyPlanTable
        plan={data?.weekly.plan ?? null}
        milestones={data?.weekly.milestones ?? []}
        evaluation={data?.weekly.evaluation ?? null}
        loading={loading}
        onRegenerate={handleRegenerate}
        currentDate={today}
      />

      <p className="text-[12px] leading-relaxed text-ink-faint">
        Số liệu tính cho ngày {formatDateLong(today)} ({today}). Kế hoạch lưu ở{' '}
        <span className="font-metric">data/weekly_plan.json</span>, mốc calo lấy từ{' '}
        <span className="font-metric">data/profile.json</span>.
      </p>
    </div>
  );
}
