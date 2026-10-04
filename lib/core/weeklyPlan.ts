/**
 * Long-term goal -> weekly milestones.
 *
 * A goal like "68 kg" is unactionable on a Tuesday. This module turns it into a
 * dated ladder of weekly checkpoints so each week can be judged on its own, and
 * the verdict for a finished week is stored rather than recomputed, so a past
 * week never silently changes its mind.
 */
import type { DailyLog, Profile, WeeklyMilestone, WeeklyPlan } from '../data';
import { isProfileReady } from '../profile';
import { shiftDay } from '../format';

/** A week counts as hit when the weigh-in lands within this much of the target. */
export const MILESTONE_TOLERANCE_KG = 0.3;
/** How far before / after the nominal end date a weigh-in still counts. */
export const WEIGH_IN_WINDOW_DAYS = 4;
/** Hard stop so a near-zero rate cannot generate a thousand-week plan. */
export const MAX_WEEKS = 104;
/**
 * Measured pace below this share of the planned pace counts as behind. 0.6 is
 * deliberately forgiving: a plan that asks 0.5 kg/week while you actually lose
 * 0.35 is still progress, and crying "behind" at that level trains people to
 * ignore the signal.
 */
export const RATE_TOLERANCE = 0.6;

export interface PlanEvaluation {
  achieved: boolean;
  targetDates: number;
  done: number;
  missed: number;
  /** Weeks already past, whatever the outcome. */
  elapsed: number;
  /** Rate actually achieved so far, kg/week (last 14 days). */
  actualRateKgPerWeek: number | null;
  /** What the plan expects of the current week. */
  expectedNowKg: number | null;
  /** Signed distance from where the plan says you should be; negative = ahead on a cut. */
  varianceKg: number | null;
  /** Milestones remaining after the current one. */
  weeksRemaining: number;
  /** True when the measured pace is slower than the plan requires. */
  behindSchedule: boolean;
}

export interface WeeklyPlanResult {
  ready: boolean;
  blockedReason?: string;
  plan: WeeklyPlan | null;
  milestones: WeeklyMilestone[];
  evaluation: PlanEvaluation | null;
}

/* ── Building ───────────────────────────────────────────────────────────────*/

/** Calories per kg of body mass change, the same constant Adaptive TDEE uses. */
const KCAL_PER_KG = 7700;

/**
 * Build a fresh plan from the profile. Deterministic: same inputs, same output,
 * so calling it repeatedly is safe.
 */
export function buildWeeklyPlan(
  profile: Profile,
  logs: DailyLog[],
  createdDate: string,
): WeeklyPlan | null {
  if (!isProfileReady(profile)) return null;
  if (profile.current_weight_kg <= 0 || profile.target_weight_kg <= 0) return null;
  if (!profile.weekly_target_rate_kg) return null;

  const delta = Math.round((profile.target_weight_kg - profile.current_weight_kg) * 100) / 100;
  if (Math.abs(delta) < 0.1) return null;

  // Direction is implied by the numbers, but a sign mismatch would build a plan
  // that walks away from the goal, so take the sign of the actual distance.
  const rate = Math.sign(delta) * Math.abs(profile.weekly_target_rate_kg);
  const totalWeeks = Math.min(MAX_WEEKS, Math.max(1, Math.ceil(Math.abs(delta) / Math.abs(rate))));

  // Daily energy shift implied by the planned rate, applied to the base target.
  const dailyShift = Math.round((Math.abs(rate) * KCAL_PER_KG) / 7);
  const baseCalories =
    profile.target_calories > 0
      ? profile.target_calories
      : Math.round(profile.current_tdee - dailyShift);

  const milestones: WeeklyMilestone[] = [];
  let cursorWeight = profile.current_weight_kg;

  for (let week = 1; week <= totalWeeks; week++) {
    const start = shiftDay(createdDate, (week - 1) * 7);
    const end = shiftDay(createdDate, week * 7 - 1);

    // Land exactly on the goal in the final week instead of overshooting by a
    // rounding remainder.
    const isFinal = week === totalWeeks;
    const nextWeight = isFinal
      ? profile.target_weight_kg
      : Math.round((cursorWeight + rate) * 100) / 100;
    const delta_kg = Math.round((nextWeight - cursorWeight) * 100) / 100;

    milestones.push({
      week,
      start_date: start,
      end_date: end,
      target_weight_kg: nextWeight,
      delta_kg,
      target_calories: baseCalories,
      status: 'upcoming',
    });

    cursorWeight = nextWeight;
  }

  return {
    goal_type: profile.goal_type,
    created_at: createdDate,
    start_date: createdDate,
    start_weight_kg: profile.current_weight_kg,
    target_weight_kg: profile.target_weight_kg,
    weekly_rate_kg: Math.round(rate * 100) / 100,
    milestones,
  };
}

/* ── Evaluating ─────────────────────────────────────────────────────────────*/

function averageWeightIn(logs: DailyLog[], from: string, to: string): number | null {
  const inRange = logs.filter(
    (l) => l.date >= from && l.date <= to && typeof l.weight_kg === 'number' && l.weight_kg > 0,
  );
  if (inRange.length === 0) return null;
  const sum = inRange.reduce((s, l) => s + (l.weight_kg as number), 0);
  return Math.round((sum / inRange.length) * 100) / 100;
}

/** Average weight over the trailing 14 days, for a measured rate of change. */
function recentWeighIns(logs: DailyLog[], until: string, days: number): DailyLog[] {
  const from = shiftDay(until, -days);
  return logs
    .filter(
      (l) =>
        l.date >= from &&
        l.date <= until &&
        typeof l.weight_kg === 'number' &&
        (l.weight_kg as number) > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function measuredRate(logs: DailyLog[], until: string): number | null {
  const points = recentWeighIns(logs, until, 14);
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const spanDays = Math.max(
    1,
    Math.round(
      (new Date(`${last.date}T00:00:00`).getTime() -
        new Date(`${first.date}T00:00:00`).getTime()) /
        86_400_000,
    ),
  );
  const change = (last.weight_kg as number) - (first.weight_kg as number);
  return Math.round((change / spanDays) * 7 * 100) / 100;
}

/**
 * Evaluate a plan against the log store. Mutates nothing: returns a fresh
 * milestone list with verdicts filled in.
 */
export function evaluateWeeklyPlan(
  plan: WeeklyPlan,
  logs: DailyLog[],
  today: string,
): { milestones: WeeklyMilestone[]; evaluation: PlanEvaluation } {
  const milestones = plan.milestones.map((m) => ({ ...m }));

  for (const m of milestones) {
    // Judge a week from weigh-ins near its end, allowing a few days of slack.
    const windowStart = shiftDay(m.end_date, -WEIGH_IN_WINDOW_DAYS);
    const windowEnd = shiftDay(m.end_date, WEIGH_IN_WINDOW_DAYS);
    const actual = averageWeightIn(logs, windowStart, windowEnd);

    const hasEnded = today > m.end_date;
    const isCurrent = today >= m.start_date && today <= m.end_date;

    if (actual !== null) {
      m.actual_weight_kg = actual;
      m.variance_kg = Math.round((actual - m.target_weight_kg) * 100) / 100;
    }

    if (isCurrent) {
      m.status = 'active';
    } else if (!hasEnded) {
      m.status = 'upcoming';
    } else if (actual === null) {
      // Week is over with nothing to judge it by. "Missed" would be a lie.
      m.status = 'done';
    } else {
      m.status = Math.abs(m.variance_kg ?? 0) <= MILESTONE_TOLERANCE_KG ? 'done' : 'missed';
    }
  }

  const achieved =
    typeof plan.target_weight_kg === 'number' &&
    plan.target_weight_kg > 0 &&
    (() => {
      const latest = logs
        .filter((l) => typeof l.weight_kg === 'number' && (l.weight_kg as number) > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .pop();
      if (!latest) return false;
      const w = latest.weight_kg as number;
      const goingDown = plan.target_weight_kg < plan.start_weight_kg;
      return goingDown
        ? w <= plan.target_weight_kg + MILESTONE_TOLERANCE_KG
        : w >= plan.target_weight_kg - MILESTONE_TOLERANCE_KG;
    })();

  const elapsed = milestones.filter((m) => m.status !== 'upcoming' && m.status !== 'active').length;
  const done = milestones.filter((m) => m.status === 'done').length;
  const missed = milestones.filter((m) => m.status === 'missed').length;
  const activeIndex = milestones.findIndex((m) => m.status === 'active');
  const weeksRemaining = activeIndex >= 0 ? milestones.length - activeIndex - 1 : 0;

  const rate = measuredRate(logs, today);
  const expectedNow =
    activeIndex >= 0
      ? milestones[activeIndex].target_weight_kg
      : elapsed > 0
        ? milestones[elapsed - 1].target_weight_kg
        : plan.start_weight_kg;

  const latestWeight = (() => {
    const latest = logs
      .filter((l) => typeof l.weight_kg === 'number' && (l.weight_kg as number) > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop();
    return latest ? (latest.weight_kg as number) : null;
  })();

  const variance =
    latestWeight !== null ? Math.round((latestWeight - expectedNow) * 100) / 100 : null;

  // "Behind" has to mean one of two concrete things, or it is noise:
  //   - the trend is moving against the goal (gaining on a cut), or
  //   - it is progressing, but at less than RATE_TOLERANCE of the planned pace.
  let behindSchedule = false;
  if (rate !== null && Math.abs(plan.weekly_rate_kg) > 0) {
    const sameDirection = Math.sign(rate) === Math.sign(plan.weekly_rate_kg);
    behindSchedule =
      !sameDirection || Math.abs(rate) < Math.abs(plan.weekly_rate_kg) * RATE_TOLERANCE;
  }

  return {
    milestones,
    evaluation: {
      achieved,
      targetDates: milestones.length,
      done,
      missed,
      elapsed,
      actualRateKgPerWeek: rate,
      expectedNowKg: Math.round(expectedNow * 100) / 100,
      varianceKg: variance,
      weeksRemaining,
      behindSchedule,
    },
  };
}

/** Convenience: build if missing, then evaluate. Pure — never writes to disk. */
export function resolveWeeklyPlan(
  profile: Profile,
  logs: DailyLog[],
  today: string,
  stored: WeeklyPlan | null,
): WeeklyPlanResult {
  const plan = stored ?? buildWeeklyPlan(profile, logs, today);

  if (!plan) {
    return {
      ready: false,
      blockedReason: isProfileReady(profile)
        ? 'Cần cân nặng hiện tại, cân nặng mục tiêu và tốc độ thay đổi mỗi tuần để chia kế hoạch.'
        : 'Hồ sơ chưa có đủ thông số để lập kế hoạch tuần.',
      plan: null,
      milestones: [],
      evaluation: null,
    };
  }

  const { milestones, evaluation } = evaluateWeeklyPlan(plan, logs, today);
  return { ready: true, plan, milestones, evaluation };
}

/** Today's plan row, for the "what does this week ask of me" summary. */
export function currentMilestone(
  milestones: WeeklyMilestone[],
): WeeklyMilestone | null {
  return milestones.find((m) => m.status === 'active') ?? null;
}
