import { NextResponse } from 'next/server';
import { getDailyLog, saveDailyLog, recalculateDailyTotals, getProfile, DailyLog } from '@/lib/data';

export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    let log = getDailyLog(date);
    if (!log) {
      const profile = getProfile();
      log = {
        date,
        weight_kg: null,
        calories_target: profile.target_calories || 1950,
        calories_consumed: 0,
        macros: { protein_g: 0, carbs_g: 0, fat_g: 0 },
        meals: [],
        workout: {
          completed: false,
          session_name: '',
          duration_minutes: 0,
          total_volume_kg: 0,
          exercises: []
        },
        notes: ''
      };
    }
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const body: DailyLog = await request.json();
    body.date = date;
    const updated = recalculateDailyTotals(body);
    saveDailyLog(date, updated);
    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
