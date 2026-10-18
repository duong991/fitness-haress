import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs script, no types
import { applyCheckin, habitStreak } from '../scripts/habits.mjs';

const state = (current_streak: number, last_checkin_date: string | null, longest_streak = current_streak) => ({
  current_streak, longest_streak, last_checkin_date,
});

describe('applyCheckin', () => {
  it('starts at 1 with no praise on the first ever check-in', () => {
    const r = applyCheckin(state(0, null), '2026-10-18');
    expect(r.checkin.current_streak).toBe(1);
    expect(r.praise).toBe(false);
  });

  it('extends the streak on consecutive days and praises', () => {
    const r = applyCheckin(state(2, '2026-10-17'), '2026-10-18');
    expect(r.checkin).toEqual({ current_streak: 3, longest_streak: 3, last_checkin_date: '2026-10-18' });
    expect(r.praise).toBe(true);
    expect(r.milestone).toBe(3);
  });

  it('is idempotent within the same day (no second praise)', () => {
    const r = applyCheckin(state(5, '2026-10-18'), '2026-10-18');
    expect(r.praise).toBe(false);
    expect(r.checkin.current_streak).toBe(5);
  });

  it('resets after a gap but keeps the longest streak', () => {
    const r = applyCheckin(state(9, '2026-10-15', 9), '2026-10-18');
    expect(r.checkin.current_streak).toBe(1);
    expect(r.checkin.longest_streak).toBe(9);
    expect(r.was_broken).toBe(true);
  });

  it('crosses month boundaries', () => {
    expect(applyCheckin(state(1, '2026-10-31'), '2026-11-01').checkin.current_streak).toBe(2);
  });
});

describe('habitStreak', () => {
  const done = new Map([
    ['2026-10-16', new Set(['water'])],
    ['2026-10-17', new Set(['water'])],
  ]);
  it('counts back from yesterday while today is still pending', () => {
    expect(habitStreak(done, 'water', '2026-10-18')).toBe(2);
  });
  it('includes today once done', () => {
    done.set('2026-10-18', new Set(['water']));
    expect(habitStreak(done, 'water', '2026-10-18')).toBe(3);
  });
  it('is 0 for a habit never done', () => {
    expect(habitStreak(done, 'sleep', '2026-10-18')).toBe(0);
  });
});
