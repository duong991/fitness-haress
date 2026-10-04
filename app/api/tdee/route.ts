import { NextResponse } from 'next/server';
import { getTdeeHistory, saveTdeeHistory, getAllDailyLogs, getProfile, saveProfile, TdeeHistoryEntry } from '@/lib/data';

export async function GET() {
  try {
    const history = getTdeeHistory();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Auto calculate from last 7 days if not provided
    const logs = getAllDailyLogs();
    const profile = getProfile();

    if (logs.length < 3) {
      return NextResponse.json({ error: 'Chưa đủ dữ liệu (cần ít nhất 3-7 ngày ghi chép)' }, { status: 400 });
    }

    const recentLogs = logs.slice(-7);
    const validWeights = recentLogs.map(l => l.weight_kg).filter((w): w is number => typeof w === 'number' && w > 0);
    const totalCals = recentLogs.reduce((acc, l) => acc + (l.calories_consumed || 0), 0);
    const avgCals = Math.round(totalCals / recentLogs.length);

    let weightChange = 0;
    let avgWeight = profile.current_weight_kg;
    if (validWeights.length >= 2) {
      avgWeight = Math.round((validWeights.reduce((a, b) => a + b, 0) / validWeights.length) * 10) / 10;
      weightChange = Math.round((validWeights[validWeights.length - 1] - validWeights[0]) * 100) / 100;
    }

    // Adaptive TDEE formula: TDEE = avgCals - (weightChange * 7700 / days)
    const daysCount = recentLogs.length;
    const dailyWeightEnergyDeficitOrSurplus = Math.round((weightChange * 7700) / daysCount);
    let calculatedTdee = avgCals - dailyWeightEnergyDeficitOrSurplus;
    calculatedTdee = Math.max(1400, Math.min(4000, calculatedTdee));

    // Recommend new target
    let recommendedTarget = calculatedTdee;
    if (profile.goal_type === 'cut') {
      recommendedTarget = calculatedTdee - 450; // ~0.4kg/week
    } else if (profile.goal_type === 'bulk') {
      recommendedTarget = calculatedTdee + 250; // ~0.25kg/week
    }

    // Apply damping limit (±150 kcal)
    const currentTarget = profile.target_calories || 1950;
    const diff = recommendedTarget - currentTarget;
    if (Math.abs(diff) > 150) {
      recommendedTarget = diff > 0 ? currentTarget + 150 : currentTarget - 150;
    }

    const newEntry: TdeeHistoryEntry = {
      week_start: recentLogs[0].date,
      week_end: recentLogs[recentLogs.length - 1].date,
      avg_weight_kg: avgWeight,
      weight_change_kg: weightChange,
      avg_calories_in: avgCals,
      calculated_tdee: calculatedTdee,
      recommended_target_calories: recommendedTarget,
      notes: body.notes || `Tự động tính dựa trên ${recentLogs.length} ngày gần nhất. Biến động cân nặng: ${weightChange}kg.`
    };

    const history = getTdeeHistory();
    history.push(newEntry);
    saveTdeeHistory(history);

    // Update profile
    profile.current_tdee = calculatedTdee;
    profile.target_calories = recommendedTarget;
    profile.current_weight_kg = validWeights.length ? validWeights[validWeights.length - 1] : profile.current_weight_kg;
    saveProfile(profile);

    return NextResponse.json({ success: true, entry: newEntry, profile });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
