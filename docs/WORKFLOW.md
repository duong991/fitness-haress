# Quy Trình Vận Hành Dữ Liệu (docs/WORKFLOW.md)

Tài liệu này mô tả chi tiết quy trình ghi nhận, cập nhật và đồng bộ dữ liệu giữa AI Coach, Web App và hệ thống file JSON.

---

## 1. Chu Trình Hằng Ngày (Daily Loop)

1. **Sáng thức dậy**:
   - Cân lúc bụng đói sau khi đi vệ sinh.
   - Nhắn: *"Cân nặng sáng nay: 71.6kg"*.
   - AI ghi vào trường `weight_kg` trong file `data/daily/YYYY-MM-DD.json`.

2. **Trong ngày (Các bữa ăn)**:
   - Nhắn món ăn + gram sau mỗi bữa hoặc gom vào cuối ngày.
   - AI tra cứu `data/food_database.json` -> tính toán macro -> ghi vào mảng `meals`.
   - AI cập nhật tổng `calories_consumed` và `macros` trong file ngày.

3. **Buổi tập Gym**:
   - Ghi lại các bài tập chính và mức tạ.
   - AI lưu cấu trúc bài tập và các sets vào trường `workout`.
   - Nếu có mức tạ phá vỡ kỷ lục cũ, AI cập nhật `data/exercises.json`.

4. **Tối kết thúc ngày**:
   - Web Dashboard hiển thị tổng kết: Calo nạp so với Calo chỉ tiêu, tỷ lệ Protein đạt được, Volume tạ đã nâng.

---

## 2. Chu Trình Đánh Giá Tuần (Weekly Review Loop)

Thực hiện vào cuối tuần (Chủ Nhật):

1. **Tập hợp dữ liệu**:
   - Đọc 7 file gần nhất từ `data/daily/`.
   - Tính cân nặng trung bình tuần này ($W_{\text{avg}}$) và chênh lệch so với tuần trước.
   - Tính lượng calo nạp trung bình 7 ngày.

2. **Tính toán Adaptive TDEE**:
   - Áp dụng thuật toán thích ứng (xem `docs/METHOD.md`).
   - Thêm bản ghi mới vào mảng `data/tdee_history.json`.

3. **Điều chỉnh chỉ tiêu tuần mới**:
   - Nếu đang Cut:
     - Giảm cân nhanh hơn 1.0%/tuần -> Tăng nhẹ calo (+100 kcal) để chống mất cơ.
     - Giảm cân chậm hơn 0.3%/tuần hoặc chững -> Giảm nhẹ calo (-100 kcal) hoặc tăng cardio.
     - Giảm đúng dải 0.5% - 0.8%/tuần -> Giữ nguyên calo mục tiêu.
   - Cập nhật trường `target_calories` và `macros_target` trong `data/profile.json`.

---

## 3. Quy Ước Cấu Trúc JSON

Mọi file phải duy trì đúng cấu trúc schema để API Web App phân tích không bị crash:

```json
{
  "date": "YYYY-MM-DD",
  "weight_kg": 71.6,
  "calories_target": 1950,
  "calories_consumed": 1920,
  "macros": {
    "protein_g": 168,
    "carbs_g": 185,
    "fat_g": 52
  },
  "meals": [
    {
      "id": "meal-id",
      "name": "Tên bữa ăn",
      "time": "HH:MM",
      "items": [
        {
          "name": "Tên món",
          "amount_g": 200,
          "calories": 330,
          "protein_g": 62,
          "carbs_g": 0,
          "fat_g": 7.2
        }
      ]
    }
  ],
  "workout": {
    "completed": true,
    "session_name": "Tên buổi tập",
    "duration_minutes": 60,
    "total_volume_kg": 8500,
    "exercises": [
      {
        "exercise_id": "exercise_id",
        "exercise_name": "Tên bài tập",
        "sets": [
          {
            "set_number": 1,
            "weight_kg": 80,
            "reps": 8,
            "rpe": 8,
            "completed": true
          }
        ]
      }
    ]
  },
  "notes": "Ghi chú cá nhân về năng lượng, giấc ngủ, cảm giác cơ."
}
```
