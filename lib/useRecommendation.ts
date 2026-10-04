'use client';

/**
 * Client view of `/api/recommendation`.
 *
 * The server is the only place that owns the calculation (it reads `data/*.json`
 * through `fs`), so the client just shapes the payload. Types are mirrored
 * rather than imported so a client bundle never reaches into server modules.
 */
import { useCallback, useEffect, useState } from 'react';
import type { WeeklyMilestone, WeeklyPlan } from '@/lib/data';

export interface MealSuggestion {
  calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
}

export interface EnergyRecommendationView {
  ready: boolean;
  blockedReason?: string;
  baseTarget: number;
  steps: number;
  stepsTarget: number;
  stepsSource: 'logged' | 'none';
  stepsKcal: number;
  trainingPlanned: boolean;
  trainingMinutes: number;
  trainingKcal: number;
  activityAdjustment: number;
  adjustedTarget: number;
  consumed: number;
  remainingToEat: number;
  remainingMacros: { protein_g: number; carbs_g: number; fat_g: number };
  mealSuggestion: MealSuggestion | null;
  macroTargets: { protein_g: number; carbs_g: number; fat_g: number };
  status: 'under' | 'on-target' | 'over';
  notes: string[];
}

export interface WorkoutItemView {
  exercise_id: string;
  name: string;
  target_muscle: string;
  one_rm: number;
  one_rm_source: 'personal_record' | 'estimated';
  top_set_weight_kg: number;
  reps: number;
  sets: number;
  set_weights: number[];
  last_logged_weight_kg?: number;
  progression: string;
}

export interface WorkoutRecommendationView {
  ready: boolean;
  blockedReason?: string;
  is_rest_day: boolean;
  day_name: string;
  split_name: string;
  day_index: number;
  total_days: number;
  muscles: string[];
  rationale: string;
  items: WorkoutItemView[];
  estimated_volume_kg: number;
  estimated_minutes: number;
  rotation_source: 'history' | 'start';
  last_session?: { date: string; name: string };
  cardio: { stepsTarget: number; kcal: number };
}

export interface StepsView {
  steps: number;
  target: number;
  pct: number;
  kcalBurned: number;
  kcalCredit: number;
  remaining: number;
}

export interface PlanEvaluationView {
  achieved: boolean;
  targetDates: number;
  done: number;
  missed: number;
  elapsed: number;
  actualRateKgPerWeek: number | null;
  expectedNowKg: number | null;
  varianceKg: number | null;
  weeksRemaining: number;
  behindSchedule: boolean;
}

export interface RecommendationResponse {
  date: string;
  energy: EnergyRecommendationView;
  workout: WorkoutRecommendationView;
  steps: StepsView | null;
  weekly: {
    ready: boolean;
    blockedReason?: string;
    plan: WeeklyPlan | null;
    milestones: WeeklyMilestone[];
    evaluation: PlanEvaluationView | null;
  };
  split_name: string;
  recent_steps: { date: string; steps: number }[];
}

export interface RecommendationState {
  data: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch the day's recommendation. Re-fetches whenever a screen writes to the
 * store, so the numbers never go stale after logging a meal or a set.
 */
export function useRecommendation(date: string): RecommendationState {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/recommendation?date=${date}`)
      .then((res) => res.json())
      .then((payload: RecommendationResponse) => {
        setData(payload);
        setError(null);
      })
      .catch(() => setError('Không tải được đề xuất cho ngày này.'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
    const onUpdated = () => load();
    window.addEventListener('fitness-data-updated', onUpdated);
    return () => window.removeEventListener('fitness-data-updated', onUpdated);
  }, [load]);

  return { data, loading, error, reload: load };
}

/** Persist today's step count. Partial update: every other field is preserved. */
export async function saveSteps(date: string, steps: number): Promise<boolean> {
  const res = await fetch('/api/recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, steps }),
  });
  if (!res.ok) return false;
  window.dispatchEvent(new CustomEvent('fitness-data-updated'));
  return true;
}
