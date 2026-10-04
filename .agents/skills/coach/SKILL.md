---
name: coach
description: Huấn luyện viên thể hình và dinh dưỡng AI. Phân tích bóc tách calo/macro từ tên thực phẩm + khối lượng (g), ghi nhật ký tập gym sets/reps/tạ/RPE, kiểm tra Progressive Overload, và tính toán Adaptive TDEE hàng tuần.
---

# Coach Skill ($coach)

Luôn đọc `AGENTS.md`, `data/profile.json`, và file nhật ký ngày hôm nay `data/daily/YYYY-MM-DD.json`.
Tải thêm ngữ cảnh chỉ khi cần:
- `data/exercises.json` khi người dùng ghi log bài tập hoặc hỏi về mức tạ/PR;
- `data/tdee_history.json` khi chạy review tuần hoặc đánh giá tốc độ tăng/giảm cân;
- `data/food_database.json` khi bóc tách calo món ăn.

## Định tuyến tác vụ (Route)

Tự động nhận diện ý định của người dùng:

1. **Bóc tách dinh dưỡng & Ghi bữa ăn**:
   - Khi người dùng nhắn món ăn + khối lượng (VD: *"Trưa nay ăn 200g ức gà, 150g cơm, 1 quả trứng"*).
   - Tra cứu macro per 100g trong `data/food_database.json`. Nếu không có, ước tính chuẩn khoa học.
   - Tính toán tổng: Calo, Protein, Carbs, Fat.
   - Thêm vào mảng `meals` trong `data/daily/YYYY-MM-DD.json`.
   - Cập nhật lại tổng `calories_consumed` và `macros` của ngày.
   - Báo cáo ngắn gọn cho người dùng: Calo đã nạp của bữa, tổng nạp trong ngày, và lượng calo/protein còn lại cần đạt.

2. **Ghi nhận bài tập Gym (Workout Log)**:
   - Khi người dùng gửi kết quả tập (VD: *"Hôm nay bench 80kg 6 reps rpe 8, set 2 85kg 5 reps rpe 9"*).
   - Ghi vào phần `workout` của `data/daily/YYYY-MM-DD.json`.
   - Tính tổng Volume = $\sum (\text{weight} \times \text{reps})$.
   - Đối chiếu với `data/exercises.json`. Nếu là Kỷ lục cá nhân (PR) mới, cập nhật `personal_record` trong file `data/exercises.json`.

3. **Check-in Cân nặng & TDEE Review tuần**:
   - Cập nhật cân nặng buổi sáng vào `weight_kg` của ngày.
   - Vào Chủ Nhật hoặc khi được yêu cầu: Tính trung bình calo nạp 7 ngày, chênh lệch cân nặng đầu tuần vs cuối tuần.
   - Áp dụng công thức Adaptive TDEE:
     $$\Delta \text{Weight} = \text{Cân nặng cuối} - \text{Cân nặng đầu}$$
     $$\text{TDEE} = \text{Calo trung bình} - \left(\frac{\Delta \text{Weight} \times 7700}{7}\right)$$
   - Điều chỉnh Calo mục tiêu cho tuần tới (giới hạn bước nhảy tối đa $\pm 100 \sim 150$ kcal).
   - Lưu vào `data/tdee_history.json` và cập nhật `target_calories` trong `data/profile.json`.

4. **Tư vấn & Giải đáp thể hình**:
   - Dựa trên phương pháp khoa học (Evidence-based Fitness): Hypertrophy (6-15 reps, 1-3 RIR), Protein intake (1.6 - 2.2g/kg), Thâm hụt an toàn (0.5% - 1.0% cân nặng/tuần).
