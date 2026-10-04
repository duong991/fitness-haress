'use client';

import { useState, useEffect } from 'react';
import { Dumbbell, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle, Trophy, Flame } from 'lucide-react';
import { DailyLog, Exercise } from '@/lib/data';
import QuickWorkoutModal from '@/components/QuickWorkoutModal';

export default function WorkoutPage() {
  const [currentDate, setCurrentDate] = useState('2026-10-04');
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function loadData() {
    fetch(`/api/daily/${currentDate}`)
      .then(res => res.json())
      .then(data => setDailyLog(data));

    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => setExercises(data));
  }

  useEffect(() => {
    loadData();
  }, [currentDate]);

  function changeDay(delta: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setCurrentDate(`${yyyy}-${mm}-${dd}`);
  }

  async function handleDeleteSet(exIdx: number, setIdx: number) {
    if (!dailyLog || !dailyLog.workout) return;
    dailyLog.workout.exercises[exIdx].sets.splice(setIdx, 1);
    if (dailyLog.workout.exercises[exIdx].sets.length === 0) {
      dailyLog.workout.exercises.splice(exIdx, 1);
    }
    if (dailyLog.workout.exercises.length === 0) {
      dailyLog.workout.completed = false;
    }
    await fetch(`/api/daily/${currentDate}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dailyLog),
    });
    loadData();
  }

  if (!dailyLog) return null;

  const workout = dailyLog.workout;
  const isWorkoutCompleted = workout?.completed && workout.exercises.length > 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Date Switcher */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-6 h-6 text-neon-cyan" />
          <div>
            <h1 className="text-lg font-bold text-white">Nhật Ký Buổi Tập Gym</h1>
            <p className="text-xs text-zinc-400">Kiểm soát Sets, Reps, RPE và Tăng Tiến Tải Trọng (Progressive Overload)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-sm font-bold text-white px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            {currentDate}
          </span>
          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-2 px-4 py-2 rounded-xl bg-neon-cyan text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Set Tập
          </button>
        </div>
      </div>

      {/* Summary Header */}
      {isWorkoutCompleted ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="cyber-card p-5">
            <span className="text-xs text-zinc-400 block mb-1">Tên Buổi Tập</span>
            <p className="font-bold text-white text-base">{workout.session_name || 'Buổi tập tạ'}</p>
            <span className="text-xs text-zinc-500 mt-1 block">Thời lượng: {workout.duration_minutes || 60} phút</span>
          </div>
          <div className="cyber-card p-5">
            <span className="text-xs text-zinc-400 block mb-1">Tổng Tải Trọng (Volume)</span>
            <p className="font-mono font-black text-2xl text-neon-cyan">
              {workout.total_volume_kg.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kg</span>
            </p>
            <span className="text-xs text-zinc-500 mt-1 block">Tổng = Tạ (kg) × Số Reps</span>
          </div>
          <div className="cyber-card p-5">
            <span className="text-xs text-zinc-400 block mb-1">Số Bài & Tổng Set</span>
            <p className="font-mono font-black text-2xl text-white">
              {workout.exercises.length} <span className="text-xs text-zinc-400 font-normal">bài</span> /{' '}
              {workout.exercises.reduce((s, e) => s + e.sets.length, 0)} <span className="text-xs text-zinc-400 font-normal">sets</span>
            </p>
            <span className="text-xs text-neon-lime mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành tốt
            </span>
          </div>
        </div>
      ) : null}

      {/* Exercises Detail */}
      {isWorkoutCompleted ? (
        <div className="space-y-4">
          {workout.exercises.map((exercise, exIdx) => {
            const exInfo = exercises.find(e => e.id === exercise.exercise_id);
            const pr = exInfo?.personal_record;

            return (
              <div key={exIdx} className="cyber-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-base">{exercise.exercise_name}</h2>
                    {exInfo?.target_muscle && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {exInfo.target_muscle}
                      </span>
                    )}
                  </div>
                  {pr && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>PR: {pr.weight_kg}kg × {pr.reps} reps</span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Set</th>
                        <th className="py-2 px-3">Mức tạ (kg)</th>
                        <th className="py-2 px-3">Số Reps</th>
                        <th className="py-2 px-3">RPE</th>
                        <th className="py-2 px-3">Volume Set</th>
                        <th className="py-2 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {exercise.sets.map((set, setIdx) => {
                        const isPrSet = pr && set.weight_kg >= pr.weight_kg && set.reps >= pr.reps;
                        return (
                          <tr key={setIdx} className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-white">{set.set_number}</td>
                            <td className="py-2.5 px-3 text-neon-cyan font-bold">{set.weight_kg} kg</td>
                            <td className="py-2.5 px-3 text-white">{set.reps}</td>
                            <td className="py-2.5 px-3 text-zinc-400">{set.rpe || '--'}</td>
                            <td className="py-2.5 px-3 text-zinc-300">{set.weight_kg * set.reps} kg</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteSet(exIdx, setIdx)}
                                className="text-zinc-600 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center cyber-card">
          <Dumbbell className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Không có nhật ký buổi tập nào cho ngày này.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-neon-cyan text-black font-bold text-xs"
          >
            + Ghi set tập ngay
          </button>
        </div>
      )}

      <QuickWorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}
