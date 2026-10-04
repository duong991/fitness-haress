# Hướng Dẫn Sử Dụng Chi Tiết (GUID.md)

Hệ thống theo dõi thể hình và dinh dưỡng cá nhân này được thiết kế để bạn tốn ít công sức nhất khi ghi chép: chỉ cần nói với AI những gì bạn ăn và những gì bạn nâng tạ.

---

## 1. Cách tương tác với AI Coach (`$coach`)

### A. Ghi bữa ăn (Food Logging)
Bạn không cần tự tra calo hay mở ứng dụng phức tạp. Chỉ cần nhắn tên món kèm khối lượng ước lượng theo gram:

> *"Sáng nay mình ăn 2 quả trứng gà luộc, 2 lát bánh mì đen khoảng 80g, 1 ly cà phê đen."*
> *"Trưa ăn 200g ức gà áp chảo, 1 bát cơm trắng tầm 150g, 100g súp lơ luộc."*

AI sẽ:
1. Tra cứu database `data/food_database.json` để bóc tách chính xác: Calo, Protein, Carbs, Fat.
2. Cập nhật thẳng vào file `data/daily/YYYY-MM-DD.json`.
3. Phản hồi cho bạn: Bữa này bao nhiêu calo/protein, cả ngày còn lại bao nhiêu calo để đạt mục tiêu.

### B. Ghi nhật ký tập Gym (Workout Logging)
Nhắn bài tập và các set bạn vừa thực hiện:

> *"Hôm nay tập Upper: Barbell bench press 75kg 8 rep rpe 7.5, 80kg 6 rep rpe 8.5, 85kg 5 rep rpe 9. Incline dumbbell press 26kg 8 rep 2 set. Tricep pushdown 35kg 12 rep 2 set."*

AI sẽ:
1. Ghi lại từng set vào nhật ký ngày hôm nay.
2. Tính tổng Volume tải trọng ($\text{kg} \times \text{reps}$).
3. Tự động so sánh với `data/exercises.json`. Nếu mức tạ hoặc số rep cao hơn kỷ lục cũ, AI sẽ tự động update PR.

### C. Check-in cân nặng & Đánh giá TDEE tuần
Mỗi sáng sau khi vệ sinh, cân và nhắn cho AI:

> *"Cân nặng sáng nay: 71.6kg"*

Vào Chủ Nhật:

> *"Chạy review TDEE tuần này"*

AI sẽ tổng hợp 7 ngày vừa qua:
- Cân nặng trung bình và mức tăng/giảm thực tế.
- Lượng calo nạp trung bình mỗi ngày.
- Tính toán TDEE thực tế thích ứng (Adaptive TDEE).
- Đưa ra khuyến nghị calo cho tuần tiếp theo (tăng, giảm hay giữ nguyên).

---

## 2. Giao diện Web Dashboard

Giao diện Web hoạt động hoàn toàn cục bộ, đọc/ghi trực tiếp vào thư mục `data/`:

- **Tổng quan (Overview)**: Vòng tròn đo lượng calo nạp so với mục tiêu, thanh tiến độ Protein / Carbs / Fat, tóm tắt buổi tập trong ngày.
- **Biểu đồ Cân nặng & TDEE**: Theo dõi xu hướng cân nặng mượt (smoothed trend) và sự thích ứng của mức tiêu hao năng lượng.
- **Nhật ký Dinh dưỡng (Food Log)**: Xem chi tiết từng bữa ăn, khối lượng gram và macro tương ứng. Có sẵn form thêm nhanh nếu không muốn dùng chat.
- **Nhật ký Tập luyện (Workout Log)**: Bảng chi tiết từng set tập, RPE, volume từng nhóm cơ.
- **Kỷ lục cá nhân (PR Tracker)**: Danh sách các bài tập compound/isolation và mức tạ tốt nhất đạt được.

Khởi chạy bằng lệnh:
```bash
pnpm dev
```
Sau đó mở trình duyệt tại: `http://localhost:3000`.

---

## 3. Cấu trúc và tính toàn vẹn của dữ liệu

Mọi dữ liệu đều nằm dưới dạng file văn bản JSON thuần túy tại thư mục `data/`:
- Dễ dàng commit lên Git riêng tư để lưu trữ lịch sử trọn đời.
- Không lo bị mất dữ liệu hay bị khóa bởi nền tảng đóng của bên thứ ba.
- Cho phép bạn tự sửa tay file bất cứ lúc nào nếu muốn chỉnh số đo.
