import { NextResponse } from 'next/server';
import {
  clearWeeklyPlan,
  getAllDailyLogs,
  getProfile,
  getWeeklyPlan,
  saveWeeklyPlan,
} from '@/lib/data';
import { localIsoDate } from '@/lib/format';
import { buildWeeklyPlan, resolveWeeklyPlan } from '@/lib/core/weeklyPlan';

export const dynamic = 'force-dynamic';

/** The stored plan (if any) plus its verdicts against the log store. */
export async function GET() {
  try {
    const profile = getProfile();
    const logs = getAllDailyLogs();
    const today = localIsoDate();
    const result = resolveWeeklyPlan(profile, logs, today, getWeeklyPlan());

    if (!result.ready) {
      return NextResponse.json(
        { ready: false, blockedReason: result.blockedReason },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ready: true,
      plan: result.plan,
      milestones: result.milestones,
      evaluation: result.evaluation,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Create (or rebuild) the plan. Rebuilding clears past-week verdicts, so it is
 * only done on an explicit request — the UI confirms before calling it.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const profile = getProfile();
    const today = localIsoDate();

    const plan = buildWeeklyPlan(profile, getAllDailyLogs(), today);
    if (!plan) {
      return NextResponse.json(
        {
          error:
            'Chưa đủ dữ liệu để lập kế hoạch. Cần cân nặng hiện tại, cân nặng mục tiêu và tốc độ thay đổi mỗi tuần trong hồ sơ.',
        },
        { status: 400 },
      );
    }

    saveWeeklyPlan(plan);
    const result = resolveWeeklyPlan(profile, getAllDailyLogs(), today, plan);

    return NextResponse.json({
      success: true,
      plan,
      milestones: result.milestones,
      evaluation: result.evaluation,
      rebuilt: Boolean(body.rebuild),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/** Remove the plan so the next load builds a fresh one. */
export async function DELETE() {
  try {
    clearWeeklyPlan();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
