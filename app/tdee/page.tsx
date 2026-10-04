'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Zap, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TdeeHistoryEntry, Profile } from '@/lib/data';

export default function TdeePage() {
  const [history, setHistory] = useState<TdeeHistoryEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(null);

  function loadData() {
    fetch('/api/tdee')
      .then(res => res.json())
      .then(data => setHistory(data));

    fetch('/api/profile')
      .then(res => res.json())
      .then(data => setProfile(data));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunWeeklyReview() {
    setLoading(true);
    setReviewResult(null);
    try {
      const res = await fetch('/api/tdee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Đánh giá tự động định kỳ cuối tuần từ giao diện Web' }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewResult(`Review thành công! TDEE tính toán: ${data.entry.calculated_tdee} kcal. Calo mục tiêu mới: ${data.entry.recommended_target_calories} kcal.`);
        loadData();
      } else {
        alert(data.error || 'Lỗi khi tính TDEE');
      }
    } catch (e) {
      alert('Không thể kết nối API TDEE');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-neon-lime" />
          <div>
            <h1 className="text-xl font-bold text-white">Adaptive TDEE & Chuyển Hóa Năng Lượng</h1>
            <p className="text-xs text-zinc-400">Thuật toán tự động thích ứng dựa trên calo nạp và biến động cân nặng thực tế</p>
          </div>
        </div>

        <button
          onClick={handleRunWeeklyReview}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-neon-lime text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neon-lime/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-neon-lime/20"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang phân tích...' : 'Chạy Review Tuần Mới'}
        </button>
      </div>

      {reviewResult && (
        <div className="p-4 rounded-xl bg-neon-lime/10 border border-neon-lime/30 text-neon-lime text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{reviewResult}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card p-5">
          <span className="text-xs text-zinc-400 block mb-1">Adaptive TDEE Hiện Tại</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-neon-lime">{profile.current_tdee}</span>
            <span className="text-xs text-zinc-400">kcal/ngày</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Mức tiêu hao thực tế đo lường</span>
        </div>

        <div className="cyber-card p-5">
          <span className="text-xs text-zinc-400 block mb-1">Mục Tiêu Calo Tuần Này</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-white">{profile.target_calories}</span>
            <span className="text-xs text-zinc-400">kcal/ngày</span>
          </div>
          <span className="text-[11px] text-neon-cyan mt-1 block">
            Thâm hụt {profile.current_tdee - profile.target_calories} kcal/ngày
          </span>
        </div>

        <div className="cyber-card p-5">
          <span className="text-xs text-zinc-400 block mb-1">BMR Cơ Bản Ban Đầu</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-zinc-300">{profile.initial_bmr}</span>
            <span className="text-xs text-zinc-400">kcal</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Chuyển hóa tĩnh (Mifflin-St Jeor)</span>
        </div>

        <div className="cyber-card p-5">
          <span className="text-xs text-zinc-400 block mb-1">Tốc Độ Cắt Mỡ Dự Kiến</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-neon-orange">{profile.weekly_target_rate_kg}</span>
            <span className="text-xs text-zinc-400">kg/tuần</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">An toàn bảo toàn cơ nạc</span>
        </div>
      </div>

      {/* History Table */}
      <div className="cyber-card p-6 space-y-4">
        <h2 className="font-bold text-white text-base">Lịch Sử Đánh Giá & Thích Ứng Qua Các Tuần</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Giai đoạn</th>
                <th className="py-3 px-4">Cân nặng TB</th>
                <th className="py-3 px-4">Biến động</th>
                <th className="py-3 px-4">Calo nạp TB</th>
                <th className="py-3 px-4">TDEE tính toán</th>
                <th className="py-3 px-4">Calo đề xuất tuần tới</th>
                <th className="py-3 px-4">Nhận xét</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {history.map((entry, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/40">
                  <td className="py-3 px-4 text-zinc-300">{entry.week_start} → {entry.week_end}</td>
                  <td className="py-3 px-4 text-white font-bold">{entry.avg_weight_kg} kg</td>
                  <td className="py-3 px-4">
                    <span className={entry.weight_change_kg <= 0 ? 'text-neon-lime' : 'text-neon-orange'}>
                      {entry.weight_change_kg > 0 ? `+${entry.weight_change_kg}` : entry.weight_change_kg} kg
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{entry.avg_calories_in} kcal</td>
                  <td className="py-3 px-4 text-neon-lime font-bold">{entry.calculated_tdee} kcal</td>
                  <td className="py-3 px-4 text-neon-cyan font-bold">{entry.recommended_target_calories} kcal</td>
                  <td className="py-3 px-4 font-sans text-zinc-400 max-w-xs truncate">{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation Card */}
      <div className="cyber-card p-6 bg-zinc-900/40 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Zap className="w-4 h-4 text-neon-lime" />
          <span>Cách Hệ Thống Tránh "Đứng Cân" (Plateau Breaker)</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Khi bạn ăn thâm hụt calo trong thời gian dài, cơ thể tự động hạ mức chuyển hóa (giảm hoạt động vô thức NEAT, giảm thân nhiệt nhẹ). 
          Thuật toán Adaptive TDEE sẽ đo lường lượng mỡ thực sự mất đi dựa trên 7700 kcal/kg mỡ. 
          Nếu tốc độ giảm bị chững, calo mục tiêu sẽ được tự động hạ xuống một nấc nhỏ (tối đa -100 ~ -150 kcal) để bạn tiếp tục giảm mỡ mà không cần đoán mò.
        </p>
      </div>
    </div>
  );
}
