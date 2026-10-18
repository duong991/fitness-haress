#!/usr/bin/env node
/**
 * Validates every JSON file under data/ so the Web UI never loads a broken
 * store. Exit code 1 on any error. Usage: pnpm validate
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const errors = [];
const checked = [];

const rel = (f) => path.relative(path.join(ROOT, '..'), f);
const fail = (file, msg) => errors.push(`${rel(file)}: ${msg}`);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isIsoDate = (v) => {
  if (typeof v !== 'string' || !ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

function load(file, { optional = false } = {}) {
  if (!fs.existsSync(file)) {
    if (!optional) fail(file, 'file is missing');
    return undefined;
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    checked.push(rel(file));
    return data;
  } catch (e) {
    fail(file, `invalid JSON (${e.message})`);
    return undefined;
  }
}

function needNums(file, where, obj, keys) {
  for (const k of keys) if (!isNum(obj?.[k])) fail(file, `${where}.${k} must be a number`);
}

function validateMacros(file, where, m) {
  if (!m || typeof m !== 'object') return fail(file, `${where} must be an object`);
  needNums(file, where, m, ['protein_g', 'carbs_g', 'fat_g']);
}

function validateProfile(file, optional) {
  const p = load(file, { optional });
  if (p === undefined) return;
  for (const k of ['name', 'gender', 'updated_at'])
    if (typeof p[k] !== 'string') fail(file, `${k} must be a string`);
  needNums(file, 'profile', p, [
    'age', 'height_cm', 'current_weight_kg', 'target_weight_kg', 'weekly_target_rate_kg',
    'current_tdee', 'target_calories', 'training_days_per_week',
  ]);
  if (!['cut', 'bulk', 'recomp'].includes(p.goal_type)) fail(file, 'goal_type must be cut|bulk|recomp');
  validateMacros(file, 'macros_target', p.macros_target);
  if (p.training_days_per_week > 7 || p.training_days_per_week < 0)
    fail(file, 'training_days_per_week must be 0-7');
  if (p.training_location !== undefined && !['gym', 'home'].includes(p.training_location))
    fail(file, 'training_location must be gym|home');
  for (const k of ['injuries', 'avoid_movements', 'equipment'])
    if (p[k] !== undefined && (!Array.isArray(p[k]) || p[k].some((s) => typeof s !== 'string')))
      fail(file, `${k} must be an array of strings`);
}

function validateDaily(file) {
  const log = load(file);
  if (log === undefined) return;
  const name = path.basename(file, '.json');
  if (!isIsoDate(name)) fail(file, 'filename must be YYYY-MM-DD.json');
  if (log.date !== name) fail(file, `date "${log.date}" does not match filename`);
  needNums(file, 'log', log, ['calories_target', 'calories_consumed']);
  if (log.weight_kg !== null && !isNum(log.weight_kg)) fail(file, 'weight_kg must be number|null');
  if (log.sleep_hours !== undefined && log.sleep_hours !== null && (!isNum(log.sleep_hours) || log.sleep_hours < 0 || log.sleep_hours > 24))
    fail(file, 'sleep_hours must be number 0-24|null');
  if (log.readiness !== undefined && log.readiness !== null && (!Number.isInteger(log.readiness) || log.readiness < 1 || log.readiness > 5))
    fail(file, 'readiness must be integer 1-5|null');
  validateMacros(file, 'macros', log.macros);
  if (log.habits_done !== undefined && (!Array.isArray(log.habits_done) || log.habits_done.some((s) => typeof s !== 'string')))
    fail(file, 'habits_done must be an array of habit ids');
  if (!Array.isArray(log.meals)) return fail(file, 'meals must be an array');

  let kcal = 0;
  log.meals.forEach((meal, i) => {
    if (!Array.isArray(meal.items)) return fail(file, `meals[${i}].items must be an array`);
    meal.items.forEach((it, j) => {
      needNums(file, `meals[${i}].items[${j}]`, it, ['amount_g', 'calories', 'protein_g', 'carbs_g', 'fat_g']);
      kcal += it.calories || 0;
    });
  });
  if (isNum(log.calories_consumed) && Math.abs(Math.round(kcal) - log.calories_consumed) > 1)
    fail(file, `calories_consumed (${log.calories_consumed}) != sum of meal items (${Math.round(kcal)})`);

  const w = log.workout;
  if (!w || !Array.isArray(w.exercises)) return fail(file, 'workout.exercises must be an array');
  w.exercises.forEach((ex, i) => {
    if (!Array.isArray(ex.sets)) return fail(file, `workout.exercises[${i}].sets must be an array`);
    ex.sets.forEach((s, j) => {
      const at = `workout.exercises[${i}].sets[${j}]`;
      needNums(file, at, s, ['set_number', 'weight_kg', 'reps']);
      if (s.rpe !== undefined && (!isNum(s.rpe) || s.rpe < 1 || s.rpe > 10))
        fail(file, `${at}.rpe must be 1-10`);
    });
  });
}

function validateExercises(file) {
  const list = load(file);
  if (list === undefined) return [];
  if (!Array.isArray(list)) return fail(file, 'must be an array'), [];
  const seen = new Set();
  list.forEach((e, i) => {
    for (const k of ['id', 'name', 'target_muscle', 'category'])
      if (typeof e[k] !== 'string' || !e[k]) fail(file, `[${i}].${k} must be a non-empty string`);
    if (seen.has(e.id)) fail(file, `duplicate id "${e.id}"`);
    seen.add(e.id);
    if (e.equipment !== undefined && (!Array.isArray(e.equipment) || e.equipment.some((g) => typeof g !== 'string')))
      fail(file, `[${i}].equipment must be an array of strings`);
    if (e.guide_url !== undefined && !/^https?:\/\//.test(e.guide_url))
      fail(file, `[${i}].guide_url must be an http(s) URL`);
    const pr = e.personal_record;
    if (pr !== undefined) {
      needNums(file, `[${i}].personal_record`, pr, ['weight_kg', 'reps']);
      if (!isIsoDate(pr.date)) fail(file, `[${i}].personal_record.date must be YYYY-MM-DD`);
    }
  });
  return list;
}

function validateTdeeHistory(file) {
  const list = load(file);
  if (list === undefined) return;
  if (!Array.isArray(list)) return fail(file, 'must be an array');
  list.forEach((e, i) => {
    for (const k of ['week_start', 'week_end'])
      if (!isIsoDate(e[k])) fail(file, `[${i}].${k} must be YYYY-MM-DD`);
    needNums(file, `[${i}]`, e, [
      'avg_weight_kg', 'weight_change_kg', 'avg_calories_in', 'calculated_tdee', 'recommended_target_calories',
    ]);
  });
}

function validateFoodDb(file) {
  const list = load(file);
  if (list === undefined) return;
  if (!Array.isArray(list)) return fail(file, 'must be an array');
  const seen = new Set();
  list.forEach((f, i) => {
    if (!f.id || seen.has(f.id)) fail(file, `[${i}] missing or duplicate id`);
    seen.add(f.id);
    if (!Array.isArray(f.aliases) || f.aliases.length === 0) fail(file, `[${i}].aliases must be a non-empty array`);
    needNums(file, `[${i}].per_100g`, f.per_100g ?? {}, ['calories', 'protein_g', 'carbs_g', 'fat_g']);
  });
}

function validateWeeklyPlan(file) {
  const plan = load(file, { optional: true });
  if (plan === undefined || plan === null) return;
  for (const k of ['created_at', 'start_date'])
    if (!isIsoDate(plan[k])) fail(file, `${k} must be YYYY-MM-DD`);
  if (!Array.isArray(plan.milestones)) return fail(file, 'milestones must be an array');
  plan.milestones.forEach((m, i) => {
    if (m.week !== i + 1) fail(file, `milestones[${i}].week should be ${i + 1}`);
    for (const k of ['start_date', 'end_date'])
      if (!isIsoDate(m[k])) fail(file, `milestones[${i}].${k} must be YYYY-MM-DD`);
    needNums(file, `milestones[${i}]`, m, ['target_weight_kg', 'delta_kg', 'target_calories']);
  });
}

function validateHabits(file) {
  const h = load(file, { optional: true });
  if (h === undefined) return;
  if (!Array.isArray(h.habits)) return fail(file, 'habits must be an array');
  const seen = new Set();
  h.habits.forEach((x, i) => {
    if (typeof x.id !== 'string' || !x.id || seen.has(x.id)) fail(file, `habits[${i}].id missing or duplicate`);
    seen.add(x.id);
    if (typeof x.name !== 'string' || !x.name) fail(file, `habits[${i}].name must be a non-empty string`);
  });
  const c = h.checkin;
  if (!c || typeof c !== 'object') return fail(file, 'checkin must be an object');
  needNums(file, 'checkin', c, ['current_streak', 'longest_streak']);
  if (c.last_checkin_date !== null && !isIsoDate(c.last_checkin_date))
    fail(file, 'checkin.last_checkin_date must be YYYY-MM-DD|null');
  return seen;
}

const habitIds = validateHabits(path.join(ROOT, 'habits.json'));
validateProfile(path.join(ROOT, 'profile.example.json'), false);
validateProfile(path.join(ROOT, 'profile.json'), true); // gitignored, absent on fresh clones
validateExercises(path.join(ROOT, 'exercises.json'));
validateTdeeHistory(path.join(ROOT, 'tdee_history.json'));
validateFoodDb(path.join(ROOT, 'food_database.json'));
validateWeeklyPlan(path.join(ROOT, 'weekly_plan.json'));

const dailyDir = path.join(ROOT, 'daily');
if (fs.existsSync(dailyDir))
  for (const f of fs.readdirSync(dailyDir).filter((f) => f.endsWith('.json')).sort())
    validateDaily(path.join(dailyDir, f));

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${checked.length} JSON files valid`);
