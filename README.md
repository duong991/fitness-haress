# Fitness & Calorie Tracking Harness

> **Bạn tập luyện và ăn uống. AI Agent theo dõi dữ liệu, tính toán calo/macro, bóc tách thực phẩm và điều chỉnh Adaptive TDEE khoa học.**

Đây là repository theo dõi thể hình và dinh dưỡng định dạng JSON-first, Agent-native, lấy cảm hứng từ kiến trúc của `english-harness`.
Mở repo này trong Antigravity, Claude Code, Cursor hoặc DeepSeek Harness và tương tác thông qua `$coach`.

Không có database đóng gói phức tạp, không phụ thuộc cloud ngoài: Agent là runtime xử lý, Git và các file JSON là kho lưu trữ vĩnh viễn, Web App Next.js cục bộ hiển thị dashboard trực quan.

Hướng dẫn tiếng Việt chi tiết: [GUID.md](GUID.md).

## Bắt đầu nhanh

1. **Khởi chạy Web Dashboard**:
   ```bash
   pnpm dev
   # Truy cập http://localhost:3000
   ```
2. **Tương tác với AI Coach**:
   - Gõ `$coach` hoặc chat tự nhiên trong Harness/Agent:
     - *"Bữa trưa nay ăn 200g ức gà, 150g cơm trắng, 1 đĩa rau luộc"*
     - *"Hôm nay tập ngực: Bench press 80kg x 6 rep rpe 8, set 2 85kg x 5 rep rpe 9"*
     - *"Sáng nay cân nặng 71.5kg, review calo tuần này giúp mình"*

## Cấu trúc Repository

```text
AGENTS.md                         Quy ước bắt buộc cho AI Agent
GUID.md                           Hướng dẫn sử dụng toàn diện
README.md                         Tài liệu tổng quan dự án
docs/METHOD.md                    Cơ sở khoa học (Adaptive TDEE, Progressive Overload)
docs/WORKFLOW.md                  Quy trình ghi nhận dữ liệu hàng ngày và review tuần
docs/FOOD_DATABASE.md             Bảng tra cứu thực phẩm và macro
data/profile.json                 Thông số cá nhân, mục tiêu calo, macro, cân nặng
data/exercises.json               Danh mục bài tập và kỷ lục cá nhân (PRs)
data/tdee_history.json            Lịch sử tính toán TDEE thích ứng từng tuần
data/food_database.json           Database dinh dưỡng cục bộ (calo/protein/carbs/fat)
data/daily/YYYY-MM-DD.json        Nhật ký chi tiết từng ngày (món ăn, tập luyện, cân nặng)
app/                              Giao diện Web Dashboard (Next.js 14 + Tailwind CSS)
.agents/skills/coach/SKILL.md     Public skill duy nhất cho Agent ($coach)
```

## Luồng hoạt động

```text
Món ăn (g) / Bài tập (sets x reps x tạ)
  → AI Agent bóc tách macro & volume
  → Ghi vào data/daily/YYYY-MM-DD.json
  → Tự động kiểm tra PR trong data/exercises.json
  → Web Dashboard cập nhật tức thì (Calo Ring, Đồ thị Volume & Macro)
  → Cuối tuần: Thuật toán Adaptive TDEE điều chỉnh Calo mục tiêu
```
