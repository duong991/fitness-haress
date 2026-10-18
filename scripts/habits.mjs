#!/usr/bin/env node
/**
 * Habit tracker + daily /coach check-in streak.
 *
 *   node scripts/habits.mjs checkin [YYYY-MM-DD]   first /coach of the day: bump streak, print praise info
 *   node scripts/habits.mjs status  [YYYY-MM-DD]   read-only: check-in streak + per-habit streaks
 *
 * Check-in streak = consecutive calendar days the user started /coach. It lives
 * in data/habits.json. Per-habit streaks are derived from `habits_done` (array
 * of habit ids) in data/daily/YYYY-MM-DD.json, never stored.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const HABITS_FILE = path.join(ROOT, 'habits.json');
const DAILY_DIR = path.join(ROOT, 'daily');
export const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

const DAY_MS = 86400000;
export const addDays = (iso, n) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const todayLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Pure: apply today's check-in. `praise` is true only on the first check-in of a day. */
export function applyCheckin(checkin, today) {
  const last = checkin.last_checkin_date;
  if (last === today) return { checkin, praise: false, milestone: null };
  const current = last === addDays(today, -1) ? checkin.current_streak + 1 : 1;
  const next = {
    current_streak: current,
    longest_streak: Math.max(checkin.longest_streak, current),
    last_checkin_date: today,
  };
  return {
    checkin: next,
    praise: current >= 2,
    milestone: MILESTONES.includes(current) ? current : null,
    was_broken: last !== null && last !== addDays(today, -1) && checkin.current_streak >= 2,
  };
}

/** Pure: streak of `id` over {date: Set(ids)}; today may still be pending. */
export function habitStreak(doneByDate, id, today) {
  let day = doneByDate.get(today)?.has(id) ? today : addDays(today, -1);
  let n = 0;
  while (doneByDate.get(day)?.has(id)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

function loadDone() {
  const map = new Map();
  if (!fs.existsSync(DAILY_DIR)) return map;
  for (const f of fs.readdirSync(DAILY_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const log = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, f), 'utf-8'));
      if (Array.isArray(log.habits_done)) map.set(f.slice(0, -5), new Set(log.habits_done));
    } catch {}
  }
  return map;
}

function report(state, today) {
  const done = loadDone();
  return state.habits.map((h) => ({
    id: h.id,
    name: h.name,
    done_today: done.get(today)?.has(h.id) ?? false,
    streak: habitStreak(done, h.id, today),
  }));
}

function main() {
  const [cmd = 'status', dateArg] = process.argv.slice(2);
  const today = dateArg ?? todayLocal();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`bad date: ${today}`);
  const state = JSON.parse(fs.readFileSync(HABITS_FILE, 'utf-8'));

  let result = { praise: false, milestone: null };
  if (cmd === 'checkin') {
    result = applyCheckin(state.checkin, today);
    state.checkin = result.checkin;
    fs.writeFileSync(HABITS_FILE, JSON.stringify(state, null, 2) + '\n');
  } else if (cmd !== 'status') {
    throw new Error(`unknown command: ${cmd}`);
  }
  console.log(
    JSON.stringify(
      {
        date: today,
        praise: result.praise,
        milestone: result.milestone,
        was_broken: result.was_broken ?? false,
        current_streak: state.checkin.current_streak,
        longest_streak: state.checkin.longest_streak,
        habits: report(state, today),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
