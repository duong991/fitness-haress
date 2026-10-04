'use client';

import { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Trash2, Calendar, ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import { DailyLog, Profile, Meal } from '@/lib/data';
import QuickFoodModal from '@/components/QuickFoodModal';

export default function FoodPage() {
  const [currentDate, setCurrentDate] = useState('2026-10-04');
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function loadData() {
    fetch(`/api/daily/${currentDate}`)
      .then(res => res.json())
      .then(data => setDailyLog(data));

    fetch('/api/profile')
      .then(res => res.json())
      .then(data => setProfile(data));
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

  async function handleDeleteItem(mealId: string, itemIdx: number) {
    if (!dailyLog) return;
    const meal = dailyLog.meals.find(m => m.id === mealId);
    if (!meal) return;
    meal.items.splice(itemIdx, 1);
    if (meal.items.length === 0) {
      dailyLog.meals = dailyLog.meals.filter(m => m.id !== mealId);
    }
    await fetch(`/api/daily/${currentDate}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dailyLog),
    });
    loadData();
  }

  if (!dailyLog || !profile) return null;

  return (
    <div className="space-y-6 pb-16">
      {/* Date Switcher */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-6 h-6 text-neon-lime" />
          <div>
            <h1 className="text-lg font-bold text-white">Nhật Ký Dinh Dưỡng & Calo</h1>
            <p className="text-xs text-zinc-400">Quản lý các bữa ăn, macro và mức tiêu thụ năng lượng</p>
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
            className="ml-2 px-4 py-2 rounded-xl bg-neon-lime text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Thêm Bữa
          </button>
        </div>
      </div>

      {/* Daily Macro Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4">
          <span className="text-xs text-zinc-400 block mb-1">Tổng Calo Nạp</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-white">{dailyLog.calories_consumed}</span>
            <span className="text-xs text-zinc-400">/ {dailyLog.calories_target} kcal</span>
          </div>
        </div>
        <div className="cyber-card p-4">
          <span className="text-xs text-zinc-400 block mb-1">Protein (Đạm)</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-neon-cyan">{dailyLog.macros?.protein_g || 0}g</span>
            <span className="text-xs text-zinc-400">/ {profile.macros_target.protein_g}g</span>
          </div>
        </div>
        <div className="cyber-card p-4">
          <span className="text-xs text-zinc-400 block mb-1">Carbohydrates (Tinh bột)</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-neon-orange">{dailyLog.macros?.carbs_g || 0}g</span>
            <span className="text-xs text-zinc-400">/ {profile.macros_target.carbs_g}g</span>
          </div>
        </div>
        <div className="cyber-card p-4">
          <span className="text-xs text-zinc-400 block mb-1">Fat (Chất béo)</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-zinc-300">{dailyLog.macros?.fat_g || 0}g</span>
            <span className="text-xs text-zinc-400">/ {profile.macros_target.fat_g}g</span>
          </div>
        </div>
      </div>

      {/* Meals Detailed Breakdown */}
      <div className="space-y-4">
        {dailyLog.meals && dailyLog.meals.length > 0 ? (
          dailyLog.meals.map(meal => {
            const mealCals = meal.items.reduce((s, i) => s + i.calories, 0);
            const mealP = Math.round(meal.items.reduce((s, i) => s + i.protein_g, 0) * 10) / 10;
            const mealC = Math.round(meal.items.reduce((s, i) => s + i.carbs_g, 0) * 10) / 10;
            const mealF = Math.round(meal.items.reduce((s, i) => s + i.fat_g, 0) * 10) / 10;

            return (
              <div key={meal.id} className="cyber-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h2 className="font-bold text-white text-base">{meal.name}</h2>
                    <span className="text-xs text-zinc-500 font-mono">Thời gian ghi nhận: {meal.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-neon-lime">{mealCals} kcal</span>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {mealP}g P • {mealC}g C • {mealF}g F
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {meal.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-zinc-200">{item.name}</p>
                        <p className="text-zinc-500 text-[11px]">
                          Khối lượng: {item.amount_g}g • Protein: {item.protein_g}g • Carbs: {item.carbs_g}g • Fat: {item.fat_g}g
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white">{item.calories} kcal</span>
                        <button
                          onClick={() => handleDeleteItem(meal.id, idx)}
                          className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center cyber-card">
            <UtensilsCrossed className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Chưa có bữa ăn nào được ghi nhận cho ngày này.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-neon-lime text-black font-bold text-xs"
            >
              + Thêm món ngay
            </button>
          </div>
        )}
      </div>

      <QuickFoodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}
