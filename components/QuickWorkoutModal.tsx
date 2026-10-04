'use client';

import { useState, useEffect } from 'react';
import { Dumbbell, Plus, X } from 'lucide-react';
import { Exercise } from '@/lib/data';

interface QuickWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSuccess: () => void;
}

export default function QuickWorkoutModal({ isOpen, onClose, date, onSuccess }: QuickWorkoutModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [weightKg, setWeightKg] = useState<number>(60);
  const [reps, setReps] = useState<number>(8);
  const [rpe, setRpe] = useState<number>(8);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/exercises')
        .then(res => res.json())
        .then(data => {
          setExercises(data);
          if (data.length > 0 && !selectedExId) {
            setSelectedExId(data[0].id);
          }
        });
    }
  }, [isOpen, selectedExId]);

  if (!isOpen) return null;

  async function handleAddSet() {
    if (!selectedExId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/daily/${date}`);
      const dailyLog = await res.json();

      const selectedEx = exercises.find(e => e.id === selectedExId);
      const exName = selectedEx ? selectedEx.name : selectedExId;

      if (!dailyLog.workout) {
        dailyLog.workout = {
          completed: true,
          session_name: 'Buổi tập hôm nay',
          duration_minutes: 60,
          total_volume_kg: 0,
          exercises: []
        };
      }
      dailyLog.workout.completed = true;

      let targetExercise = dailyLog.workout.exercises.find((e: any) => e.exercise_id === selectedExId);
      if (!targetExercise) {
        targetExercise = {
          exercise_id: selectedExId,
          exercise_name: exName,
          sets: []
        };
        dailyLog.workout.exercises.push(targetExercise);
      }

      const nextSetNum = targetExercise.sets.length + 1;
      targetExercise.sets.push({
        set_number: nextSetNum,
        weight_kg: Number(weightKg),
        reps: Number(reps),
        rpe: Number(rpe),
        completed: true
      });

      // Save daily
      await fetch(`/api/daily/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyLog),
      });

      // Check PR update
      if (selectedEx) {
        const curPrWeight = selectedEx.personal_record?.weight_kg || 0;
        const curPrReps = selectedEx.personal_record?.reps || 0;
        if (weightKg > curPrWeight || (weightKg === curPrWeight && reps > curPrReps)) {
          await fetch('/api/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...selectedEx,
              personal_record: {
                weight_kg: weightKg,
                reps: reps,
                date: date
              }
            })
          });
        }
      }

      onSuccess();
      onClose();
    } catch (e) {
      alert('Lỗi ghi set tập');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan"></span>
            <h3 className="font-bold text-lg text-white">Ghi Set Tập Gym</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Chọn Bài Tập
            </label>
            <select
              value={selectedExId}
              onChange={e => setSelectedExId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan"
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.target_muscle})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Tạ (kg)
              </label>
              <input
                type="number"
                step="0.5"
                value={weightKg}
                onChange={e => setWeightKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Số Reps
              </label>
              <input
                type="number"
                value={reps}
                onChange={e => setReps(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                RPE (1-10)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={rpe}
                onChange={e => setRpe(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Hủy
          </button>
          <button
            onClick={handleAddSet}
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-neon-cyan text-black font-bold text-xs uppercase tracking-wider hover:bg-neon-cyan/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Lưu Set Tập
          </button>
        </div>
      </div>
    </div>
  );
}
