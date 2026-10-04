import { NextResponse } from 'next/server';
import {
  getAllDailyLogs,
  getDailyLog,
  getExercises,
  getProfile,
  getWeeklyPlan,
  saveDailyLog,
} from '@/lib/data';
import { localIsoDate } from '@/lib/format';
import {
  buildEnergyRecommendation,
  buildStepsRecommendation,
  buildWorkoutRecommendation,
  resolveSplit,
  type EnergyRecommendation,
  type StepsRecommendation,
  type WorkoutRecommendation,
} from '@/lib/core/recommend';
import { resolveWeeklyPlan, type PlanEvaluation } from '@/lib/core/weeklyPlan';
import type { WeeklyMilestone, WeeklyPlan } from '@/lib/data';

export const dynamic = 'force-dynamic';

export interface RecommendationPayload {
  date: string;
  energy: EnergyRecommendation;
  workout: WorkoutRecommendation;
  steps: StepsRecommendation | null;
  weekly: {
    ready: boolean;
    blockedReason?: string;
    plan: WeeklyPlan | null;
    milestones: WeeklyMilestone[];
    evaluation: PlanEvaluation | null;
  };
  split_name: string;
  recent_steps: { date: string; steps: number }[];
}

function readDate(request: Request): string {
  const requested = new URL(request.url).searchParams.get('date');
  return requested || localIsoDate();
}

/** Everything the dashboard needs to answer "what should I do today?". */
export async function GET(request: Request) {
  try {
    const date = readDate(request);

    const profile = getProfile();
    const logs = getAllDailyLogs();
    const exercises = getExercises();
    const log = getDailyLog(date);
    const split = resolveSplit(profile);

    // Is a session expected today? The workout engine owns that decision, so ask
    // it first and feed its answer into the energy budget.
    const workout = buildWorkoutRecommendation({ profile, logs, exercises, date });

    const energy = buildEnergyRecommendation({
      profile,
      log,
      trainingPlanned: workout.ready && !workout.is_rest_day,
      trainingMinutes: workout.estimated_minutes,
    });

    const steps = buildStepsRecommendation(profile, log);
    const weekly = resolveWeeklyPlan(profile, logs, date, getWeeklyPlan());

    const recent_steps = logs
      .filter((l) => typeof l.steps === 'number' && (l.steps as number) > 0)
      .slice(-14)
      .map((l) => ({ date: l.date, steps: l.steps as number }));

    const payload: RecommendationPayload = {
      date,
      energy,
      workout,
      steps,
      weekly: {
        ready: weekly.ready,
        blockedReason: weekly.blockedReason,
        plan: weekly.plan,
        milestones: weekly.milestones,
        evaluation: weekly.evaluation,
      },
      split_name: split.name,
      recent_steps,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Record the day's steps. Steps live inside the daily log (a day is a row), so
 * this is a partial update that preserves every other field on that day.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date: string = body.date || localIsoDate();
    const steps = Number(body.steps);

    if (!Number.isFinite(steps) || steps < 0 || steps > 200_000) {
      return NextResponse.json(
        { error: 'Số bước chân không hợp lệ (0 - 200.000).' },
        { status: 400 },
      );
    }

    const profile = getProfile();
    const existing = getDailyLog(date);

    const log = existing ?? {
      date,
      weight_kg: null,
      calories_target: profile.target_calories || 0,
      calories_consumed: 0,
      macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
      meals: [],
      workout: {
        completed: false,
        session_name: '',
        duration_minutes: 0,
        total_volume_kg: 0,
        exercises: [],
      },
      notes: '',
    };

    log.date = date;
    log.steps = Math.round(steps);
    log.steps_target = profile.steps_target || 8000;
    saveDailyLog(date, log);

    return NextResponse.json({
      success: true,
      date,
      steps: log.steps,
      steps_target: log.steps_target,
      log,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
