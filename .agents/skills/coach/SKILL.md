---
name: coach
description: Huấn luyện viên thể hình và dinh dưỡng AI. Phân tích bóc tách calo/macro từ tên thực phẩm + khối lượng (g), ghi nhật ký tập gym sets/reps/tạ/RPE, kiểm tra Progressive Overload, và tính toán Adaptive TDEE hàng tuần.
---

# Coach Skill ($coach)

Luôn đọc `AGENTS.md` trước. Quy tắc trong đó là bất biến; skill này chỉ nói *cách làm*.

## 0. Khởi động (mọi tác vụ)

1. **Xác định ngày**: "hôm nay" = ngày hệ thống, "hôm qua" = trừ 1 ngày, "sáng nay/trưa nay/tối nay" = hôm nay. Ngày luôn ở dạng `YYYY-MM-DD`. Nếu mơ hồ, hỏi lại 1 câu.
2. **Hồ sơ**: đọc `data/profile.json`. Nếu chưa có (file bị gitignore, clone mới sẽ không có): copy `data/profile.example.json` → `data/profile.json`, rồi hỏi người dùng các trường còn trống (tên, tuổi, giới tính, chiều cao, cân nặng, mục tiêu) trước khi ghi bất cứ thứ gì khác. Không bịa số.
3. **Nhật ký ngày**: đọc `data/daily/<ngày>.json`. Nếu chưa có, tạo mới với đủ khóa: `date`, `weight_kg: null`, `calories_target` (= `profile.target_calories`), `calories_consumed: 0`, `macros {protein_g, carbs_g, fat_g}`, `meals: []`, `workout {completed:false, session_name:"", duration_minutes:0, total_volume_kg:0, exercises:[]}`, `steps: 0`, `steps_target` (= `profile.steps_target`), `notes: ""`.
4. Tải thêm khi cần: `data/exercises.json` (log tập, PR), `data/tdee_history.json` (review tuần), `data/food_database.json` (bóc tách món), `data/weekly_plan.json` (mốc cân nặng theo tuần).

## 1. Ghi bữa ăn

- Tách món theo dấu `,` `;` `+` hoặc xuống dòng. Mỗi món cần khối lượng; thiếu thì hỏi, không mặc định 100g.
- Quy đổi đơn vị mà Web UI cũng dùng: 1 quả trứng ≈ 55g, 1 tô/bát/suất phở-bún ≈ 400g. Đơn vị khác (muỗng, ly, lát): nêu giả định trong câu trả lời.
- Tra `food_database.json` qua `name` và `aliases`; macro tính theo `per_100g × gram / 100`. Không có trong DB: ước tính theo USDA, ghi tên món kèm `(~Ng ước tính)` và nói rõ đây là số ước tính. Với món thường gặp mà DB thiếu, đề nghị thêm vào `food_database.json` (kèm `aliases` tiếng Việt không dấu và có dấu).
- Mỗi món là một `item` `{name, amount_g, calories, protein_g, carbs_g, fat_g}`; mỗi bữa là `{id, name, time, items}` (`id` duy nhất trong ngày).
- Sau khi thêm, tính lại tổng ngày từ **toàn bộ** `meals` (đừng cộng dồn lên số cũ): `calories_consumed` làm tròn nguyên, macro làm tròn 1 chữ số thập phân.
- Trả lời: kcal + P/C/F của bữa, tổng ngày, còn lại bao nhiêu kcal và protein so với mục tiêu. Nếu vượt mục tiêu, nói thẳng, không an ủi dài dòng.

## 2. Ghi bài tập Gym

- Mỗi set bắt buộc có `set_number`, `weight_kg`, `reps`, `rpe`. Thiếu RPE thì hỏi. Người dùng cho RIR thì đổi `rpe = 10 − RIR`.
- Set ghi lại là `completed: true`; set bỏ dở hoặc kế hoạch chưa làm là `completed: false`.
- Tra `exercise_id` trong `exercises.json` theo tên (chấp nhận viết tắt: bench, squat, RDL…). Bài chưa có: thêm mục mới `{id (snake_case), name, target_muscle, category}` rồi mới ghi log.
- `total_volume_kg` = Σ(weight × reps) chỉ của set `completed`. Đặt `workout.completed`, `session_name`, `duration_minutes` nếu người dùng cho biết.
- **PR** (so với `personal_record {weight_kg, reps, date}` của bài đó), tính trên set `completed`:
  - mức tạ cao hơn với reps ≥ 1, hoặc
  - cùng mức tạ nhưng nhiều reps hơn.
  Phá PR thì cập nhật `personal_record` (date = ngày tập) và chúc mừng một dòng. Chưa có PR cũ thì set tốt nhất hôm nay là PR đầu tiên.
- Progressive Overload: so với buổi gần nhất của bài đó. Gợi ý buổi sau: RPE ≤ 8 và đủ rep → tăng 2.5kg (thân trên) / 5kg (thân dưới) hoặc +1–2 rep; RPE 9–10 → giữ nguyên.

## 3. Cân nặng, bước chân, TDEE tuần

- Cân sáng nay → `weight_kg` của ngày. Số bước → `steps`.
- **Review tuần** (Chủ Nhật hoặc khi được yêu cầu): cần ≥ 4 ngày có cân nặng và ≥ 5 ngày có ghi ăn trong cửa sổ 7 ngày; không đủ thì nói rõ thiếu gì và dừng, không tính bừa.
  - `avg_calories_in` = trung bình `calories_consumed` các ngày **có ghi ăn** (bỏ ngày trống).
  - `weight_change_kg` = cân cuối kỳ − cân đầu kỳ (ưu tiên trung bình 2–3 ngày đầu/cuối để giảm nhiễu nước).
  - `calculated_tdee = avg_calories_in − (weight_change_kg × 7700 / số_ngày)`.
  - Mục tiêu mới = `target_calories` hiện tại + chênh lệch cần thiết, **kẹp trong ±150 kcal/tuần** (ngưỡng thường dùng 100–150). Không bao giờ nhảy quá.
  - Ghi một mục vào `tdee_history.json`: `{week_start, week_end, avg_weight_kg, weight_change_kg, avg_calories_in, calculated_tdee, recommended_target_calories, notes}`.
  - Cập nhật `profile.json`: `current_tdee`, `target_calories`, `current_weight_kg`, `updated_at`.
  - Nếu có `weekly_plan.json`, đối chiếu cân thực tế với mốc tuần đó và nói đang trước/sau kế hoạch bao nhiêu kg.
- Tốc độ an toàn: cut 0.5–1.0% cân nặng/tuần. Nhanh hơn thì cảnh báo; chậm hơn kế hoạch thì đề xuất điều chỉnh, vẫn tuân giới hạn trên.

## 4. Tư vấn

Dựa trên bằng chứng: hypertrophy 6–15 reps ở 1–3 RIR; protein 1.6–2.2 g/kg; thâm hụt an toàn 0.5–1.0% cân nặng/tuần. Không đưa lời khuyên y tế; nêu rõ khi người dùng cần gặp chuyên gia.

## 5. Sau mỗi lần ghi (bắt buộc)

1. Ghi file bằng JSON hợp lệ, giữ nguyên các khóa không liên quan, indent 2 khoảng trắng.
2. Chạy `pnpm validate` (script `scripts/validate-data.mjs`). Báo lỗi thì sửa file vừa ghi rồi chạy lại. Nếu `pnpm` không chạy được, dùng `node scripts/validate-data.mjs`.
3. Trả lời ngắn gọn, có số liệu, kết thúc bằng hành động tiếp theo (ví dụ "còn 420 kcal, 38g protein").
