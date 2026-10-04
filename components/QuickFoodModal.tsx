'use client';

import { useState } from 'react';
import { Plus, Sparkles, X, Trash2 } from 'lucide-react';
import { FoodItem } from '@/lib/data';

interface QuickFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSuccess: () => void;
}

export default function QuickFoodModal({ isOpen, onClose, date, onSuccess }: QuickFoodModalProps) {
  const [mealName, setMealName] = useState('Bữa trưa');
  const [naturalText, setNaturalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FoodItem[]>([]);

  if (!isOpen) return null;

  async function handleParseNaturalText() {
    if (!naturalText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: naturalText }),
      });
      const data = await res.json();
      if (data.items) {
        setItems(prev => [...prev, ...data.items]);
        setNaturalText('');
      }
    } catch (e) {
      alert('Lỗi bóc tách món ăn');
    } finally {
      setLoading(false);
    }
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (items.length === 0) return;
    setLoading(true);
    try {
      // 1. Fetch current daily log
      const resDaily = await fetch(`/api/daily/${date}`);
      const dailyLog = await resDaily.json();

      // 2. Add new meal or append to existing meal
      const newMeal = {
        id: `meal-${Date.now()}`,
        name: mealName,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        items: items,
      };

      const updatedMeals = [...(dailyLog.meals || []), newMeal];
      dailyLog.meals = updatedMeals;

      // 3. Save back
      await fetch(`/api/daily/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyLog),
      });

      onSuccess();
      onClose();
      setItems([]);
    } catch (e) {
      alert('Không thể lưu bữa ăn');
    } finally {
      setLoading(false);
    }
  }

  const totalMealCals = items.reduce((sum, item) => sum + item.calories, 0);
  const totalMealP = Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10;
  const totalMealC = Math.round(items.reduce((sum, item) => sum + item.carbs_g, 0) * 10) / 10;
  const totalMealF = Math.round(items.reduce((sum, item) => sum + item.fat_g, 0) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-surface-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-lime"></span>
            <h3 className="font-bold text-lg text-white">Thêm Bữa Ăn Nhanh</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Select meal name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Tên bữa ăn
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Bữa sáng', 'Bữa trưa', 'Bữa xế', 'Bữa tối'].map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setMealName(name)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    mealName === name
                      ? 'bg-neon-lime/10 border-neon-lime text-neon-lime'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Natural language parser input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Nhập nhanh món ăn & khối lượng (g)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={naturalText}
                onChange={e => setNaturalText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleParseNaturalText()}
                placeholder="VD: 200g ức gà, 150g cơm, 1 quả trứng"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime"
              />
              <button
                type="button"
                onClick={handleParseNaturalText}
                disabled={loading || !naturalText.trim()}
                className="px-4 py-2.5 rounded-xl bg-neon-lime text-black font-bold text-sm flex items-center gap-1.5 hover:bg-neon-lime/90 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Bóc tách
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 italic">
              * Tự động tra cứu calo, protein, carbs, fat theo gram từ cơ sở dữ liệu thực phẩm.
            </p>
          </div>

          {/* Parsed items table */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Thực phẩm trong bữa ({items.length})</span>
                <span className="font-mono text-neon-lime font-bold">
                  {totalMealCals} kcal | {totalMealP}P {totalMealC}C {totalMealF}F
                </span>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-zinc-400 mt-0.5">
                        <span className="text-neon-cyan">{item.protein_g}g P</span> •{' '}
                        <span className="text-neon-orange">{item.carbs_g}g C</span> •{' '}
                        <span className="text-zinc-400">{item.fat_g}g F</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white text-sm">
                        {item.calories} kcal
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            onClick={handleSave}
            disabled={items.length === 0 || loading}
            className="px-6 py-2 rounded-xl bg-neon-lime text-black font-bold text-xs uppercase tracking-wider hover:bg-neon-lime/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Lưu vào nhật ký
          </button>
        </div>
      </div>
    </div>
  );
}
