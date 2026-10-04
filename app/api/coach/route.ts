import { NextResponse } from 'next/server';
import { 
  getProfile, 
  getDailyLog, 
  saveDailyLog, 
  getExercises, 
  saveExercises, 
  recalculateDailyTotals,
  DailyLog,
  Profile
} from '@/lib/data';
import { parseNaturalFoodInput } from '@/lib/foodParser';

export async function POST(request: Request) {
  try {
    const { message, date = '2026-10-04' } = await request.json();
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

    // 3. Check if user is logging food (contains "ăn", "món", "g", "bữa", "cơm", "ức gà", "trứng", "thịt")
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

        return NextResponse.json({
          reply: `Đã ghi nhận ${parsed.items.length} món (+${mealCals} kcal, +${mealP}g Protein) vào nhật ký ngày ${date}!\n\n` +
                 `• Hôm nay đã nạp: ${updated.calories_consumed} / ${profile.target_calories} kcal (${calLeft >= 0 ? `còn thiếu ${calLeft} kcal` : `vượt ${Math.abs(calLeft)} kcal`})\n` +
                 `• Protein đạt: ${updated.macros.protein_g} / ${profile.macros_target.protein_g}g (${pLeft > 0 ? `còn thiếu ${pLeft}g` : 'đã đủ chỉ tiêu'}).`,
          actionTaken: 'food_logged',
          updatedLog: updated
        });
      }
    }

    // 4. General Coach Advice & Consultation
    const calConsumed = dailyLog.calories_consumed || 0;
    const calTarget = profile.target_calories || 1950;
    const calDiff = calTarget - calConsumed;
    const pConsumed = dailyLog.macros?.protein_g || 0;
    const pTarget = profile.macros_target.protein_g || 165;
    const pDiff = Math.round((pTarget - pConsumed) * 10) / 10;

    if (lower.includes('còn thiếu') || lower.includes('bao nhiêu') || lower.includes('hôm nay')) {
      return NextResponse.json({
        reply: `Tình trạng dinh dưỡng ngày ${date}:\n\n` +
               `• Calo: Đã nạp ${calConsumed} / ${calTarget} kcal (${calDiff >= 0 ? `còn lại ${calDiff} kcal` : `vượt ${Math.abs(calDiff)} kcal`}).\n` +
               `• Protein: Đạt ${pConsumed}g / ${pTarget}g (${pDiff > 0 ? `còn thiếu ${pDiff}g` : 'đã chạm chỉ tiêu'}).\n` +
               `• Carbs: ${dailyLog.macros?.carbs_g || 0} / ${profile.macros_target.carbs_g}g.\n` +
               `• Fat: ${dailyLog.macros?.fat_g || 0} / ${profile.macros_target.fat_g}g.\n\n` +
               `💡 Lời khuyên: ${pDiff > 0 ? `Bạn nên bổ sung thêm ~${pDiff}g protein (VD: 1 muỗng whey hoặc 150g ức gà) để tối ưu phục hồi cơ bắp.` : 'Macro hôm nay rất chuẩn chỉ, giữ vững phong độ!'}`,
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
             `• Tham vấn: Hỏi "Hôm nay tôi còn thiếu bao nhiêu calo?" hoặc "Gợi ý bữa phụ 30g protein".`,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
