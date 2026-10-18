import type { DailyLog, Profile } from '@/lib/data';

export const makeProfile = (over: Partial<Profile> = {}): Profile => ({
  name: 'Test',
  age: 28,
  gender: 'male',
  height_cm: 175,
  starting_weight_kg: 80,
  current_weight_kg: 74,
  goal_type: 'cut',
  target_weight_kg: 70,
  weekly_target_rate_kg: 0.5,
  initial_bmr: 1700,
  current_tdee: 2300,
  target_calories: 1900,
  macros_target: { protein_g: 150, carbs_g: 200, fat_g: 60 },
  training_days_per_week: 4,
  updated_at: '2026-10-05',
  ...over,
});

export const makeLog = (over: Partial<DailyLog> = {}): DailyLog => ({
  date: '2026-10-05',
  weight_kg: null,
  calories_target: 1900,
  calories_consumed: 0,
  macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
  meals: [],
  workout: { completed: false, session_name: '', duration_minutes: 0, total_volume_kg: 0, exercises: [] },
  ...over,
});
