/**
 * Recommendation engine.
 *
 * Answers two questions with arithmetic only — no invented numbers, no LLM:
 *   1. What should I eat today to still land on my goal?
 *   2. What session should I train today, and at what load?
 *
 * Every constant below is an estimate and is surfaced in the UI as an estimate.
 * Where the profile is incomplete the engine returns `ready: false` instead of
 * substituting a default, matching the store's "no mock numbers" rule.
 */
import type { DailyLog, Exercise, Profile, SplitConfig, SplitDay } from '../data';
import { formatDateShort, shiftDay } from '../format';

/* ── Estimates, named so they can be argued with ─────────────────────────────
   Total daily energy expenditure already contains ordinary daily movement, so
   steps are only credited ABOVE a sedentary baseline. Training is credited at
   its net cost (gross burn minus the resting burn it replaces). */
export const KCAL_PER_STEP = 0.045;
export const SEDENTARY_STEPS = 6000;
export const SEDENTARY_STEP_GOAL = 8000;
export const TRAINING_KCAL_PER_MIN = 6.5;
export const NET_TRAINING_FACTOR = 0.7;
export const ACTIVITY_EAT_BACK = 0.5;
/** Guard rail: activity may not move the day's budget more than this much. */
export const ACTIVITY_ADJUSTMENT_CAP = 400;
export const DEFAULT_STEPS_TARGET = 8000;
/** Rest days are spread evenly, so 4 sessions/week lands every other day. */
/** A week has seven days; 7 sessions means no rest day at all. */
export const MAX_TRAINING_DAYS = 7;
/** Sessions used to infer which split day comes next. */
export const ROTATION_LOOKBACK_DAYS = 14;

export interface MacroSuggestion {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface EnergyRecommendation {
  ready: boolean;
  /** Populated when `ready` is false. */
  blockedReason?: string;
  /** The profile's planned intake, before today's activity is considered. */
  baseTarget: number;
  steps: number;
  stepsTarget: number;
  stepsSource: 'logged' | 'none';
  stepsKcal: number;
  trainingPlanned: boolean;
  trainingMinutes: number;
  trainingKcal: number;
  activityAdjustment: number;
  /** baseTarget + activityAdjustment. What to aim for today. */
  adjustedTarget: number;
  consumed: number;
  /** adjustedTarget - consumed. Negative means over. */
  remainingToEat: number;
  /** The macro split still owed for the rest of today. */
  remainingMacros: MacroSuggestion;
  /** A per-meal suggestion only when it is useful, i.e. at least ~250 kcal left. */
  mealSuggestion: { calories: number; macros: MacroSuggestion } | null;
  macroTargets: MacroSuggestion;
  status: 'under' | 'on-target' | 'over';
  notes: string[];
}

export interface WorkoutSuggestionItem {
  exercise_id: string;
  name: string;
  target_muscle: string;
  /** 1RM we are working from, and where it came from. */
  one_rm: number;
  one_rm_source: 'personal_record' | 'estimated';
  /** Weight to work up to today. */
  top_set_weight_kg: number;
  /** Reps to chase at that weight before adding load. */
  reps: number;
  /** Total working sets, warm-ups excluded. */
  sets: number;
  /** Weight suggestion per set, lightest first. */
  set_weights: number[];
  /** Heaviest load already logged for this lift, when history exists. */
  last_logged_weight_kg?: number;
  /** The instruction that turns last session into this session. */
  progression: string;
}

export interface WorkoutRecommendation {
  ready: boolean;
  blockedReason?: string;
  is_rest_day: boolean;
  day_name: string;
  split_name: string;
  /** 1-based position in the rotation. */
  day_index: number;
  total_days: number;
  muscles: string[];
  rationale: string;
  items: WorkoutSuggestionItem[];
  estimated_volume_kg: number;
  estimated_minutes: number;
  /** Where we think this rotation continues from. */
  rotation_source: 'history' | 'start' | 'override';
  /** True when the user pinned today's session instead of following the rotation. */
  overridden: boolean;
  last_session?: { date: string; name: string };
  cardio: { stepsTarget: number; kcal: number };
}

/* ── Defaults ───────────────────────────────────────────────────────────────*/

/** Upper / Lower twice each: the default until the profile says otherwise. */
export const DEFAULT_SPLIT: SplitConfig = {
  name: 'Upper / Lower (4 buổi)',
  days: [
    { name: 'Upper A (Push Focus)', muscles: ['Chest', 'Shoulders', 'Triceps', 'Back'] },
    { name: 'Lower A (Squat Focus)', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
    { name: 'Upper B (Pull Focus)', muscles: ['Back', 'Biceps', 'Lats', 'Shoulders'] },
    { name: 'Lower B (Hinge Focus)', muscles: ['Hamstrings', 'Glutes', 'Quads', 'Calves'] },
  ],
};

const PPL_SPLIT: SplitConfig = {
  name: 'Push / Pull / Legs (6 buổi)',
  days: [
    { name: 'Push (Ngực - Vai - Tay sau)', muscles: ['Chest', 'Shoulders', 'Triceps'] },
    { name: 'Pull (Lưng - Tay trước)', muscles: ['Back', 'Lats', 'Biceps'] },
    { name: 'Legs (Chân - Mông)', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  ],
};

const UPPER_LOWER_DAYS = [
  { name: 'Upper A (Push Focus)', muscles: ['Chest', 'Shoulders', 'Triceps'] },
  { name: 'Lower A (Squat Focus)', muscles: ['Quads', 'Hamstrings', 'Glutes'] },
  { name: 'Upper B (Pull Focus)', muscles: ['Back', 'Biceps'] },
  { name: 'Lower B (Hinge Focus)', muscles: ['Hamstrings', 'Glutes', 'Calves'] },
];

const FULL_BODY_DAYS = [
  { name: 'Full Body A', muscles: ['Quads', 'Chest', 'Back', 'Shoulders'] },
  { name: 'Full Body B', muscles: ['Hamstrings', 'Back', 'Chest', 'Triceps'] },
  { name: 'Full Body C', muscles: ['Quads', 'Shoulders', 'Lats', 'Biceps'] },
];

/**
 * Resolve the rotation from the profile. `split_name` is free text typed by the
 * user, so we match on loose keywords and fall back to Upper/Lower.
 */
export function resolveSplit(profile: Profile): SplitConfig {
  if (profile.split_config?.days?.length) return profile.split_config;

  const name = (profile.split_name ?? '').toLowerCase();
  if (/push|pull|legs|ppl/.test(name)) return PPL_SPLIT;
  if (/full\s*body|toàn thân/.test(name)) {
    return { name: profile.split_name || 'Full Body', days: FULL_BODY_DAYS };
  }
  if (/upper|lower/.test(name)) {
    return { name: profile.split_name || DEFAULT_SPLIT.name, days: UPPER_LOWER_DAYS };
  }

  // Only the number of sessions is known: take that many days from Upper/Lower.
  const perWeek = Math.min(
    Math.max(profile.training_days_per_week || DEFAULT_SPLIT.days.length, 1),
    DEFAULT_SPLIT.days.length,
  );
  return {
    name: profile.split_name || DEFAULT_SPLIT.name,
    days: DEFAULT_SPLIT.days.slice(0, perWeek),
  };
}

/**
 * Even spread of N sessions across a 7-day week.
 *
 * Derived from the REST days rather than the training days: `floor(i * 7 / r)`
 * always yields exactly `r` distinct slots, so a 6-session week really gets one
 * rest day instead of collapsing, and 3/4-session weeks come out alternating.
 *   3/week -> Tue, Thu, Sat      4/week -> Mon, Wed, Fri, Sat
 */
export function trainingDaysOfWeek(perWeek: number): Set<number> {
  const n = Math.min(Math.max(Math.round(perWeek) || 0, 0), MAX_TRAINING_DAYS);
  const days = new Set<number>();
  if (n <= 0) return days;
  if (n >= 7) {
    for (let d = 0; d < 7; d++) days.add(d);
    return days;
  }

  const restCount = 7 - n;
  const restDays = new Set<number>();
  for (let i = 0; i < restCount; i++) {
    restDays.add(Math.floor((i * 7) / restCount) % 7);
  }
  for (let d = 0; d < 7; d++) {
    if (!restDays.has(d)) days.add(d);
  }
  return days;
}

export function isRestDay(perWeek: number, iso: string): boolean {
  const perWeekClamped = Math.min(Math.max(Math.round(perWeek) || 0, 0), MAX_TRAINING_DAYS);
  if (perWeekClamped >= 7) return false;
  if (perWeekClamped <= 0) return true;
  const dow = new Date(`${iso}T00:00:00`).getDay();
  return !trainingDaysOfWeek(perWeekClamped).has(dow);
}/* ── Energy ─────────────────────────────────────────────────────────────────*/

export function macroTargetsOf(profile: Profile): MacroSuggestion {
  return {
    protein_g: profile.macros_target?.protein_g ?? 0,
    carbs_g: profile.macros_target?.carbs_g ?? 0,
    fat_g: profile.macros_target?.fat_g ?? 0,
  };
}

function isReady(profile: Profile): boolean {
  return Boolean(
    profile.name?.trim() &&
      profile.age > 0 &&
      profile.height_cm > 0 &&
      profile.current_weight_kg > 0 &&
      profile.target_calories > 0,
  );
}

/** Split `calories` across the profile's macro ratio. */
function macrosForCalories(calories: number, profile: Profile): MacroSuggestion {
  const target = macroTargetsOf(profile);
  const kcalFromTargets = target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9;
  if (kcalFromTargets <= 0 || calories <= 0) {
    return { protein_g: 0, carbs_g: 0, fat_g: 0 };
  }
  const scale = calories / kcalFromTargets;
  return {
    protein_g: Math.round(target.protein_g * scale),
    carbs_g: Math.round(target.carbs_g * scale),
    fat_g: Math.round(target.fat_g * scale),
  };
}

export interface EnergyInput {
  profile: Profile;
  log: DailyLog | null;
  /** Minutes of training planned today, used to credit the burn. */
  trainingMinutes?: number;
  trainingPlanned?: boolean;
}

export function buildEnergyRecommendation({
  profile,
  log,
  trainingMinutes = 0,
  trainingPlanned = false,
}: EnergyInput): EnergyRecommendation {
  const macroTargets = macroTargetsOf(profile);
  const baseTarget = profile.target_calories || 0;
  const steps = Math.max(0, Math.round(log?.steps ?? 0));
  const stepsTarget = profile.steps_target || DEFAULT_STEPS_TARGET;

  const blank = (reason: string): EnergyRecommendation => ({
    ready: false,
    blockedReason: reason,
    baseTarget,
    steps,
    stepsTarget,
    stepsSource: steps > 0 ? 'logged' : 'none',
    stepsKcal: 0,
    trainingPlanned,
    trainingMinutes,
    trainingKcal: 0,
    activityAdjustment: 0,
    adjustedTarget: 0,
    consumed: log?.calories_consumed ?? 0,
    remainingToEat: 0,
    remainingMacros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
    mealSuggestion: null,
    macroTargets,
    status: 'under',
    notes: [],
  });

  if (!isReady(profile)) {
    return blank('Hồ sơ chưa có đủ thông số cơ thể và calo mục tiêu.');
  }

  const notes: string[] = [];

  // Movement credit, only above the sedentary baseline baked into the TDEE.
  const stepsAboveBaseline = Math.max(0, steps - SEDENTARY_STEPS);
  let stepsKcal = Math.round(stepsAboveBaseline * KCAL_PER_STEP);
  if (steps > 0 && steps <= SEDENTARY_STEPS) {
    notes.push(
      `Số bước hôm nay (${steps.toLocaleString('en-US')}) chưa vượt mức vận động nền ${SEDENTARY_STEPS.toLocaleString('en-US')}, nên chưa cộng thêm calo.`,
    );
  } else if (steps > 0) {
    notes.push(
      `Đi bộ ${steps.toLocaleString('en-US')} bước: phần vượt mức nền đốt thêm ~${stepsKcal} kcal, ` +
        `và được cộng lại ${Math.round(ACTIVITY_EAT_BACK * 100)}% (~${Math.round(stepsKcal * ACTIVITY_EAT_BACK)} kcal) vào hạn mức ăn.`,
    );
  } else {
    notes.push('Chưa ghi số bước chân hôm nay, nên chưa tính phần calo vận động.');
  }

  const trainingKcal = trainingPlanned
    ? Math.round(trainingMinutes * TRAINING_KCAL_PER_MIN * NET_TRAINING_FACTOR)
    : 0;

  const rawAdjustment = Math.round(stepsKcal * ACTIVITY_EAT_BACK + trainingKcal * ACTIVITY_EAT_BACK);
  const activityAdjustment = Math.max(
    -ACTIVITY_ADJUSTMENT_CAP,
    Math.min(ACTIVITY_ADJUSTMENT_CAP, rawAdjustment),
  );

  if (trainingPlanned && trainingMinutes > 0) {
    notes.push(
      `Buổi tập ~${trainingMinutes} phút được tính ~${trainingKcal} kcal, cộng lại ${Math.round(ACTIVITY_EAT_BACK * 100)}% để không phá thâm hụt.`,
    );
  }

  const adjustedTarget = Math.max(0, baseTarget + activityAdjustment);
  const consumed = log?.calories_consumed ?? 0;
  const remainingToEat = adjustedTarget - consumed;

  const status: EnergyRecommendation['status'] =
    remainingToEat < -50 ? 'over' : remainingToEat <= 50 ? 'on-target' : 'under';

  // A leftover budget is what actually gets spent, clamped to the day's target
  // so an under-eaten day never suggests one absurd meal.
  const remainingMacros: MacroSuggestion =
    remainingToEat > 0
      ? {
          protein_g: Math.max(0, Math.round(macroTargets.protein_g - (log?.macros?.protein_g ?? 0))),
          carbs_g: Math.max(0, Math.round(macroTargets.carbs_g - (log?.macros?.carbs_g ?? 0))),
          fat_g: Math.max(0, Math.round(macroTargets.fat_g - (log?.macros?.fat_g ?? 0))),
        }
      : { protein_g: 0, carbs_g: 0, fat_g: 0 };

  let mealSuggestion: EnergyRecommendation['mealSuggestion'] = null;
  if (remainingToEat >= 250) {
    const kcal = Math.min(remainingToEat, Math.max(400, Math.round(adjustedTarget * 0.28)));
    mealSuggestion = { calories: kcal, macros: macrosForCalories(kcal, profile) };
  }

  return {
    ready: true,
    baseTarget,
    steps,
    stepsTarget,
    stepsSource: steps > 0 ? 'logged' : 'none',
    stepsKcal: Math.max(0, stepsKcal),
    trainingPlanned,
    trainingMinutes,
    trainingKcal,
    activityAdjustment,
    adjustedTarget,
    consumed,
    remainingToEat,
    remainingMacros,
    mealSuggestion,
    macroTargets,
    status,
    notes,
  };
}

export interface StepsRecommendation {
  steps: number;
  target: number;
  pct: number;
  /** Gross kcal moved today, for context only. */
  kcalBurned: number;
  /** The kcal actually added back to today's eating budget. */
  kcalCredit: number;
  remaining: number;
}

export function buildStepsRecommendation(
  profile: Profile,
  log: DailyLog | null,
): StepsRecommendation | null {
  if (!isReady(profile)) return null;

  const steps = Math.max(0, Math.round(log?.steps ?? 0));
  const target = profile.steps_target || DEFAULT_STEPS_TARGET;
  return {
    steps,
    target,
    pct: target > 0 ? Math.min(100, Math.round((steps / target) * 100)) : 0,
    kcalBurned: Math.round(steps * KCAL_PER_STEP),
    kcalCredit: Math.round(
      Math.max(0, steps - SEDENTARY_STEPS) * KCAL_PER_STEP * ACTIVITY_EAT_BACK,
    ),
    remaining: Math.max(0, target - steps),
  };
}

/* ── Workouts ───────────────────────────────────────────────────────────────*/

/** Fractional 1RM loads that define a session's shape. */
type LoadScheme = { pct: number; reps: number; sets: number };

const HYPERTROPHY: LoadScheme = { pct: 0.75, reps: 10, sets: 3 };
const STRENGTH: LoadScheme = { pct: 0.85, reps: 5, sets: 4 };
const MIXED: LoadScheme = { pct: 0.8, reps: 8, sets: 3 };

/** Rotating session shapes so the same lift is not always trained the same way. */
const SCHEME_CYCLE: LoadScheme[] = [HYPERTROPHY, MIXED, STRENGTH];

function schemeForIndex(index: number): LoadScheme {
  return SCHEME_CYCLE[index % SCHEME_CYCLE.length];
}

/** Round to the nearest loadable jump: 2.5 kg under 60, 5 kg above. */
function roundLoad(kg: number): number {
  if (kg <= 0) return 0;
  const step = kg < 60 ? 2.5 : 5;
  return Math.round(kg / step) * step;
}

/** Round to the nearest pair of dumbbells, which move in 2 kg jumps. */
function roundDumbbell(kg: number): number {
  if (kg <= 0) return 0;
  return Math.max(2, Math.round(kg / 2) * 2);
}

type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

function equipmentOf(exercise: Exercise): Equipment {
  const name = exercise.name.toLowerCase();
  if (/dumbbell|db\b/.test(name)) return 'dumbbell';
  if (/cable|machine|smith|pushdown|pulldown|leg press|pec deck|extension|curl machine/.test(name)) {
    return 'machine';
  }
  if (/barbell|bench press|squat|deadlift|overhead press|\brow\b/.test(name)) return 'barbell';
  if (/pull-?up|chin-?up|push-?up|dip|plank|bodyweight/.test(name)) return 'bodyweight';
  return 'machine';
}

/**
 * Starting load when a lift has no PR and no logged history.
 *
 * Expressed as a multiple of bodyweight and then reduced to a working weight by
 * the session's intensity, because "guess a 1RM" produces obvious nonsense
 * otherwise (a 74 kg beginner cannot press 70 kg overhead, and a dumbbell press
 * is not loaded like a barbell). These ratios are deliberately conservative:
 * the first session should feel light, and the engine only needs to be right
 * enough to be safe. Every figure derived this way is labelled "ước tính".
 */
const STRENGTH_RATIO: Record<Equipment, number> = {
  barbell: 0.95,
  dumbbell: 0.34,
  machine: 0.6,
  bodyweight: 0.7,
};

/** Isolation work moves far less load than the compound it assists. */
function fallbackRatio(exercise: Exercise): number {
  const equipment = equipmentOf(exercise);
  const name = exercise.name.toLowerCase();
  const base = STRENGTH_RATIO[equipment];
  if (exercise.category === 'Isolation') return base * 0.55;
  if (/overhead press|\bohp\b|shoulder press|lateral raise/.test(name)) return base * 0.62;
  return base;
}

/** Descending working-set ladder, lightest first, top set last. */
function setLadder(topWeight: number, sets: number): number[] {
  const step = topWeight < 60 ? 2.5 : 5;
  const weights: number[] = [];
  for (let i = 0; i < sets; i++) {
    // First set is two steps lighter, then one step per rung.
    const back = (sets - 1 - i) * step + (i === 0 ? step : 0);
    weights.push(Math.max(0, roundLoad(Math.max(topWeight - back, topWeight * 0.7))));
  }
  return weights;
}

/** Muscles are free text, so matching is loose in both directions. */
function matchesMuscle(exerciseMuscle: string, wanted: string[]): boolean {
  const em = exerciseMuscle.toLowerCase();
  return wanted.some((w) => {
    const wl = w.toLowerCase();
    return em.includes(wl) || wl.includes(em) || em.split(/[\s/]+/).includes(wl);
  });
}

function minutesFor(setCount: number, exerciseCount: number): number {
  return Math.max(30, Math.round(exerciseCount * 7 + setCount * 2.2));
}

/**
 * Which split day comes next. We look at the newest completed session in the
 * recent window, find which split day it looks like, and advance one step.
 */
function resolveRotationDay(
  profile: Profile,
  split: SplitConfig,
  logs: DailyLog[],
  date: string,
): { index: number; source: 'history' | 'start'; last?: DailyLog } {
  const history = logs
    .filter((l) => l.date < date && l.workout?.completed && l.workout.exercises.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cutoff = shiftDay(date, -ROTATION_LOOKBACK_DAYS);
  const recent = history.filter((l) => l.date >= cutoff);
  const last = recent[recent.length - 1];
  if (!last) return { index: 0, source: 'start' };

  const sessionName = (last.workout.session_name ?? '').toLowerCase();
  const muscles = last.workout.exercises.map((e) => e.exercise_name.toLowerCase()).join(' ');

  // Prefer matching the session name, then fall back to muscle groups.
  let matched = split.days.findIndex((d) => {
    const needle = d.name.toLowerCase().split(' ')[0];
    return needle.length > 2 && sessionName.includes(needle);
  });

  if (matched < 0) {
    let best = { index: -1, score: 0 };
    split.days.forEach((d, i) => {
      const score = d.muscles.filter((m) => muscles.includes(m.toLowerCase())).length;
      if (score > best.score) best = { index: i, score };
    });
    matched = best.index;
  }

  if (matched < 0) return { index: 0, source: 'history', last };
  return { index: (matched + 1) % split.days.length, source: 'history', last };
}

/**
 * Loose name match between a stored override and the split's days.
 *
 * The override is written by the coach from free text ("tập chân"), so it is
 * matched by exact name first, then by the leading token ("Lower" in
 * "Lower A (Squat Focus)"), then as a substring in either direction.
 */
export function matchSplitDay(split: SplitConfig, wanted: string): number {
  const needle = wanted.trim().toLowerCase();
  if (!needle) return -1;

  const exact = split.days.findIndex((d) => d.name.toLowerCase() === needle);
  if (exact >= 0) return exact;

  const first = needle.split(/[\s(]+/)[0];
  const byFirst = split.days.findIndex((d) => first.length > 2 && d.name.toLowerCase().includes(first));
  if (byFirst >= 0) return byFirst;

  return split.days.findIndex((d) => {
    const name = d.name.toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });
}

/**
 * Accessory pairing. A split day names its main muscles, but those alone can be
 * a two-exercise session when the library is small. Each primary muscle pulls in
 * the muscles that normally train alongside it, so a Push day fills out with
 * triceps and side delts instead of stopping at the presses.
 */
const ACCESSORY_MAP: Record<string, string[]> = {
  chest: ['triceps', 'shoulders', 'side delts'],
  back: ['lats', 'biceps'],
  lats: ['back', 'biceps'],
  shoulders: ['side delts', 'triceps'],
  'side delts': ['shoulders'],
  quads: ['calves', 'hamstrings'],
  hamstrings: ['glutes', 'calves'],
  glutes: ['hamstrings', 'quads'],
  biceps: ['back'],
  triceps: ['chest'],
  calves: ['quads', 'hamstrings'],
  abs: ['quads'],
};

function accessoryMusclesFor(day: SplitDay): string[] {
  const out = new Set<string>();
  for (const muscle of day.muscles) {
    for (const adjacent of ACCESSORY_MAP[muscle.toLowerCase()] ?? []) out.add(adjacent);
  }
  // Never re-list a muscle the day already targets as a primary.
  for (const primary of day.muscles) out.delete(primary.toLowerCase());
  // Array.from rather than spread: the project targets ES5, where spreading a
  // Set is not allowed without downlevelIteration.
  return Array.from(out);
}

const MAX_EXERCISES_PER_SESSION = 5;
const MIN_EXERCISES_PER_SESSION = 4;

function rankExercises(list: Exercise[]): Exercise[] {
  const rank = (e: Exercise) => (e.category === 'Compound' ? 0 : e.category === 'Machine' ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

function chooseExercises(pool: Exercise[], day: SplitDay): Exercise[] {
  const primary = pool.filter((e) => matchesMuscle(e.target_muscle, day.muscles));
  const chosen = rankExercises(primary).slice(0, MAX_EXERCISES_PER_SESSION);
  if (chosen.length >= MIN_EXERCISES_PER_SESSION) return chosen;

  const taken = new Set(chosen.map((e) => e.id));
  const accessory = rankExercises(
    pool.filter((e) => !taken.has(e.id) && matchesMuscle(e.target_muscle, accessoryMusclesFor(day))),
  );

  for (const exercise of accessory) {
    if (chosen.length >= MAX_EXERCISES_PER_SESSION) break;
    chosen.push(exercise);
  }

  // A tiny library still has to produce a session: fall back to whatever exists.
  if (chosen.length === 0) return rankExercises(pool).slice(0, MAX_EXERCISES_PER_SESSION);
  return chosen;
}

export interface WorkoutInput {
  profile: Profile;
  logs: DailyLog[];
  exercises: Exercise[];
  date: string;
}

export function buildWorkoutRecommendation({
  profile,
  logs,
  exercises,
  date,
}: WorkoutInput): WorkoutRecommendation {
  const split = resolveSplit(profile);
  const stepsTarget = profile.steps_target || DEFAULT_STEPS_TARGET;

  if (!isReady(profile)) {
    return {
      ready: false,
      blockedReason: 'Hồ sơ chưa có đủ thông số cơ thể và mục tiêu calo.',
      is_rest_day: false,
      day_name: '',
      split_name: split.name,
      day_index: 0,
      total_days: split.days.length,
      muscles: [],
      rationale: '',
      items: [],
      estimated_volume_kg: 0,
      estimated_minutes: 0,
      rotation_source: 'start',
      overridden: false,
      cardio: { stepsTarget, kcal: 0 },
    };
  }

  // A day-level pin beats the weekly schedule and the rotation: if the user says
  // "hôm nay tập chân", that is the session, even on a scheduled rest day.
  const todayLog = logs.find((l) => l.date === date);
  const overrideName = todayLog?.session_override?.trim() ?? '';
  const overrideIndex = overrideName ? matchSplitDay(split, overrideName) : -1;
  const overridden = overrideIndex >= 0;

  const rest = isRestDay(profile.training_days_per_week, date) && !overridden;

  if (rest) {
    return {
      ready: true,
      is_rest_day: true,
      day_name: 'Ngày nghỉ phục hồi',
      split_name: split.name,
      day_index: 0,
      total_days: split.days.length,
      muscles: [],
      rationale: `Giáo án ${split.name} xếp ${profile.training_days_per_week} buổi mỗi tuần, hôm nay là ngày nghỉ. Giữ mức vận động nhẹ và ngủ đủ để buổi sau khỏe hơn.`,
      items: [],
      estimated_volume_kg: 0,
      estimated_minutes: 0,
      rotation_source: 'start',
      overridden: false,
      cardio: { stepsTarget, kcal: Math.round(stepsTarget * KCAL_PER_STEP) },
    };
  }

  const rotationBase = resolveRotationDay(profile, split, logs, date);
  const rotation = overridden
    ? { ...rotationBase, index: overrideIndex, source: 'override' as const }
    : rotationBase;
  const day = split.days[rotation.index] ?? split.days[0];

  // Loads come from the recorded PR where one exists; otherwise they are derived
  // from bodyweight and the equipment, and never presented as anything but an
  // estimate.
  const bw = profile.current_weight_kg;

  let loggedToday = false;
  const items: WorkoutSuggestionItem[] = chooseExercises(exercises, day).map((exercise, i) => {
    const scheme = schemeForIndex(rotation.index + i);
    const hasPr = Boolean(exercise.personal_record?.weight_kg);

    // Without a PR, apply the intensity to the working ratio directly: treating a
    // bodyweight guess as a true 1RM makes the first session far too heavy.
    let topWeight: number;
    if (hasPr) {
      const oneRm = exercise.personal_record!.weight_kg * (1 + exercise.personal_record!.reps / 30);
      topWeight = Math.max(2.5, roundLoad(oneRm * scheme.pct));
    } else {
      const working = bw * fallbackRatio(exercise);
      topWeight =
        equipmentOf(exercise) === 'dumbbell'
          ? Math.max(2, roundDumbbell(working))
          : Math.max(2.5, roundLoad(working));
    }

    const oneRm = hasPr
      ? exercise.personal_record!.weight_kg * (1 + exercise.personal_record!.reps / 30)
      : topWeight / scheme.pct;

    const setWeights = setLadder(topWeight, scheme.sets);

    // Heaviest set of the most recent session that trained this lift: the number
    // progressive overload is actually measured against.
    let lastWeight: number | undefined;
    const chronological = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    for (const log of chronological) {
      for (const we of log.workout?.exercises ?? []) {
        if (we.exercise_id !== exercise.id || we.sets.length === 0) continue;
        lastWeight = we.sets.reduce((max, s) => Math.max(max, s.weight_kg), 0);
      }
    }

    let progression: string;
    if (lastWeight !== undefined) {
      // A logged session is the strongest signal: compare against it directly.
      if (lastWeight < topWeight) {
        progression = `Buổi trước đỉnh ${lastWeight} kg. Hôm nay lên ${topWeight} kg × ${scheme.reps} reps.`;
      } else if (lastWeight > topWeight) {
        progression =
          scheme.reps >= 10
            ? `Buổi trước đã chạm ${lastWeight} kg. Phiên này giảm tải còn ${topWeight} kg nhưng siết ${scheme.reps} reps cho đủ biên độ.`
            : `Buổi trước đã chạm ${lastWeight} kg, hôm nay giữ ${topWeight} kg × ${scheme.reps} reps và kiểm soát tempo.`;
      } else {
        progression = `Giữ nguyên ${topWeight} kg, đẩy lên ${scheme.reps + 1} reps trước khi tăng tạ.`;
      }
    } else if (hasPr) {
      // No session logged yet, but a record exists: anchor the plan to it instead
      // of pretending the lift is unknown.
      const pr = exercise.personal_record!;
      progression = `Kỷ lục đã ghi ${pr.weight_kg} kg × ${pr.reps} (${pr.date}). Hôm nay làm việc ở ${topWeight} kg × ${scheme.reps} reps, khoảng ${Math.round(scheme.pct * 100)}% 1RM.`;
    } else {
      progression = `Chưa có PR và chưa có lịch sử, nên đây là mức khởi đầu ước tính theo cân nặng cơ thể, không phải kết quả đo. Làm việc quanh ${topWeight} kg trong khoảng ${scheme.reps - 2}-${scheme.reps + 2} reps ở RPE 7: nếu chạm ${scheme.reps + 2} reps thì tăng tạ, nếu không đủ ${scheme.reps - 2} reps thì giảm.`;
    }

    if (hasLoggedToday(logs, date, exercise.id)) loggedToday = true;

    return {
      exercise_id: exercise.id,
      name: exercise.name,
      target_muscle: exercise.target_muscle,
      one_rm: Math.round(oneRm * 10) / 10,
      one_rm_source: hasPr ? 'personal_record' : 'estimated',
      top_set_weight_kg: topWeight,
      reps: scheme.reps,
      sets: scheme.sets,
      set_weights: setWeights,
      last_logged_weight_kg: lastWeight,
      progression,
    };
  });

  const totalSets = items.reduce((s, i) => s + i.sets, 0);
  // Volume from the real ladder, not the top set repeated: a 3-set session at
  // 90/100/105 is not 3 sets at 105.
  const estimatedVolume = items.reduce(
    (sum, item) => sum + item.set_weights.reduce((s, w) => s + w * item.reps, 0),
    0,
  );
  const estimatedMinutes = minutesFor(totalSets, items.length);

  const dayLabel = day.name;
  const rotationRationale = rotation.last
    ? `Buổi gần nhất ${formatDateShort(rotation.last.date)} là "${rotation.last.workout.session_name || 'buổi tập'}", nên hôm nay tới lượt ${dayLabel} trong giáo án ${split.name}.`
    : `Chưa có buổi tập nào được ghi, nên bắt đầu vòng xoay ở ${dayLabel} của giáo án ${split.name}.`;

  // An override is always stated as such, so the card never implies the rotation
  // picked this session on its own.
  const rationale = overridden
    ? `Bạn đã đổi buổi hôm nay sang ${dayLabel} thay cho vòng xoay tự động của giáo án ${split.name}.` +
      (rotation.last
        ? ` Buổi gần nhất đã ghi: "${rotation.last.workout.session_name || 'buổi tập'}" ngày ${formatDateShort(rotation.last.date)}.`
        : '')
    : rotationRationale;

  return {
    ready: true,
    is_rest_day: false,
    day_name: dayLabel,
    split_name: split.name,
    day_index: rotation.index + 1,
    total_days: split.days.length,
    muscles: day.muscles,
    rationale: loggedToday
      ? `${rationale} Bạn đã ghi set cho bài này hôm nay, phần dưới là phần còn lại của buổi.`
      : rationale,
    items,
    estimated_volume_kg: Math.round(estimatedVolume),
    estimated_minutes: estimatedMinutes,
    rotation_source: rotation.source,
    overridden,
    last_session: rotation.last
      ? { date: rotation.last.date, name: rotation.last.workout.session_name || 'Buổi tập' }
      : undefined,
    cardio: { stepsTarget, kcal: Math.round(stepsTarget * KCAL_PER_STEP) },
  };
}

function hasLoggedToday(logs: DailyLog[], date: string, exerciseId: string): boolean {
  const today = logs.find((l) => l.date === date);
  if (!today?.workout?.exercises) return false;
  return today.workout.exercises.some((e) => e.exercise_id === exerciseId && e.sets.length > 0);
}
