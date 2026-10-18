import { describe, expect, it } from 'vitest';
import { MAX_WEEKS, buildWeeklyPlan } from '@/lib/core/weeklyPlan';
import { shiftDay } from '@/lib/format';
import { makeProfile } from './helpers';

describe('buildWeeklyPlan', () => {
  it('returns null for an unready profile or no meaningful distance', () => {
    expect(buildWeeklyPlan(makeProfile({ name: '' }), [], '2026-10-05')).toBeNull();
    expect(buildWeeklyPlan(makeProfile({ target_weight_kg: 74.05 }), [], '2026-10-05')).toBeNull();
    expect(buildWeeklyPlan(makeProfile({ weekly_target_rate_kg: 0 }), [], '2026-10-05')).toBeNull();
  });

  it('builds a contiguous ladder that lands exactly on the target', () => {
    const plan = buildWeeklyPlan(makeProfile(), [], '2026-10-05')!;
    expect(plan.milestones).toHaveLength(8); // 4 kg at 0.5 kg/week
    plan.milestones.forEach((m, i) => {
      expect(m.week).toBe(i + 1);
      expect(m.start_date).toBe(shiftDay('2026-10-05', i * 7));
      expect(m.end_date).toBe(shiftDay('2026-10-05', i * 7 + 6));
    });
    expect(plan.milestones.at(-1)!.target_weight_kg).toBe(70);
    expect(plan.weekly_rate_kg).toBe(-0.5);
  });

  it('flips the rate sign to follow the real direction of the goal', () => {
    const plan = buildWeeklyPlan(
      makeProfile({ goal_type: 'bulk', target_weight_kg: 78, weekly_target_rate_kg: -0.5 }),
      [],
      '2026-10-05',
    )!;
    expect(plan.weekly_rate_kg).toBe(0.5);
    expect(plan.milestones[0].target_weight_kg).toBe(74.5);
  });

  it('caps the plan length', () => {
    const plan = buildWeeklyPlan(
      makeProfile({ target_weight_kg: 40, weekly_target_rate_kg: 0.01 }),
      [],
      '2026-10-05',
    )!;
    expect(plan.milestones).toHaveLength(MAX_WEEKS);
  });
});
