import { NextResponse } from 'next/server';
import { 
  getProfile, 
  getDailyLog, 
  saveDailyLog, 
  getExercises, 
  saveExercises, 
  recalculateDailyTotals,
  getAllDailyLogs,
  getWeeklyPlan,
  DailyLog,
  Profile
} from '@/lib/data';
import { parseNaturalFoodInput } from '@/lib/foodParser';
import { localIsoDate } from '@/lib/format';
import { isProfileReady } from '@/lib/profile';
import { buildEnergyRecommendation, buildWorkoutRecommendation } from '@/lib/core/recommend';
import { resolveWeeklyPlan, currentMilestone } from '@/lib/core/weeklyPlan';

export async function POST(request: Request) {
  try {
    const { message, date = localIsoDate() } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Tin nhắn không hợp lệ' }, { status: 400 });
    }

    const cleanMsg = message.trim();
    const lower = cleanMsg.toLowerCase();
    const profile = getProfile();
    let dailyLog = getDailyLog(date);

    if (!dailyLog) {
      dailyLog = {
        date,
        weight_kg: null,
        calories_target: profile.target_calories || 0,
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

    // 1. Check if user is logging weight
    const weightMatch = lower.match(/(?:cân nặng|nang|weight|can)\s*(?:la|là|duoc|được|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg)?/);
    if (weightMatch) {
      const w = parseFloat(weightMatch[1]);
      dailyLog.weight_kg = w;
      saveDailyLog(date, dailyLog);
      return NextResponse.json({
        reply: `Đã ghi nhận thể trọng ${w} kg cho ngày ${date}. Duy trì việc cân đều đặn vào buổi sáng nhé!`,
        actionTaken: 'weight_logged',
        updatedLog: dailyLog
      });
    }

    // 2. Check if user is logging workout sets (e.g., "bench press 80kg 6 reps rpe 8", "squat 100kg 5 rep")
    const workoutMatch = lower.match(/(bench|squat|deadlift|overhead|row|pull|curl|press|ngực|lưng|chân|tay)\s+(\d+(?:\.\d+)?)\s*(?:kg)?\s*(\d+)\s*(?:rep|reps|cái)?(?:\s*rpe\s*(\d+))?/i);
    if (workoutMatch) {
      const exKeyword = workoutMatch[1].toLowerCase();
      const weight = parseFloat(workoutMatch[2]);
      const reps = parseInt(workoutMatch[3], 10);
      const rpe = workoutMatch[4] ? parseFloat(workoutMatch[4]) : 8;

      const exercises = getExercises();
      const matchedEx = exercises.find(e => 
        e.id.includes(exKeyword) || 
        e.name.toLowerCase().includes(exKeyword)
      ) || exercises[0];

      if (!dailyLog.workout) {
        dailyLog.workout = {
          completed: true,
          session_name: 'Buổi tập ghi nhanh',
          duration_minutes: 45,
          total_volume_kg: 0,
          exercises: []
        };
      }
      dailyLog.workout.completed = true;

      let exEntry = dailyLog.workout.exercises.find(e => e.exercise_id === matchedEx.id);
      if (!exEntry) {
        exEntry = {
          exercise_id: matchedEx.id,
          exercise_name: matchedEx.name,
          sets: []
        };
        dailyLog.workout.exercises.push(exEntry);
      }

      const nextSetNum = exEntry.sets.length + 1;
      exEntry.sets.push({
        set_number: nextSetNum,
        weight_kg: weight,
        reps: reps,
        rpe: rpe,
        completed: true
      });

      const updated = recalculateDailyTotals(dailyLog);
      saveDailyLog(date, updated);

      // Check PR
      let prNotice = '';
      if (matchedEx.personal_record) {
        if (weight > matchedEx.personal_record.weight_kg || (weight === matchedEx.personal_record.weight_kg && reps > matchedEx.personal_record.reps)) {
          matchedEx.personal_record = { weight_kg: weight, reps: reps, date };
          saveExercises(exercises);
          prNotice = ' 🎉 CHÚC MỪNG: Bạn vừa thiết lập Kỷ Lục Cá Nhân (PR) mới!';
        }
      }

      return NextResponse.json({
        reply: `Đã ghi nhận Set ${nextSetNum}: ${matchedEx.name} với ${weight}kg × ${reps} reps (RPE ${rpe}). Tổng volume buổi tập hiện tại: ${updated.workout.total_volume_kg.toLocaleString()} kg.${prNotice}`,
        actionTaken: 'workout_logged',
        updatedLog: updated
      });
    }

    // 3. Steps: "9000 bước", "đi bộ 9.000 bước", "bước chân 8500"
    const stepMatch = lower.match(/(\d[\d.,]*)\s*(?:k|nghìn|ngan)?\s*(?:bước|buoc|bộ|steps?)/);
    if (stepMatch) {
      const raw = stepMatch[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
      const abbreviated = /(?:\d)\s*(?:k|nghìn|ngan)\s*(?:bước|buoc|bộ|steps?)/.test(lower);
      const value = Math.round(parseFloat(raw) * (abbreviated ? 1000 : 1));

      if (Number.isFinite(value) && value > 0 && value <= 200_000) {
        dailyLog.steps = value;
        dailyLog.steps_target = profile.steps_target || 8000;
        saveDailyLog(date, dailyLog);

        const stepsPct = Math.round((value / dailyLog.steps_target) * 100);
        const remainingSteps = Math.max(0, dailyLog.steps_target - value);
        // Mirrors the recommendation engine: only movement above the sedentary
        // baseline earns calories back, and only half of it.
        const credit = Math.round(Math.max(0, value - 6000) * 0.045 * 0.5);

        return NextResponse.json({
          reply:
            `Đã ghi ${value.toLocaleString('en-US')} bước chân cho ngày ${date} (${stepsPct}% mục tiêu ${dailyLog.steps_target.toLocaleString('en-US')} bước).\n\n` +
            (remainingSteps > 0
              ? `• Còn ${remainingSteps.toLocaleString('en-US')} bước nữa để đạt mục tiêu.\n`
              : `• Đã vượt mục tiêu vận động hôm nay.\n`) +
            `• Phần vận động vượt mức nền được cộng lại ${credit > 0 ? `~${credit} kcal vào hạn mức ăn hôm nay` : 'chưa đủ để cộng calo (mốc nền 6.000 bước)'}.`,
          actionTaken: 'steps_logged',
          updatedLog: dailyLog
        });
      }
    }

    // 4. Check if user is logging food (contains "ăn", "món", "g", "bữa", "cơm", "ức gà", "trứng", "thịt")
    const isFoodIntent = /(?:ăn|uống|nạp|bữa|uc ga|ức gà|cơm|com|trứng|trung|bò|bo|thịt|whey|sữa|sua|\d+\s*g)/i.test(lower);
    if (isFoodIntent) {
      const parsed = parseNaturalFoodInput(cleanMsg);
      if (parsed.items.length > 0) {
        const newMeal = {
          id: `meal-${Date.now()}`,
          name: 'Bữa ghi nhanh qua Coach',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          items: parsed.items
        };
        dailyLog.meals = [...(dailyLog.meals || []), newMeal];
        const updated = recalculateDailyTotals(dailyLog);
        saveDailyLog(date, updated);

        const mealCals = parsed.items.reduce((s, i) => s + i.calories, 0);
        const mealP = Math.round(parsed.items.reduce((s, i) => s + i.protein_g, 0) * 10) / 10;
        const calLeft = profile.target_calories - updated.calories_consumed;
        const pLeft = Math.round((profile.macros_target.protein_g - updated.macros.protein_g) * 10) / 10;

        // Without a collected profile there is no target to compare against —
        // say so instead of reporting a deficit against a placeholder.
        const progressLine = isProfileReady(profile)
          ? `• Hôm nay đã nạp: ${updated.calories_consumed} / ${profile.target_calories} kcal (${calLeft >= 0 ? `còn thiếu ${calLeft} kcal` : `vượt ${Math.abs(calLeft)} kcal`})\n` +
            `• Protein đạt: ${updated.macros.protein_g} / ${profile.macros_target.protein_g}g (${pLeft > 0 ? `còn thiếu ${pLeft}g` : 'đã đủ chỉ tiêu'}).`
          : `• Hôm nay đã nạp: ${updated.calories_consumed} kcal, ${updated.macros.protein_g}g Protein.\n` +
            `• Chưa có chỉ tiêu calo/macro vì hồ sơ đang trống — trả lời các mục Coach hỏi để có mốc so sánh.`;

        return NextResponse.json({
          reply: `Đã ghi nhận ${parsed.items.length} món (+${mealCals} kcal, +${mealP}g Protein) vào nhật ký ngày ${date}!\n\n` +
                 progressLine,
          actionTaken: 'food_logged',
          updatedLog: updated
        });
      }
    }

    // 5. Profile intake — no numbers are invented; the coach asks for real data.
    if (!isProfileReady(profile)) {
      return NextResponse.json({
        actionTaken: 'profile_intake',
        reply: `Hồ sơ của bạn đang trống (mock data đã được xoá), nên Coach chưa thể tính TDEE hay macro. Trả lời một lượt các mục sau để Coach ghi vào data/profile.json:\n\n` +
               `1. Tên (hoặc cách gọi bạn muốn hiển thị)\n` +
               `2. Giới tính (nam / nữ) & tuổi\n` +
               `3. Chiều cao (cm)\n` +
               `4. Cân nặng hiện tại (kg)\n` +
               `5. Mục tiêu: cắt mỡ / tăng cơ / recomp & cân nặng mục tiêu (kg)\n` +
               `6. Số buổi tập mỗi tuần & giáo án đang theo (nếu có)\n` +
               `7. Mức vận động ngoài giờ tập (ngồi nhiều / đi lại vừa / lao động chân tay)\n\n` +
               `Có thể nhập nhanh theo mẫu: "Nam 28t, 172cm, 70kg, muốn cắt mỡ về 65kg, tập 4 buổi/tuần, ngồi nhiều".`,
      });
    }

    // 6. General Coach Advice & Consultation
    const calConsumed = dailyLog.calories_consumed || 0;
    const calTarget = profile.target_calories || 0;
    const calDiff = calTarget - calConsumed;
    const pConsumed = dailyLog.macros?.protein_g || 0;
    const pTarget = profile.macros_target.protein_g || 0;
    const pDiff = Math.round((pTarget - pConsumed) * 10) / 10;

    // Today's session: what to train and at what load.
    if (
      /tập gì|tap gi|buổi tập hôm nay|buoi tap hom nay|đề xuất.*(tập|buổi)|hôm nay tập|nên tập/.test(lower)
    ) {
      const logs = getAllDailyLogs();
      const session = buildWorkoutRecommendation({
        profile,
        logs,
        exercises: getExercises(),
        date,
      });

      if (session.is_rest_day) {
        return NextResponse.json({
          reply: `Hôm nay là **ngày nghỉ phục hồi** theo giáo án ${session.split_name}.\n\n` +
                 `${session.rationale}\n\n` +
                 `• Vận động nhẹ: mục tiêu ${session.cardio.stepsTarget.toLocaleString('en-US')} bước (~${session.cardio.kcal} kcal).\n` +
                 `• Ưu tiên ngủ đủ và ăn đủ protein để buổi sau khỏe hơn.`,
        });
      }

      const lines = session.items
        .map(
          (item, i) =>
            `${i + 1}. ${item.name} — ${item.sets} set × ${item.reps} reps, đỉnh ${item.top_set_weight_kg} kg` +
            `${item.set_weights.length > 1 ? ` (ladder: ${item.set_weights.join(' / ')} kg)` : ''}\n   ↳ ${item.progression}`,
        )
        .join('\n');

      return NextResponse.json({
        reply: `Đề xuất buổi tập hôm nay (${date}): **${session.day_name}**\n\n` +
               `${session.rationale}\n\n` +
               `${lines}\n\n` +
               `• Thời lượng ước tính: ~${session.estimated_minutes} phút · volume dự kiến ~${session.estimated_volume_kg.toLocaleString('en-US')} kg.\n` +
               `• Cardio: ${session.cardio.stepsTarget.toLocaleString('en-US')} bước (~${session.cardio.kcal} kcal).\n` +
               `• Tạ đề xuất tính từ 1RM (PR đã ghi, hoặc ước tính theo cân nặng cơ thể khi chưa có PR). Ghi lại set thực tế để Coach chỉnh cho buổi sau.`,
      });
    }

    // Long-term goal split into weekly checkpoints.
    if (
      /kế hoạch tuần|ke hoach tuan|chia tuần|tiến độ tuần|tien do tuan|mục tiêu tuần|lộ trình|lo trinh/.test(
        lower,
      )
    ) {
      const logs = getAllDailyLogs();
      const { ready, plan, milestones, evaluation, blockedReason } = resolveWeeklyPlan(
        profile,
        logs,
        date,
        getWeeklyPlan(),
      );

      if (!ready || !plan || !evaluation) {
        return NextResponse.json({
          reply: `Chưa lập được kế hoạch tuần. ${blockedReason ?? ''}\n\n` +
                 `Cần có: cân nặng hiện tại, cân nặng mục tiêu và tốc độ thay đổi mỗi tuần (kg/tuần) trong hồ sơ.`,
        });
      }

      const active = currentMilestone(milestones);
      const paceLine =
        evaluation.actualRateKgPerWeek === null
          ? '• Chưa đủ dữ liệu cân nặng để đo tốc độ thực tế. Cân đều mỗi sáng để Coach đối chiếu.'
          : `• Tốc độ thực đo 14 ngày: ${evaluation.actualRateKgPerWeek} kg/tuần (kế hoạch cần ${plan.weekly_rate_kg} kg/tuần)` +
            `${evaluation.behindSchedule ? ' — đang chậm hơn kế hoạch.' : ' — đang bám sát kế hoạch.'}`;

      const varianceLine =
        evaluation.varianceKg === null
          ? ''
          : `\n• Lệch so với mốc hiện tại: ${evaluation.varianceKg > 0 ? '+' : ''}${evaluation.varianceKg} kg ` +
            `(mốc ${evaluation.expectedNowKg} kg).`;

      return NextResponse.json({
        reply:
          `Kế hoạch chia theo tuần cho mục tiêu ${plan.target_weight_kg} kg:\n\n` +
          `• Tổng cộng ${evaluation.targetDates} tuần, mỗi tuần ${plan.weekly_rate_kg} kg.\n` +
          `• Đã đạt mốc: ${evaluation.done}/${evaluation.elapsed} tuần đã qua` +
          `${evaluation.missed > 0 ? `, trượt ${evaluation.missed} tuần` : ''}.\n` +
          (active
            ? `• Tuần này (tuần ${active.week}): ${active.start_date} → ${active.end_date}, mốc cần đạt ${active.target_weight_kg} kg.\n`
            : '') +
          `• Còn lại ${evaluation.weeksRemaining} tuần sau tuần hiện tại.\n` +
          paceLine +
          varianceLine +
          `\n\nMở trang Kế hoạch tuần để xem bảng mốc đầy đủ và tự tạo lại kế hoạch khi mục tiêu đổi.`,
      });
    }

    if (lower.includes('còn thiếu') || lower.includes('bao nhiêu') || lower.includes('hôm nay')) {
      const recommendation = buildEnergyRecommendation({
        profile,
        log: dailyLog,
        trainingPlanned: false,
        trainingMinutes: 0,
      });
      const stepsLine =
        recommendation.steps > 0
          ? `• Bước chân: ${recommendation.steps.toLocaleString('en-US')} / ${recommendation.stepsTarget.toLocaleString('en-US')} bước` +
            `${recommendation.activityAdjustment !== 0 ? ` (cộng lại ${recommendation.activityAdjustment} kcal vào hạn mức)` : ''}.\n`
          : `• Bước chân: chưa ghi hôm nay — nhắn "9000 bước" để Coach lưu.\n`;

      return NextResponse.json({
        reply: `Tình trạng dinh dưỡng ngày ${date}:\n\n` +
               `• Calo: Đã nạp ${calConsumed} / ${calTarget} kcal (${calDiff >= 0 ? `còn lại ${calDiff} kcal` : `vượt ${Math.abs(calDiff)} kcal`}).\n` +
               `• Protein: Đạt ${pConsumed}g / ${pTarget}g (${pDiff > 0 ? `còn thiếu ${pDiff}g` : 'đã chạm chỉ tiêu'}).\n` +
               `• Carbs: ${dailyLog.macros?.carbs_g || 0} / ${profile.macros_target.carbs_g}g.\n` +
               `• Fat: ${dailyLog.macros?.fat_g || 0} / ${profile.macros_target.fat_g}g.\n` +
               stepsLine +
               `\n💡 Lời khuyên: ${pDiff > 0 ? `Bạn nên bổ sung thêm ~${pDiff}g protein (VD: 1 muỗng whey hoặc 150g ức gà) để tối ưu phục hồi cơ bắp.` : 'Macro hôm nay rất chuẩn chỉ, giữ vững phong độ!'}`,
      });
    }

    if (lower.includes('gợi ý') || lower.includes('bữa phụ') || lower.includes('ăn gì')) {
      return NextResponse.json({
        reply: `Dưới đây là một số gợi ý thực phẩm giàu Protein, calo gọn gàng phù hợp cho bạn:\n\n` +
               `1. 1 muỗng Whey Protein (~30g bột): ~120 kcal, 25g Protein, 1g Fat.\n` +
               `2. 150g Sữa chua Hy Lạp không đường: ~100 kcal, 15g Protein.\n` +
               `3. 2 quả trứng gà luộc: ~150 kcal, 13g Protein, 10g Fat.\n` +
               `4. 150g ức gà áp chảo ăn kèm dưa chuột: ~245 kcal, 45g Protein.\n\n` +
               `Bạn vừa ăn món nào? Nhắn cú pháp như "ăn 150g ức gà" để Coach ghi vào nhật ký ngay nhé!`,
      });
    }

    if (lower.includes('tdee') || lower.includes('giảm cân') || lower.includes('tiến độ')) {
      return NextResponse.json({
        reply: `Về tiến độ & TDEE hiện tại:\n\n` +
               `• Mức TDEE thích ứng đo lường: ${profile.current_tdee} kcal/ngày.\n` +
               `• Calo thâm hụt mục tiêu: ${profile.target_calories} kcal (thâm hụt ${profile.current_tdee - profile.target_calories} kcal/ngày).\n` +
               `• Tốc độ giảm kỳ vọng: ${profile.weekly_target_rate_kg} kg/tuần (~0.5% trọng lượng cơ thể, bảo tồn tối đa khối lượng cơ nạc).\n` +
               `• Đừng quên ghi nhận cân nặng mỗi sáng sau khi thức dậy để thuật toán Adaptive TDEE tự động hiệu chỉnh vào Chủ Nhật!`,
      });
    }

    // Default friendly coach fallback
    return NextResponse.json({
      reply: `Chào bạn! Tôi là Coach AI thể hình của bạn. Tôi có thể giúp:\n\n` +
             `• Ghi nhanh bữa ăn: Nhắn "Ăn 200g ức gà, 150g cơm"\n` +
             `• Ghi set tập gym: Nhắn "Bench press 80kg 6 reps rpe 8"\n` +
             `• Cập nhật cân nặng: Nhắn "Cân nặng 71.5 kg"\n` +
             `• Ghi số bước chân: Nhắn "9000 bước" hoặc "đi bộ 12k bước"\n` +
             `• Xin đề xuất buổi tập: Hỏi "Hôm nay tập gì?"\n` +
             `• Xem lộ trình: Hỏi "Kế hoạch tuần của tôi"\n` +
             `• Tham vấn: Hỏi "Hôm nay tôi còn thiếu bao nhiêu calo?" hoặc "Gợi ý bữa phụ 30g protein".`,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
