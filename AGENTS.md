# Fitness & Calorie Tracking Harness

Repository là hệ thống lưu trữ dữ liệu cá nhân (portable system of record) cho việc theo dõi tập gym, dinh dưỡng, và tính toán TDEE thích ứng. Không phải backend đóng kín, Agent là runtime, JSON là cơ sở dữ liệu.

Sử dụng `.agents/skills/coach/SKILL.md` cho mọi tương tác với người dùng. `$coach` là public skill duy nhất.

## Authoritative Context

- `data/profile.json` — thông số cá nhân, mục tiêu calo, macro, cân nặng mục tiêu
- `data/daily/YYYY-MM-DD.json` — nhật ký chi tiết từng ngày (bữa ăn, macros, bài tập gym, cân nặng, ghi chú)
- `data/exercises.json` — danh mục bài tập, nhóm cơ, kỷ lục cá nhân (PRs)
- `data/tdee_history.json` — lịch sử tính toán TDEE thích ứng và đề xuất calo tuần
- `data/food_database.json` — bảng tra cứu dinh dưỡng chuẩn theo 100g cho thực phẩm phổ biến

## Non-negotiable Rules

1. **Bóc tách dinh dưỡng chính xác**:
   - Khi người dùng cung cấp tên món ăn kèm số gram (ví dụ: "200g ức gà, 150g cơm"), tra cứu `data/food_database.json` trước.
   - Nếu không có trong cơ sở dữ liệu nội bộ, ước tính dựa trên chỉ số dinh dưỡng chuẩn khoa học (USDA), ghi rõ thành phần: Calo, Protein, Carbs, Fat.
   - Luôn cập nhật trực tiếp vào file ngày hôm nay `data/daily/YYYY-MM-DD.json` trong trường `meals` và cộng dồn `macros`, `calories_consumed`.

2. **Ghi nhận bài tập Gym & Progressive Overload**:
   - Mỗi set tập bắt buộc ghi: `set_number`, `weight_kg`, `reps`, `rpe` (Rate of Perceived Exertion 1-10 hoặc RIR).
   - So sánh với kỷ lục cá nhân trong `data/exercises.json`. Nếu người dùng phá PR (tăng tạ hoặc tăng rep ở cùng mức tạ), tự động cập nhật trường `personal_record` trong `data/exercises.json` và thông báo chúc mừng ngắn gọn.

3. **Thuật toán Adaptive TDEE**:
   - Công thức: `TDEE = Calo_nạp_trung_bình_tuần - (Biến_thiên_cân_nặng_kg * 7700 / số_ngày)`
   - Không điều chỉnh calo mục tiêu đột ngột. Giới hạn điều chỉnh tối đa ±100 đến ±150 kcal/tuần (Damping factor) để loại bỏ nhiễu nước/glycogen.
   - Lưu kết quả đánh giá tuần vào `data/tdee_history.json`.

4. **Bảo toàn dữ liệu JSON**:
   - Đọc file JSON trước khi sửa. Đảm bảo cấu trúc JSON luôn hợp lệ để Web UI hiển thị không lỗi.
   - Giữ format ngày chuẩn ISO: `YYYY-MM-DD`.

5. **Phong cách giao tiếp**:
   - Ngắn gọn, chuẩn xác, định dạng rõ ràng, tập trung vào hành động tiếp theo và số liệu thực tế.
