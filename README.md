# Fitness & Calorie Tracking Harness

> **Ghi lại buổi tập và bữa ăn bằng lời nói. AI Agent tính calo/macro, theo dõi PR và điều chỉnh Adaptive TDEE.**

Repo theo dõi thể hình và dinh dưỡng, lưu hoàn toàn bằng file JSON. Agent (Claude Code, Cursor, Antigravity, ...) là bộ xử lý, Git là kho lưu trữ, Web Dashboard Next.js chạy cục bộ để xem số liệu.

Hướng dẫn chi tiết từng tình huống: [GUID.md](GUID.md). Quy ước dành cho Agent: [AGENTS.md](AGENTS.md).

## 1. Cài đặt

Yêu cầu: Node.js 18+ và [pnpm](https://pnpm.io).

```bash
git clone <url-repo> fitness-harness
cd fitness-harness
pnpm install
```

## 2. Tạo hồ sơ cá nhân (bắt buộc, chỉ làm một lần)

Repo không chứa hồ sơ cá nhân. Sao chép file mẫu rồi điền thông số của bạn:

```bash
cp data/profile.example.json data/profile.json
```

Mở `data/profile.json` và điền các trường chính: `name`, `age`, `gender`, `height_cm`, `current_weight_kg`, `goal_type` (`cut` / `bulk` / `recomp`), `target_weight_kg`, `target_calories`, `macros_target`.

`data/profile.json` đã được đưa vào `.gitignore`, nên dữ liệu cá nhân của bạn sẽ không bị đẩy lên Git.

Có thể để Agent hỏi và điền giúp: nhắn *"Giúp mình thiết lập profile"*.

## 3. Mở Web Dashboard

```bash
pnpm dev
```

Truy cập `http://localhost:3080` (cổng được cấu hình trong `package.json`). Dashboard đọc và ghi trực tiếp vào thư mục `data/`.

| Trang | Dùng để |
|---|---|
| Tổng quan | Calo đã nạp so với mục tiêu, tiến độ protein/carbs/fat, buổi tập hôm nay |
| Food | Xem và thêm nhanh các bữa ăn |
| Workout | Xem từng set, RPE và volume |
| Exercises | Danh sách bài tập và kỷ lục cá nhân (PR) |
| TDEE | Xu hướng cân nặng và TDEE thích ứng |
| Plan | Kế hoạch tuần |
| Profile | Chỉnh thông số cá nhân và mục tiêu |

## 4. Ghi nhận dữ liệu với AI Coach (`$coach`)

Mở repo trong Agent, gõ `$coach` hoặc chat tự nhiên. Ví dụ:

**Ghi bữa ăn** (nên dùng gram):
- *"Trưa nay ăn 200g ức gà, 150g cơm trắng, 100g súp lơ luộc"*

**Ghi buổi tập** (mỗi set cần tạ, số rep và RPE/RIR):
- *"Hôm nay tập ngực: bench press 80kg x 6 rep rpe 8, set 2 85kg x 5 rep rpe 9"*

**Check-in cân nặng và steps:**
- *"Sáng nay cân 71.5kg, hôm qua đi được 11.000 bước"*

**Xem đánh giá:**
- *"Review calo tuần này giúp mình"*
- *"Chạy review TDEE tuần này"*

Agent sẽ cập nhật `data/daily/YYYY-MM-DD.json`, kiểm tra PR trong `data/exercises.json`, và ghi kết quả đánh giá tuần vào `data/tdee_history.json`.

## 5. Lưu dữ liệu

Mỗi thay đổi là một thay đổi file JSON. Nên commit định kỳ để có lịch sử:

```bash
git add data/
git commit -m "log: ngày 2026-10-18"
```

## Cấu trúc Repository

```text
AGENTS.md                         Quy ước bắt buộc cho AI Agent
GUID.md                           Hướng dẫn sử dụng chi tiết
README.md                         Tài liệu tổng quan và hướng dẫn nhanh
docs/METHOD.md                    Cơ sở khoa học (Adaptive TDEE, Progressive Overload)
docs/WORKFLOW.md                  Quy trình ghi nhận hàng ngày và review tuần
docs/FOOD_DATABASE.md             Bảng tra cứu thực phẩm và macro
data/profile.example.json         Mẫu hồ sơ cá nhân (commit lên Git)
data/profile.json                 Hồ sơ cá nhân của bạn (không commit, tự tạo ở bước 2)
data/exercises.json               Danh mục bài tập và kỷ lục cá nhân (PR)
data/tdee_history.json            Lịch sử TDEE thích ứng theo tuần
data/food_database.json           Bảng dinh dưỡng cục bộ (calo/protein/carbs/fat theo 100g)
data/weekly_plan.json             Kế hoạch tuần
data/daily/YYYY-MM-DD.json        Nhật ký từng ngày (món ăn, tập luyện, cân nặng, steps)
app/, components/, lib/           Web Dashboard (Next.js 14 + Tailwind CSS)
.agents/skills/coach/SKILL.md     Skill duy nhất cho Agent ($coach)
```

## Luồng hoạt động

```text
Món ăn (g) / Bài tập (sets x reps x tạ) / Cân nặng / Steps
  → Agent bóc tách macro và volume
  → Ghi vào data/daily/YYYY-MM-DD.json
  → Kiểm tra PR trong data/exercises.json
  → Dashboard cập nhật (vòng calo, biểu đồ macro và volume)
  → Cuối tuần: Adaptive TDEE điều chỉnh calo mục tiêu (giới hạn ±100–150 kcal/tuần)
```

## Lưu ý

- Dữ liệu là số liệu cá nhân. Trước khi đẩy repo lên remote công khai, kiểm tra lại `data/daily/` và lịch sử commit.
- Ước lượng dinh dưỡng chỉ chính xác bằng mức độ chính xác của khối lượng bạn nhập. Cân thực phẩm sống/chín sẽ cho kết quả tốt hơn.
- Đây là công cụ theo dõi, không thay thế tư vấn y tế hoặc dinh dưỡng chuyên môn.
