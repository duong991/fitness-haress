'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dumbbell, Plus, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { DailyLog, Exercise } from '@/lib/data';
import { formatDecimal, formatNumber, relativeDayLabel, TODAY } from '@/lib/format';
import QuickWorkoutModal from '@/components/QuickWorkoutModal';
import Button from '@/components/ui/Button';
import { Card, EmptyState, Pill, SectionHead, SkeletonRows } from '@/components/ui/Card';
import { DateSwitcher, PageHeader, StatBlock } from '@/components/ui/PageHeader';

export default function WorkoutPage() {
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadData = useCallback(() => {
    fetch(`/api/daily/${currentDate}`)
      .then((res) => res.json())
      .then(setDailyLog)
      .catch(() => setDailyLog(null));

    fetch('/api/exercises')
      .then((res) => res.json())
      .then(setExercises)
      .catch(() => setExercises([]));
  }, [currentDate]);

  useEffect(() => {
    loadData();
    const onUpdated = () => loadData();
    window.addEventListener('fitness-data-updated', onUpdated);
    return () => window.removeEventListener('fitness-data-updated', onUpdated);
  }, [loadData]);

  async function handleDeleteSet(exIdx: number, setIdx: number) {
    if (!dailyLog?.workout) return;
    setDeletingKey(`${exIdx}-${setIdx}`);
    try {
      const next: DailyLog = structuredClone(dailyLog);
      next.workout.exercises[exIdx].sets.splice(setIdx, 1);
      if (next.workout.exercises[exIdx].sets.length === 0) {
        next.workout.exercises.splice(exIdx, 1);
      }
      if (next.workout.exercises.length === 0) {
        next.workout.completed = false;
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
      title="Nhật ký buổi tập"
      description="Kiểm soát set, reps, RPE và tăng tiến tải trọng. Mỗi set vượt kỷ lục sẽ tự cập nhật personal_record trong exercises.json."
      icon={Dumbbell}
      actions={
        <>
          <DateSwitcher date={currentDate} onChange={setCurrentDate} />
          <Button variant="primary" icon={<Plus />} onClick={() => setIsModalOpen(true)}>
            Ghi set tập
          </Button>
        </>
      }
    />
  );

  if (!dailyLog) {
    return (
      <div className="space-y-8">
        {header}
        <SkeletonRows rows={3} cols={4} />
        <SkeletonRows rows={5} cols={5} />
      </div>
    );
  }

  const workout = dailyLog.workout;
  const hasWorkout = Boolean(workout?.completed && workout.exercises.length > 0);
  const totalSets = workout?.exercises.reduce((s, e) => s + e.sets.length, 0) ?? 0;
  const totalReps = workout?.exercises.reduce(
    (s, e) => s + e.sets.reduce((rs, set) => rs + set.reps, 0),
    0,
  ) ?? 0;
  const heaviest = workout?.exercises
    .flatMap((e) => e.sets)
    .reduce((max, set) => Math.max(max, set.weight_kg), 0) ?? 0;
  const avgRpe =
    workout && totalSets > 0
      ? workout.exercises
          .flatMap((e) => e.sets)
          .reduce((s, set) => s + (set.rpe ?? 0), 0) / totalSets
      : 0;

  return (
    <div className="space-y-10 pb-8">
      {header}

      {hasWorkout && workout ? (
        <>
          {/* Session summary */}
          <section aria-labelledby="session-summary" className="space-y-5">
            <SectionHead
              title={<span id="session-summary">Tổng kết buổi tập</span>}
              meta={`${workout.session_name || 'Buổi tập'} · ${relativeDayLabel(currentDate).toLowerCase()}`}
              action={<Pill tone="green">Hoàn thành giáo án</Pill>}
            />

            <Card className="p-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-5">
                <StatBlock
                  label="Thời lượng"
                  value={workout.duration_minutes || 0}
                  unit="phút"
                  meta="Theo giáo án"
                />
                <StatBlock
                  label="Tổng volume"
                  value={formatNumber(workout.total_volume_kg || 0)}
                  unit="kg"
                  meta="∑ tạ × reps"
                />
                <StatBlock
                  label="Bài tập"
                  value={workout.exercises.length}
                  unit="bài"
                  meta={`${totalSets} set hoàn thành`}
                />
                <StatBlock
                  label="Tổng reps"
                  value={formatNumber(totalReps)}
                  unit="reps"
                  meta={`Tạ nặng nhất ${heaviest} kg`}
                />
                <StatBlock
                  label="RPE trung bình"
                  value={avgRpe > 0 ? formatDecimal(avgRpe) : '—'}
                  meta="Mức độ gắng sức"
                />
              </dl>
            </Card>
          </section>

          {/* Per-exercise set logs */}
          <section aria-labelledby="set-logs" className="space-y-5">
            <SectionHead
              title={<span id="set-logs">Chi tiết set theo bài</span>}
              meta={`${workout.exercises.length} bài tập đã ghi cho ngày ${currentDate}`}
            />

            {workout.exercises.map((exercise, exIdx) => {
              const info = exercises.find((e) => e.id === exercise.exercise_id);
              const pr = info?.personal_record;
              const best = exercise.sets.reduce((max, set) => Math.max(max, set.weight_kg), 0);
              const isPrMatched = pr ? best >= pr.weight_kg : false;
              const volume = exercise.sets.reduce((s, set) => s + set.weight_kg * set.reps, 0);

              return (
                <Card key={`${exercise.exercise_id}-${exIdx}`} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                        {exercise.exercise_name}
                        {info?.target_muscle ? <Pill>{info.target_muscle}</Pill> : null}
                      </p>
                      <p className="mt-1 font-metric text-[12px] text-ink-muted">
                        {exercise.sets.length} set · volume {formatNumber(volume)} kg
                      </p>
                    </div>

                    {pr ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1.5 r-chip px-2.5 py-1 text-[11px] font-semibold ${
                            isPrMatched
                              ? 'bg-sticker-green-soft text-sticker-green-ink'
                              : 'bg-sticker-orange-soft text-sticker-orange-deep'
                          }`}
                        >
                          <Trophy className="h-3 w-3" strokeWidth={2} />
                          PR {pr.weight_kg} kg × {pr.reps}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="db-table min-w-[620px]">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th className="text-right">Mức tạ</th>
                          <th className="text-right">Reps</th>
                          <th className="text-right">RPE</th>
                          <th className="text-right">Volume set</th>
                          <th className="text-right">So với PR</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {exercise.sets.map((set, setIdx) => {
                          const delta = pr ? Math.round((set.weight_kg - pr.weight_kg) * 10) / 10 : null;
                          return (
                            <tr key={`${exIdx}-${setIdx}`}>
                              <td className="font-metric font-semibold text-ink">S{set.set_number}</td>
                              <td className="text-right font-metric font-semibold text-ink">
                                {set.weight_kg} kg
                              </td>
                              <td className="text-right font-metric">{set.reps}</td>
                              <td className="text-right font-metric text-ink-muted">
                                {set.rpe ? formatDecimal(set.rpe) : '—'}
                              </td>
                              <td className="text-right font-metric">
                                {formatNumber(set.weight_kg * set.reps)} kg
                              </td>
                              <td className="text-right font-metric">
                                {delta === null ? (
                                  <span className="text-ink-faint">—</span>
                                ) : delta > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-ok">
                                    <TrendingUp className="h-3 w-3" />+{delta} kg
                                  </span>
                                ) : delta === 0 ? (
                                  <span className="text-ink-muted">Bằng PR</span>
                                ) : (
                                  <span className="text-ink-faint">{delta} kg</span>
                                )}
                              </td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSet(exIdx, setIdx)}
                                  disabled={deletingKey === `${exIdx}-${setIdx}`}
                                  aria-label={`Xóa set ${set.set_number} của ${exercise.exercise_name}`}
                                  className="row-action inline-flex h-7 w-7 items-center justify-center r-row text-ink-faint transition-colors hover:bg-canvas hover:text-bad disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      ) : (
        <EmptyState
          icon={<Dumbbell />}
          title="Chưa có set tập nào cho ngày này"
          description="Có thể đây là ngày nghỉ phục hồi. Khi bắt đầu tập, ghi từng set với mức tạ, reps và RPE để hệ thống so kỷ lục."
          action={
            <Button variant="primary" icon={<Plus />} onClick={() => setIsModalOpen(true)}>
              Ghi set tập
            </Button>
          }
        />      )}

      <QuickWorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}
