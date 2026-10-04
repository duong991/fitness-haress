'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import type { DailyLog } from '@/lib/data';
import { formatDateShort, formatNumber } from '@/lib/format';
import { Card, EmptyState, SectionHead } from '@/components/ui/Card';

/**
 * Seven-day trend.
 *
 * Recharts keeps its own SVG, so the design system reaches it through the
 * props below: hairline grid, one accent per series, ink-ramp axes, and a
 * tooltip built on the same white card + hairline + level-1 elevation as
 * every other surface. No second chart library, no chart chrome of its own.
 */
export default function TrendCharts({
  logs,
  targetCalories,
}: {
  logs: DailyLog[];
  targetCalories: number;
}) {
  if (logs.length < 2) {
    return (
      <section className="space-y-4">
        <SectionHead title="Xu hướng 7 ngày" />
        <EmptyState
          icon={<ChartNoAxesCombined />}
          title="Chưa đủ dữ liệu để dựng biểu đồ"
          description="Cần ít nhất hai ngày có nhật ký để so sánh calo nạp và biến động cân nặng."
        />
      </section>
    );
  }

  const data = logs.map((log) => ({
    date: formatDateShort(log.date),
    calories: log.calories_consumed || 0,
    target: log.calories_target || targetCalories,
    weight: log.weight_kg ?? null,
  }));

  const weights = data.map((d) => d.weight).filter((w): w is number => typeof w === 'number');
  const hasWeight = weights.length >= 2;

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e6e6e6',
    borderRadius: 8,
    boxShadow:
      'rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 4px 18px',
    fontSize: 12,
    padding: '8px 10px',
  } as const;

  return (
    <section aria-labelledby="trend-heading" className="space-y-5">
      <SectionHead
        title={<span id="trend-heading">Xu hướng 7 ngày</span>}
        meta={`Calo nạp so với mục tiêu ${formatNumber(targetCalories)} kcal, kèm biến động cân nặng.`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Calo nạp theo ngày</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Đơn vị kcal</p>
          </div>
          <div className="h-[200px] w-full px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f1ef" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6f6a64"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e6e6e6' }}
                />
                <YAxis
                  stroke="#6f6a64"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[1200, 2400]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#1a1a19', fontWeight: 600, marginBottom: 2 }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  formatter={(value: number) => [`${formatNumber(value)} kcal`, 'Calo nạp']}
                />
                <Bar dataKey="calories" fill="#0075de" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Biến động cân nặng</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Đơn vị kg, theo từng buổi cân</p>
          </div>
          <div className="h-[200px] w-full px-2 py-4">
            {hasWeight ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f1f1ef" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6f6a64"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e6e6e6' }}
                  />
                  <YAxis
                    stroke="#6f6a64"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 0.3', 'dataMax + 0.3']}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#1a1a19', fontWeight: 600, marginBottom: 2 }}
                    formatter={(value: number) => [`${value} kg`, 'Cân nặng']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#2a9d99"
                    strokeWidth={2}
                    dot={{ fill: '#2a9d99', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#2a9d99', stroke: '#ffffff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="max-w-[38ch] text-[13px] leading-relaxed text-ink-muted">
                  Chưa đủ buổi cân trong 7 ngày để vẽ đường biến động. Ghi cân nặng vào buổi sáng để
                  Adaptive TDEE bám sát thực tế hơn.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
