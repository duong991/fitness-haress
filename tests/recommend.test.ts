import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_ADJUSTMENT_CAP,
  KCAL_PER_STEP,
  SEDENTARY_STEPS,
  buildEnergyRecommendation,
  isRestDay,
  trainingDaysOfWeek,
} from '@/lib/core/recommend';
import { makeLog, makeProfile } from './helpers';

describe('trainingDaysOfWeek', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('returns exactly %i distinct days', (n) => {
    expect(trainingDaysOfWeek(n).size).toBe(n);
  });

  it('clamps out-of-range and NaN input', () => {
    expect(trainingDaysOfWeek(12).size).toBe(7);
    expect(trainingDaysOfWeek(-3).size).toBe(0);
    expect(trainingDaysOfWeek(NaN).size).toBe(0);
  });

  it('spreads 3 sessions as Tue/Thu/Sat and 4 as Mon/Wed/Fri/Sat', () => {
    expect(Array.from(trainingDaysOfWeek(3)).sort()).toEqual([2, 4, 6]);
    expect(Array.from(trainingDaysOfWeek(4)).sort()).toEqual([1, 3, 5, 6]);
  });
});

describe('isRestDay', () => {
  it('is never a rest day when training 7/week, always when 0', () => {
    expect(isRestDay(7, '2026-10-05')).toBe(false);
    expect(isRestDay(0, '2026-10-05')).toBe(true);
  });

  it('2026-10-05 is a Monday: rest at 3/week, training at 4/week', () => {
    expect(isRestDay(3, '2026-10-05')).toBe(true);
    expect(isRestDay(4, '2026-10-05')).toBe(false);
  });
});

describe('buildEnergyRecommendation', () => {
  it('is blocked for a blank profile', () => {
    const rec = buildEnergyRecommendation({
      profile: makeProfile({ name: '', target_calories: 0 }),
      log: null,
    });
    expect(rec.ready).toBe(false);
    expect(rec.blockedReason).toBeTruthy();
    expect(rec.adjustedTarget).toBe(0);
  });

  it('gives no step credit at or below the sedentary baseline', () => {
    const rec = buildEnergyRecommendation({
      profile: makeProfile(),
      log: makeLog({ steps: SEDENTARY_STEPS }),
    });
    expect(rec.stepsKcal).toBe(0);
    expect(rec.adjustedTarget).toBe(1900);
  });

  it('eats back 50% of the kcal burned above baseline steps', () => {
    const steps = SEDENTARY_STEPS + 10_000;
    const burn = Math.round(10_000 * KCAL_PER_STEP);
    const rec = buildEnergyRecommendation({ profile: makeProfile(), log: makeLog({ steps }) });
    expect(rec.stepsKcal).toBe(burn);
    expect(rec.activityAdjustment).toBe(Math.round(burn * 0.5));
    expect(rec.adjustedTarget).toBe(1900 + rec.activityAdjustment);
  });

  it('caps the activity adjustment', () => {
    const rec = buildEnergyRecommendation({
      profile: makeProfile(),
      log: makeLog({ steps: 200_000 }),
      trainingPlanned: true,
      trainingMinutes: 600,
    });
    expect(rec.activityAdjustment).toBe(ACTIVITY_ADJUSTMENT_CAP);
  });

  it('classifies status around the ±50 kcal band', () => {
    const at = (consumed: number) =>
      buildEnergyRecommendation({
        profile: makeProfile(),
        log: makeLog({ calories_consumed: consumed }),
      }).status;
    expect(at(1000)).toBe('under');
    expect(at(1900)).toBe('on-target');
    expect(at(1949)).toBe('on-target');
    expect(at(1951)).toBe('over');
  });

  it('suggests a meal only when ≥250 kcal remain, never above what remains', () => {
    const big = buildEnergyRecommendation({ profile: makeProfile(), log: makeLog() });
    expect(big.mealSuggestion).not.toBeNull();
    expect(big.mealSuggestion!.calories).toBeLessThanOrEqual(big.remainingToEat);

    const small = buildEnergyRecommendation({
      profile: makeProfile(),
      log: makeLog({ calories_consumed: 1800 }),
    });
    expect(small.mealSuggestion).toBeNull();
  });

  it('zeroes remaining macros once the budget is spent', () => {
    const rec = buildEnergyRecommendation({
      profile: makeProfile(),
      log: makeLog({ calories_consumed: 2500 }),
    });
    expect(rec.remainingMacros).toEqual({ protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});
