'use client';

import { ClipboardList, Dumbbell, Plus, Trash2 } from 'lucide-react';
import type { DailyLog } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import Button from '@/components/ui/Button';
import { EmptyState, SectionHead } from '@/components/ui/Card';

/** The selected day's gym session as a grouped table, one row per set. */
export default function WorkoutSection({
  dailyLog,
  onAdd,
  onDeleteSet,
}: {
  dailyLog: DailyLog;
  onAdd: () => void;
  onDeleteSet: (exIdx: number, setIdx: number) => void;
}) {
  const workouts = dailyLog.workout;
  const hasWorkout = Boolean(workouts?.completed && workouts.exercises.length > 0);

  return (
  <section aria-labelledby="workout-heading" className="space-y-4">
    <SectionHead
      title={<span id="workout-heading">Buổi tập gym hôm nay</span>}
      meta={
        hasWorkout
          ? `${workouts?.session_name ?? 'Buổi tập'} · ${workouts?.duration_minutes ?? 0} phút · tổng volume ${formatNumber(workouts?.total_volume_kg ?? 0)} kg`
          : 'Chưa ghi set nào cho ngày này'
      }
      action={
        <Button variant="utility" size="sm" icon={<Plus />} onClick={onAdd}>
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
                        onClick={() => onDeleteSet(exIdx, sIdx)}
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
          <Button variant="utility" icon={<Plus />} onClick={onAdd}>
            Ghi set tập
          </Button>
        }
      />
    )}
  </section>
  );
}
