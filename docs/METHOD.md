# Phương Pháp Luận Thể Hình & Năng Lượng (docs/METHOD.md)

Tài liệu này định hình nền tảng khoa học (Evidence-Based Fitness) được AI Agent áp dụng trong toàn bộ hệ thống.

---

## 1. Nguyên lý Cân Bằng Năng Lượng & Thuật Toán Adaptive TDEE

### Vấn đề của công thức TDEE tĩnh thông thường
Các công thức tĩnh (như Mifflin-St Jeor hay Katch-McArdle) chỉ ước tính ban đầu dựa trên chiều cao, cân nặng và hệ số vận động chung chung. Trong thực tế:
- Trao đổi chất biến thiên theo cơ địa và mức độ thích nghi chuyển hóa (Metabolic Adaptation).
- NEAT (Non-Exercise Activity Thermogenesis - vận động tự nhiên không có chủ đích) thường tự động giảm khi thâm hụt calo sâu.

### Công thức Thích Ứng (Adaptive TDEE)
Hệ thống sử dụng nguyên lý bảo toàn năng lượng thực nghiệm:
$$1 \text{ kg mỡ/mô cơ thể} \approx 7,700 \text{ kcal}$$

Sau mỗi chu kỳ 7 ngày:
$$\Delta W = W_{\text{cuối}} - W_{\text{đầu}} \quad (\text{kg})$$
$$\text{Calo thâm hụt / dư thừa thực tế mỗi ngày} = \frac{\Delta W \times 7700}{7}$$
$$\text{TDEE Thích Ứng} = \text{Calo nạp trung bình} - \left(\frac{\Delta W \times 7700}{7}\right)$$

### Bộ lọc giảm chấn (Damping Filter)
Để tránh bị đánh lừa bởi biến động tích trữ nước do muối (natri) hoặc glycogen:
- Điều chỉnh calo mục tiêu mỗi tuần **không vượt quá $\pm 100 \sim 150 \text{ kcal}$**.
- Tốc độ giảm mỡ an toàn: $0.5\% \sim 1.0\%$ trọng lượng cơ thể mỗi tuần nhằm bảo toàn tối đa khối cơ nạc.

---

## 2. Phân Bổ Dinh Dưỡng Đa Lượng (Macronutrients)

1. **Protein (Chất đạm)**:
   - Mục tiêu khi Cut (giảm mỡ): $2.0 - 2.4 \text{ g/kg}$ trọng lượng cơ thể.
   - Mục tiêu khi Bulk/Recomp: $1.6 - 2.0 \text{ g/kg}$.
   - Vai trò: Duy trì tổng hợp protein cơ bắp (MPS) và tạo cảm giác no lâu.

2. **Fat (Chất béo)**:
   - Tối thiểu $0.6 - 0.8 \text{ g/kg}$ (thường chiếm $20 - 25\%$ tổng calo).
   - Vai trò: Đảm bảo cân bằng nội tiết tố sinh dục (testosterone) và hấp thu vitamin tan trong dầu.

3. **Carbohydrates (Tinh bột)**:
   - Lượng calo còn lại sau khi trừ Protein và Fat.
   - Vai trò: Nhiên liệu chính cho hệ thần kinh và nạp đầy glycogen trong sợi cơ để nâng tạ nặng.

---

## 3. Nguyên Lý Tăng Tiến Tải Trọng (Progressive Overload)

Cơ bắp chỉ phát triển khi chịu kích thích vượt quá ngưỡng quen thuộc. Hệ thống ghi nhận và tối ưu tải trọng theo các tiêu chí:

1. **Khối lượng (Load)**: Tăng mức tạ với cùng số rep chuẩn form.
2. **Số lần lặp (Reps)**: Tăng số rep với cùng mức tạ cho đến khi chạm cận trên khoảng rep mục tiêu (ví dụ 8-12 reps), sau đó tăng tạ ở buổi kế tiếp.
3. **Chỉ số RPE / RIR**:
   - $RIR = 10 - RPE$.
   - Các set tập hiệu quả (Effective Sets) cần dừng ở mức **RIR 1 - 3** (cách ngưỡng thất bại hoàn toàn 1 đến 3 lần lặp).
4. **Volume Tải Trọng Tổng**:
   $$\text{Volume} = \sum (\text{Khối lượng tạ (kg)} \times \text{Số lần nâng (Reps)})$$
