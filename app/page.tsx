'use client';

import { useState, useEffect } from 'react';
import { 
  Flame, 
  Dumbbell, 
  Scale, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  CheckCircle2, 
  Utensils,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { DailyLog, Profile } from '@/lib/data';
import QuickFoodModal from '@/components/QuickFoodModal';
import QuickWorkoutModal from '@/components/QuickWorkoutModal';

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState('2026-10-04');
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  function loadData() {
    fetch(`/api/daily/${currentDate}`)
      .then(res => res.json())
      .then(data => setDailyLog(data));

    fetch('/api/daily')
      .then(res => res.json())
      .then(data => setAllLogs(data));

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

  async function handleSaveWeight() {
    if (!dailyLog || !newWeight) return;
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;

    dailyLog.weight_kg = w;
    await fetch(`/api/daily/${currentDate}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dailyLog),
    });

    if (profile) {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, current_weight_kg: w }),
      });
    }

    setIsWeightModalOpen(false);
    setNewWeight('');
    loadData();
  }

  if (!dailyLog || !profile) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-neon-lime border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-zinc-500 font-mono">Đang nạp dữ liệu thể hình...</p>
      </div>
    );
  }

  const calConsumed = dailyLog.calories_consumed || 0;
  const calTarget = dailyLog.calories_target || profile.target_calories || 1950;
  const calRemaining = calTarget - calConsumed;
  const calPercent = Math.min(100, Math.round((calConsumed / calTarget) * 100));

  const pConsumed = dailyLog.macros?.protein_g || 0;
  const pTarget = profile.macros_target.protein_g || 165;
  const pPercent = Math.min(100, Math.round((pConsumed / pTarget) * 100));

  const cConsumed = dailyLog.macros?.carbs_g || 0;
  const cTarget = profile.macros_target.carbs_g || 195;
  const cPercent = Math.min(100, Math.round((cConsumed / cTarget) * 100));

  const fConsumed = dailyLog.macros?.fat_g || 0;
  const fTarget = profile.macros_target.fat_g || 55;
  const fPercent = Math.min(100, Math.round((fConsumed / fTarget) * 100));

  // Chart data from recent logs
  const chartData = allLogs.slice(-7).map(l => ({
    date: l.date.slice(5),
    calories: l.calories_consumed || 0,
    target: l.calories_target || profile.target_calories,
    weight: l.weight_kg,
  }));

  return (
    <div className="space-y-6 pb-16">
      {/* Date Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <span className="text-xs uppercase text-zinc-400 font-bold block">Ngày theo dõi</span>
            <span className="font-mono text-base font-extrabold text-neon-lime">{currentDate}</span>
          </div>
          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate('2026-10-04')}
            className="px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Hôm nay
          </button>
        </div>

        {/* Quick action triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWeightModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
          >
            <Scale className="w-4 h-4 text-neon-cyan" />
            <span>{dailyLog.weight_kg ? `${dailyLog.weight_kg} kg` : '+ Cân nặng'}</span>
          </button>
          <button
            onClick={() => setIsWorkoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
          >
            <Dumbbell className="w-4 h-4 text-neon-orange" />
            <span>+ Set Tập</span>
          </button>
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-lime text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neon-lime/90 transition-all shadow-lg shadow-neon-lime/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Món</span>
          </button>
        </div>
      </div>

      {/* Hero Overview: Calorie & Macros Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Calorie Ring Card */}
        <div className="lg:col-span-5 cyber-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-neon-lime/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-neon-lime" />
              <h2 className="font-bold text-white text-base">Năng Lượng Trong Ngày</h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
              Target: {calTarget} kcal
            </span>
          </div>

          <div className="flex items-center gap-6 my-2">
            {/* Circular representation */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#27272a"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#a3e635"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * calPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-mono text-2xl font-black text-white">{calConsumed}</span>
                <span className="block text-[10px] text-zinc-400 font-semibold uppercase">kcal nạp</span>
              </div>
            </div>

            {/* Calorie Stats */}
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-zinc-400">Còn lại hôm nay</p>
                <p className={`font-mono text-xl font-bold ${calRemaining >= 0 ? 'text-neon-lime' : 'text-rose-500'}`}>
                  {calRemaining >= 0 ? `${calRemaining} kcal` : `Vượt ${Math.abs(calRemaining)} kcal`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <TrendingDown className="w-4 h-4 text-neon-cyan" />
                <span>
                  Mục tiêu {profile.goal_type === 'cut' ? 'Cắt mỡ (Cut)' : profile.goal_type === 'bulk' ? 'Tăng cơ (Bulk)' : 'Body Recomp'}
                </span>
              </div>
            </div>
          </div>

          {/* Macro Progress Bars */}
          <div className="mt-6 pt-4 border-t border-surface-border space-y-3">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">Protein (Đạm)</span>
                <span className="font-mono font-bold text-neon-cyan">{pConsumed} / {pTarget}g ({pPercent}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-neon-cyan h-full rounded-full transition-all duration-500" 
                  style={{ width: `${pPercent}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">Carbs (Tinh bột)</span>
                <span className="font-mono font-bold text-neon-orange">{cConsumed} / {cTarget}g ({cPercent}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-neon-orange h-full rounded-full transition-all duration-500" 
                  style={{ width: `${cPercent}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">Fat (Chất béo)</span>
                <span className="font-mono font-bold text-zinc-300">{fConsumed} / {fTarget}g ({fPercent}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-zinc-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${fPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Workout Card & Quick Weight */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Today's Workout */}
          <div className="cyber-card p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-neon-cyan" />
                <h3 className="font-bold text-white text-base">Nhật Ký Buổi Tập</h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                dailyLog.workout?.completed 
                  ? 'bg-neon-lime/10 border border-neon-lime/30 text-neon-lime' 
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {dailyLog.workout?.completed ? 'Đã hoàn thành' : 'Chưa tập'}
              </span>
            </div>

            {dailyLog.workout?.completed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div>
                    <p className="font-bold text-white text-sm">{dailyLog.workout.session_name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Thời gian: {dailyLog.workout.duration_minutes} phút</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Tổng tải trọng</span>
                    <span className="font-mono text-neon-cyan font-bold text-base">{dailyLog.workout.total_volume_kg.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* Exercises list */}
                <div className="space-y-2">
                  {dailyLog.workout.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-white">{ex.exercise_name}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{ex.sets.length} sets</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ex.sets.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-300"
                          >
                            Set {s.set_number}: <strong className="text-white">{s.weight_kg}kg</strong> × {s.reps} {s.rpe ? `(RPE ${s.rpe})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Chưa ghi nhận bài tập nào cho ngày này.</p>
                <button
                  onClick={() => setIsWorkoutModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-all"
                >
                  + Ghi set tập đầu tiên
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="cyber-card p-4">
              <span className="text-xs text-zinc-400 block mb-1">Cân Nặng Hôm Nay</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl font-bold text-white">
                  {dailyLog.weight_kg ? dailyLog.weight_kg : '--'}
                </span>
                <span className="text-xs text-zinc-400">kg</span>
              </div>
            </div>
            <div className="cyber-card p-4">
              <span className="text-xs text-zinc-400 block mb-1">Adaptive TDEE</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl font-bold text-neon-lime">
                  {profile.current_tdee}
                </span>
                <span className="text-xs text-zinc-400">kcal</span>
              </div>
            </div>
            <div className="cyber-card p-4">
              <span className="text-xs text-zinc-400 block mb-1">Mục Tiêu</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl font-bold text-neon-cyan">
                  {profile.target_weight_kg}
                </span>
                <span className="text-xs text-zinc-400">kg ({profile.weekly_target_rate_kg}kg/t)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section: 7-Day Calorie & Weight Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calorie Trend Chart */}
        <div className="cyber-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Xu Hướng Nạp Calo 7 Ngày Gần Nhất</h3>
            <span className="text-xs text-neon-lime font-mono">Đường đứt: Mục tiêu {profile.target_calories} kcal</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={[1200, 2600]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#a3e635', fontWeight: 'bold' }}
                />
                <Bar dataKey="calories" fill="#a3e635" radius={[4, 4, 0, 0]} name="Calo Nạp" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weight Trend Chart */}
        <div className="cyber-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Biến Động Cân Nặng (kg)</h3>
            <span className="text-xs text-neon-cyan font-mono">Xu hướng giảm mỡ</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#06b6d4" 
                  strokeWidth={3} 
                  dot={{ fill: '#06b6d4', r: 4 }} 
                  name="Cân nặng (kg)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Meals of the Day Section */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-neon-lime" />
            <h3 className="font-bold text-white text-base">Các Bữa Ăn Trong Ngày</h3>
          </div>
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-neon-lime hover:border-neon-lime transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Bữa
          </button>
        </div>

        {dailyLog.meals && dailyLog.meals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyLog.meals.map((meal) => {
              const mealCals = meal.items.reduce((s, i) => s + i.calories, 0);
              const mealP = Math.round(meal.items.reduce((s, i) => s + i.protein_g, 0) * 10) / 10;
              const mealC = Math.round(meal.items.reduce((s, i) => s + i.carbs_g, 0) * 10) / 10;
              const mealF = Math.round(meal.items.reduce((s, i) => s + i.fat_g, 0) * 10) / 10;

              return (
                <div key={meal.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">{meal.name}</span>
                      <span className="text-[11px] text-zinc-500 font-mono ml-2">[{meal.time}]</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-neon-lime bg-zinc-800 px-2 py-0.5 rounded">
                      {mealCals} kcal
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {meal.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-zinc-300">
                        <span>{item.name}</span>
                        <span className="font-mono text-zinc-400">{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-[11px] text-zinc-400 font-mono">
                    <span>Macro:</span>
                    <span>
                      <strong className="text-neon-cyan">{mealP}g P</strong> •{' '}
                      <strong className="text-neon-orange">{mealC}g C</strong> •{' '}
                      <strong className="text-zinc-300">{mealF}g F</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
            <Utensils className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Chưa ghi nhận bữa ăn nào cho ngày này.</p>
          </div>
        )}
      </div>

      {/* Weight Modal */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Cập Nhật Cân Nặng (kg)</h3>
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              placeholder="VD: 71.6"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-base text-white font-mono focus:outline-none focus:border-neon-lime"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveWeight}
                className="px-5 py-2 rounded-xl bg-neon-lime text-black font-bold text-xs"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food and Workout Modals */}
      <QuickFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />

      <QuickWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        date={currentDate}
        onSuccess={loadData}
      />
    </div>
  );
}
