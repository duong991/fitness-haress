'use client';

import { useState, useEffect } from 'react';
import { User, Save, CheckCircle2, Shield } from 'lucide-react';
import { Profile } from '@/lib/data';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => setProfile(data));
  }, []);

  async function handleSave() {
    if (!profile) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      alert('Lỗi lưu cấu hình hồ sơ');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface p-5 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-neon-lime" />
          <div>
            <h1 className="text-xl font-bold text-white">Hồ Sơ & Mục Tiêu Thể Hình</h1>
            <p className="text-xs text-zinc-400">Tùy chỉnh thông số sinh học, mục tiêu cân nặng và phân bổ macro</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-neon-lime text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neon-lime/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-neon-lime/20"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-neon-lime/10 border border-neon-lime/30 text-neon-lime text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã lưu thành công vào file data/profile.json!</span>
        </div>
      )}

      {/* Form Details */}
      <div className="cyber-card p-6 space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">
          1. Thông số cơ thể
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tên học viên</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-lime"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tuổi</label>
            <input
              type="number"
              value={profile.age}
              onChange={e => setProfile({ ...profile, age: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Chiều cao (cm)</label>
            <input
              type="number"
              value={profile.height_cm}
              onChange={e => setProfile({ ...profile, height_cm: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cân nặng bắt đầu (kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.starting_weight_kg}
              onChange={e => setProfile({ ...profile, starting_weight_kg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cân nặng hiện tại (kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.current_weight_kg}
              onChange={e => setProfile({ ...profile, current_weight_kg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cân nặng mục tiêu (kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.target_weight_kg}
              onChange={e => setProfile({ ...profile, target_weight_kg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
        </div>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2 pt-4">
          2. Mục tiêu Calo & Phân bổ Dinh Dưỡng
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Loại Mục Tiêu</label>
            <select
              value={profile.goal_type}
              onChange={e => setProfile({ ...profile, goal_type: e.target.value as any })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-lime"
            >
              <option value="cut">Cắt mỡ (Cut - thâm hụt calo)</option>
              <option value="bulk">Tăng cơ (Bulk - dư thừa calo)</option>
              <option value="recomp">Tái tạo cơ thể (Recomp)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Calo mục tiêu (kcal/ngày)</label>
            <input
              type="number"
              value={profile.target_calories}
              onChange={e => setProfile({ ...profile, target_calories: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tốc độ mục tiêu (kg/tuần)</label>
            <input
              type="number"
              step="0.05"
              value={profile.weekly_target_rate_kg}
              onChange={e => setProfile({ ...profile, weekly_target_rate_kg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-lime"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Protein mục tiêu (g)</label>
            <input
              type="number"
              value={profile.macros_target.protein_g}
              onChange={e => setProfile({
                ...profile,
                macros_target: { ...profile.macros_target, protein_g: parseInt(e.target.value, 10) || 0 }
              })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Carbs mục tiêu (g)</label>
            <input
              type="number"
              value={profile.macros_target.carbs_g}
              onChange={e => setProfile({
                ...profile,
                macros_target: { ...profile.macros_target, carbs_g: parseInt(e.target.value, 10) || 0 }
              })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-neon-orange"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fat mục tiêu (g)</label>
            <input
              type="number"
              value={profile.macros_target.fat_g}
              onChange={e => setProfile({
                ...profile,
                macros_target: { ...profile.macros_target, fat_g: parseInt(e.target.value, 10) || 0 }
              })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
