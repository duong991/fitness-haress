import { describe, expect, it } from 'vitest';
import { recalculateDailyTotals } from '@/lib/data';
import { makeLog } from './helpers';

describe('recalculateDailyTotals', () => {
  it('sums meal items into calories and macros', () => {
    const log = makeLog({
      meals: [
        {
          id: 'm1', name: 'Trưa', time: '12:00',
          items: [
            { name: 'Ức gà', amount_g: 200, calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7.2 },
            { name: 'Cơm', amount_g: 150, calories: 195.4, protein_g: 4, carbs_g: 42.1, fat_g: 0.4 },
          ],
        },
      ],
    });
    const out = recalculateDailyTotals(log);
    expect(out.calories_consumed).toBe(525);
    expect(out.macros).toEqual({ protein_g: 66, carbs_g: 42.1, fat_g: 7.6 });
  });

  it('counts only completed sets in total volume', () => {
    const log = makeLog({
      workout: {
        completed: true, session_name: 'Push', duration_minutes: 50, total_volume_kg: 0,
        exercises: [
          {
            exercise_id: 'bench_press', exercise_name: 'Bench',
            sets: [
              { set_number: 1, weight_kg: 60, reps: 10, rpe: 7, completed: true },
              { set_number: 2, weight_kg: 60, reps: 8, rpe: 9, completed: true },
              { set_number: 3, weight_kg: 100, reps: 5, completed: false },
            ],
          },
        ],
      },
    });
    expect(recalculateDailyTotals(log).workout.total_volume_kg).toBe(1080);
  });

  it('resets totals to zero when there are no meals', () => {
    const out = recalculateDailyTotals(makeLog({ calories_consumed: 999 }));
    expect(out.calories_consumed).toBe(0);
    expect(out.macros).toEqual({ protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});
