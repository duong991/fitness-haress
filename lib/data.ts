import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DAILY_DIR = path.join(DATA_DIR, 'daily');

export interface MacroTarget {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Profile {
  name: string;
  age: number;
  gender: string;
  height_cm: number;
  starting_weight_kg: number;
  current_weight_kg: number;
  goal_type: 'cut' | 'bulk' | 'recomp';
  target_weight_kg: number;
  weekly_target_rate_kg: number;
  initial_bmr: number;
  current_tdee: number;
  target_calories: number;
  macros_target: MacroTarget;
  training_days_per_week: number;
  split_name?: string;
  updated_at: string;
}

export interface FoodItem {
  name: string;
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  items: FoodItem[];
}

export interface WorkoutSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  completed: boolean;
  session_name: string;
  duration_minutes: number;
  total_volume_kg: number;
  exercises: WorkoutExercise[];
}

export interface DailyLog {
  date: string;
  weight_kg: number | null;
  calories_target: number;
  calories_consumed: number;
  macros: MacroTarget;
  meals: Meal[];
  workout: WorkoutSession;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  target_muscle: string;
  category: string;
  personal_record?: {
    weight_kg: number;
    reps: number;
    date: string;
  };
}

export interface TdeeHistoryEntry {
  week_start: string;
  week_end: string;
  avg_weight_kg: number;
  weight_change_kg: number;
  avg_calories_in: number;
  calculated_tdee: number;
  recommended_target_calories: number;
  notes: string;
}

export interface FoodDatabaseEntry {
  id: string;
  name: string;
  aliases: string[];
  per_100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

// Helpers
export function getProfile(): Profile {
  const filePath = path.join(DATA_DIR, 'profile.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('profile.json not found');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveProfile(profile: Profile): void {
  const filePath = path.join(DATA_DIR, 'profile.json');
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
}

export function getExercises(): Exercise[] {
  const filePath = path.join(DATA_DIR, 'exercises.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveExercises(exercises: Exercise[]): void {
  const filePath = path.join(DATA_DIR, 'exercises.json');
  fs.writeFileSync(filePath, JSON.stringify(exercises, null, 2), 'utf-8');
}

export function getTdeeHistory(): TdeeHistoryEntry[] {
  const filePath = path.join(DATA_DIR, 'tdee_history.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveTdeeHistory(history: TdeeHistoryEntry[]): void {
  const filePath = path.join(DATA_DIR, 'tdee_history.json');
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
}

export function getFoodDatabase(): FoodDatabaseEntry[] {
  const filePath = path.join(DATA_DIR, 'food_database.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function getDailyLog(date: string): DailyLog | null {
  const filePath = path.join(DAILY_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveDailyLog(date: string, log: DailyLog): void {
  if (!fs.existsSync(DAILY_DIR)) {
    fs.mkdirSync(DAILY_DIR, { recursive: true });
  }
  const filePath = path.join(DAILY_DIR, `${date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
}

export function getAllDailyLogs(): DailyLog[] {
  if (!fs.existsSync(DAILY_DIR)) return [];
  const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json')).sort();
  return files.map(file => {
    const raw = fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8');
    return JSON.parse(raw) as DailyLog;
  });
}

export function recalculateDailyTotals(log: DailyLog): DailyLog {
  let totalCalories = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  for (const meal of log.meals) {
    for (const item of meal.items) {
      totalCalories += item.calories;
      totalP += item.protein_g;
      totalC += item.carbs_g;
      totalF += item.fat_g;
    }
  }

  log.calories_consumed = Math.round(totalCalories);
  log.macros = {
    protein_g: Math.round(totalP * 10) / 10,
    carbs_g: Math.round(totalC * 10) / 10,
    fat_g: Math.round(totalF * 10) / 10,
  };

  let totalVolume = 0;
  if (log.workout && log.workout.exercises) {
    for (const ex of log.workout.exercises) {
      for (const set of ex.sets) {
        if (set.completed) {
          totalVolume += (set.weight_kg || 0) * (set.reps || 0);
        }
      }
    }
    log.workout.total_volume_kg = totalVolume;
  }

  return log;
}
