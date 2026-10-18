'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChartNoAxesCombined,
  CheckCircle2,
  Info,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { Profile, TdeeHistoryEntry } from '@/lib/data';
import { formatDecimal, formatNumber } from '@/lib/format';
import Button from '@/components/ui/Button';
import LoadError from '@/components/ui/LoadError';
import { getJson } from '@/lib/fetchJson';
import { Card, EmptyState, SectionHead, SkeletonRows } from '@/components/ui/Card';
import { PageHeader, StatBlock } from '@/components/ui/PageHeader';

export default function TdeePage() {
  const [history, setHistory] = useState<TdeeHistoryEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tdee: number; target: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(() => {
    setLoadError(false);
    getJson<TdeeHistoryEntry[]>('/api/tdee')
      .then(setHistory)
      .catch(() => setHistory([]));

    getJson<Profile>('/api/profile')
      .then(setProfile)
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRunWeeklyReview() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/tdee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Đánh giá tự động định kỳ cuối tuần từ giao diện Web' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          tdee: data.entry.calculated_tdee,
          target: data.entry.recommended_target_calories,
        });
        loadData();
        window.dispatchEvent(new CustomEvent('fitness-data-updated'));
      } else {
        setError('Chưa đủ dữ liệu cân nặng để chạy đánh giá tuần.');
      }
    } catch {
      setError('Không kết nối được thuật toán Adaptive TDEE. Thử lại sau giây lát.');
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <PageHeader
      title="Adaptive TDEE"
      description="Đo mức tiêu hao năng lượng thực tế từ biến động cân nặng và calo nạp, giới hạn điều chỉnh ±100-150 kcal mỗi tuần."
      icon={ChartNoAxesCombined}
      actions={
        <Button
          variant="primary"
          icon={<RefreshCw className={loading ? 'animate-spin' : undefined} />}
          onClick={handleRunWeeklyReview}
          disabled={loading}
        >
          {loading ? 'Đang phân tích...' : 'Chạy đánh giá tuần'}
        </Button>
      }
    />
  );

  if (!profile && loadError) {
    return (
      <div className="space-y-8">
        {header}
        <LoadError onRetry={loadData} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        {header}
        <SkeletonRows rows={2} cols={4} />
        <SkeletonRows rows={3} cols={6} />
      </div>
    );
  }

  const deficit = profile.current_tdee - profile.target_calories;
  const latest = history[history.length - 1];

  return (
    <div className="space-y-10 pb-8">
      {header}

      {/* Outcome of the most recent review, inline rather than a toast. */}
      {result ? (
        <div className="flex items-start gap-2.5 r-card border border-sticker-green-line bg-sticker-green-soft px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ok" />
          <p className="text-[13px] leading-relaxed text-ink">
            Đã ghi một mốc mới vào tdee_history.json. TDEE đo được{' '}
            <strong className="font-metric">{formatNumber(result.tdee)} kcal</strong>, calo mục tiêu
            đề xuất <strong className="font-metric">{formatNumber(result.target)} kcal</strong>.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2.5 r-card border border-bad-line bg-bad-surface px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-bad" />
          <p className="text-[13px] leading-relaxed text-ink">{error}</p>
        </div>
      ) : null}

      {/* Current model */}
      <section aria-labelledby="current-model" className="space-y-5">
        <SectionHead
          title={<span id="current-model">Con số đang áp dụng</span>}
          meta={`Cập nhật lần cuối ${profile.updated_at} · giáo án ${profile.split_name ?? '—'}`}
        />

        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <StatBlock
              label="Adaptive TDEE đo được"
              value={formatNumber(profile.current_tdee)}
              unit="kcal/ngày"
              meta="Mức tiêu hao thực tế"
            />
            <StatBlock
              label="Calo mục tiêu tuần này"
              value={formatNumber(profile.target_calories)}
              unit="kcal/ngày"
              meta={
                deficit > 0
                  ? `Thâm hụt ${formatNumber(deficit)} kcal/ngày`
                  : `Thặng dư ${formatNumber(Math.abs(deficit))} kcal/ngày`
              }
            />
            <StatBlock
              label="BMR ban đầu"
              value={formatNumber(profile.initial_bmr)}
              unit="kcal"
              meta="Mifflin-St Jeor"
            />
            <StatBlock
              label="Tốc độ mục tiêu"
              value={formatDecimal(profile.weekly_target_rate_kg)}
              unit="kg/tuần"
              meta="0,5% - 0,7% trọng lượng cơ thể"
            />
          </dl>
        </Card>
      </section>

      {/* History */}
      <section aria-labelledby="history" className="space-y-5">
        <SectionHead
          title={<span id="history">Lịch sử đánh giá tuần</span>}
          meta={
            latest
              ? `${history.length} mốc đã ghi · gần nhất ${latest.week_start} → ${latest.week_end}`
              : 'Chưa có mốc đánh giá nào'
          }
        />

        {history.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="max-h-[460px] overflow-auto">
              <table className="db-table min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Giai đoạn</th>
                    <th className="text-right">Cân TB</th>
                    <th className="text-right">Biến động</th>
                    <th className="text-right">Calo nạp TB</th>
                    <th className="text-right">TDEE tính</th>
                    <th className="text-right">Đề xuất</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((entry, idx) => (
                    <tr key={`${entry.week_start}-${idx}`}>
                      <td className="whitespace-nowrap font-metric text-ink">
                        {entry.week_start} → {entry.week_end}
                      </td>
                      <td className="text-right font-metric font-semibold text-ink">
                        {entry.avg_weight_kg} kg
                      </td>
                      <td className="text-right font-metric">
                        <span
                          className={
                            entry.weight_change_kg <= 0 ? 'text-ok' : 'text-sticker-orange-deep'
                          }
                        >
                          {entry.weight_change_kg > 0 ? '+' : ''}
                          {entry.weight_change_kg} kg
                        </span>
                      </td>
                      <td className="text-right font-metric text-ink-muted">
                        {formatNumber(entry.avg_calories_in)} kcal
                      </td>
                      <td className="text-right font-metric font-semibold text-ink">
                        {formatNumber(entry.calculated_tdee)} kcal
                      </td>
                      <td className="text-right font-metric font-semibold text-primary-active">
                        {formatNumber(entry.recommended_target_calories)} kcal
                      </td>
                      <td className="max-w-[280px] text-ink-muted">{entry.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ChartNoAxesCombined />}
            title="Chưa có mốc đánh giá tuần nào"
            description="Chạy đánh giá khi đã có ít nhất 7 ngày ghi cân nặng và calo nạp liên tục để thuật toán bám đúng thực tế."
            action={
              <Button variant="primary" icon={<RefreshCw />} onClick={handleRunWeeklyReview} disabled={loading}>
                Chạy đánh giá tuần
              </Button>
            }
          />
        )}
      </section>

      {/* Method note */}
      <section aria-label="Cách thuật toán hoạt động">
        <Card className="flex gap-3.5 p-5">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-faint" strokeWidth={1.75} />
          <div className="space-y-2">
            <h2 className="text-title text-ink">Cách phá trạng thái đứng cân</h2>
            <p className="max-w-[68ch] text-body-sm leading-relaxed text-ink-muted">
              Khi thâm hụt calo kéo dài, cơ thể tự hạ mức vận động vô thức. Thuật toán đo lượng mỡ
              thực sự giải phóng theo hệ số 7.700 kcal cho mỗi kg mỡ, thay vì tin vào con số ước tính
              ban đầu. Nếu tốc độ giảm chững lại, calo mục tiêu chỉ dịch tối đa 100-150 kcal mỗi tuần
              để loại nhiễu nước và glycogen.
            </p>
            <p className="font-metric text-[12px] text-ink-faint">
              TDEE = calo nạp trung bình tuần − (biến thiên cân nặng × 7.700 / số ngày)
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
