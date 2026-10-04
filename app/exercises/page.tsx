'use client';

import { useState, useEffect } from 'react';
import { Trophy, Dumbbell, Plus, Flame, Search } from 'lucide-react';
import { Exercise } from '@/lib/data';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Chest');
  const [newExCategory, setNewExCategory] = useState('Compound');

  function loadExercises() {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => setExercises(data));
  }

  useEffect(() => {
    loadExercises();
  }, []);

  async function handleCreateExercise() {
    if (!newExName.trim()) return;
    const newEx: Exercise = {
      id: newExName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: newExName.trim(),
      target_muscle: newExMuscle,
      category: newExCategory,
    };
    await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEx),
    });
    setIsModalOpen(false);
    setNewExName('');
    loadExercises();
  }

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) || ex.target_muscle.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = selectedMuscle === 'ALL' || ex.target_muscle.toLowerCase().includes(selectedMuscle.toLowerCase());
    return matchSearch && matchMuscle;
  });

  const muscleList = ['ALL', 'Chest', 'Back', 'Quads', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps'];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Thư Viện Bài Tập & Kỷ Lục PRs</h1>
            <p className="text-xs text-zinc-400">Theo dõi mức tạ kỷ lục cá nhân (PR) và ước tính sức mạnh 1RM</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-neon-lime text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neon-lime/90 transition-all flex items-center gap-1.5 shadow-lg shadow-neon-lime/20"
        >
          <Plus className="w-4 h-4" />
          + Thêm Bài Tập Mới
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài hoặc nhóm cơ..."
            className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-neon-lime"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {muscleList.map(muscle => (
            <button
              key={muscle}
              onClick={() => setSelectedMuscle(muscle)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMuscle === muscle
                  ? 'bg-neon-lime text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ex => {
          const pr = ex.personal_record;
          // Epley formula for 1RM: w * (1 + r/30)
          const est1RM = pr ? Math.round(pr.weight_kg * (1 + pr.reps / 30) * 10) / 10 : null;

          return (
            <div key={ex.id} className="cyber-card p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-bold text-white text-sm">{ex.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {ex.category}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 block">{ex.target_muscle}</span>
              </div>

              {pr ? (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> Kỷ lục (PR)
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">{pr.date}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-xl font-black text-amber-400">
                      {pr.weight_kg} kg <span className="text-xs text-zinc-400 font-normal">× {pr.reps} reps</span>
                    </span>
                    {est1RM && (
                      <span className="text-xs font-mono text-neon-cyan font-bold">
                        1RM ~{est1RM} kg
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-center">
                  <span className="text-xs text-zinc-500 italic">Chưa có bản ghi PR</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Thêm Bài Tập Mới</h3>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Tên bài tập</label>
              <input
                type="text"
                value={newExName}
                onChange={e => setNewExName(e.target.value)}
                placeholder="VD: Incline Smith Machine Press"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon-lime"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nhóm cơ chính</label>
              <select
                value={newExMuscle}
                onChange={e => setNewExMuscle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {['Chest', 'Upper Chest', 'Back', 'Lats', 'Quads', 'Hamstrings', 'Glutes', 'Shoulders', 'Side Delts', 'Biceps', 'Triceps', 'Calves'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Loại động tác</label>
              <select
                value={newExCategory}
                onChange={e => setNewExCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="Compound">Compound (Đa khớp)</option>
                <option value="Isolation">Isolation (Đơn khớp)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateExercise}
                className="px-5 py-2 rounded-xl bg-neon-lime text-black font-bold text-xs"
              >
                Tạo bài tập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
