'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Save, TriangleAlert, UserRound } from 'lucide-react';
import { Profile } from '@/lib/data';
import { isProfileReady } from '@/lib/profile';
import { formatDecimal, formatNumber } from '@/lib/format';
import Button from '@/components/ui/Button';
import { Card, SectionHead, SkeletonRows } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { PageHeader, StatBlock } from '@/components/ui/PageHeader';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const loadProfile = useCallback(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setDraft(data);
      })
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 3200);
    return () => clearTimeout(t);
  }, [saveState]);

  async function handleSave() {
    if (!draft) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, updated_at: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveState('saved');
        setProfile(draft);
        window.dispatchEvent(new CustomEvent('fitness-data-updated'));
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  }

  const isDirty = Boolean(
    draft && profile && JSON.stringify(draft) !== JSON.stringify(profile),
  );

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setMacro = (key: keyof Profile['macros_target'], value: number) =>
    setDraft((prev) =>
      prev ? { ...prev, macros_target: { ...prev.macros_target, [key]: value } } : prev,
    );

  if (!draft || !profile) {
    return (
      <div className="space-y-8">
        <PageHeader title="Hồ sơ & mục tiêu" icon={UserRound} />
        <SkeletonRows rows={3} cols={3} />
        <SkeletonRows rows={3} cols={3} />
      </div>
    );
  }

  const weightDelta = Math.round((profile.current_weight_kg - profile.starting_weight_kg) * 10) / 10;
  const toGoal = Math.round((profile.current_weight_kg - profile.target_weight_kg) * 10) / 10;

  return (
    <div className="space-y-10 pb-8">
      <PageHeader
        title="Hồ sơ & mục tiêu"
        description="Thông số sinh học, mục tiêu calo và tỷ lệ macro. Mọi thay đổi ghi thẳng vào data/profile.json."
        icon={UserRound}
        actions={
          <>
            {isDirty ? (
              <Button variant="ghost" icon={<RotateCcw />} onClick={() => setDraft(profile)}>
                Hoàn tác
              </Button>
            ) : null}
            <Button
              variant="primary"
              icon={<Save />}
              onClick={handleSave}
              disabled={saveState === 'saving' || !isDirty}
            >
              {saveState === 'saving' ? 'Đang lưu...' : isDirty ? 'Lưu thay đổi' : 'Đã đồng bộ'}
            </Button>
          </>
        }
      />

      {/* Save feedback, inline under the header rather than a floating toast */}
      {saveState === 'saved' ? (
        <div className="flex items-start gap-2.5 r-card border border-sticker-green-line bg-sticker-green-soft px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ok" />
          <p className="text-[13px] text-ink">
            Đã ghi hồ sơ vào <span className="font-metric">data/profile.json</span>.
          </p>
        </div>
      ) : null}

      {saveState === 'error' ? (
        <div className="flex items-start gap-2.5 r-card border border-bad-line bg-bad-surface px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-bad" />
          <p className="text-[13px] text-ink">
            Không lưu được hồ sơ. Kiểm tra kết nối rồi thử lại.
          </p>
        </div>
      ) : null}

      {/* Intake state: mock numbers were removed, so an empty profile is normal
          until the user supplies real body parameters and targets. */}
      {!isProfileReady(draft) ? (
        <div className="flex items-start gap-2.5 r-card border border-dashed border-hairline bg-canvas px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-faint" />
          <p className="text-[13px] text-ink-muted">
            Hồ sơ chưa đủ dữ liệu thật (tên, tuổi, chiều cao, cân nặng hiện tại, calo mục tiêu).
            Điền và lưu để Coach tính TDEE, macro và bám tiến độ của bạn.
          </p>
        </div>
      ) : null}

      {/* Snapshot of the values the rest of the app reads */}
      <section aria-labelledby="profile-snapshot" className="space-y-5">
        <SectionHead
          title={<span id="profile-snapshot">Tóm tắt đang áp dụng</span>}
          meta={`Cập nhật lần cuối ${profile.updated_at}`}
        />

        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <StatBlock
              label="Cân nặng hiện tại"
              value={profile.current_weight_kg}
              unit="kg"
              meta={`Xuất phát ${profile.starting_weight_kg} kg · ${
                weightDelta <= 0 ? 'giảm' : 'tăng'
              } ${Math.abs(weightDelta)} kg`}
            />
            <StatBlock
              label="Còn cách mục tiêu"
              value={Math.abs(toGoal)}
              unit="kg"
              meta={`Mục tiêu ${profile.target_weight_kg} kg`}
            />
            <StatBlock
              label="Calo mục tiêu"
              value={formatNumber(profile.target_calories)}
              unit="kcal/ngày"
              meta={`TDEE ${formatNumber(profile.current_tdee)} kcal`}
            />
            <StatBlock
              label="Buổi tập mỗi tuần"
              value={profile.training_days_per_week}
              unit="buổi"
              meta={profile.split_name ?? '—'}
            />
          </dl>
        </Card>
      </section>

      {/* Body parameters */}
      <section aria-labelledby="body-params" className="space-y-5">
        <SectionHead
          title={<span id="body-params">Thông số cơ thể</span>}
          meta="Dùng cho công thức Mifflin-St Jeor và mục tiêu tốc độ thay đổi cân nặng."
        />
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="Tên học viên"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <SelectField
              label="Giới tính"
              value={draft.gender}
              onChange={(e) => set('gender', e.target.value)}
              hint="Dùng cho hằng số công thức Mifflin-St Jeor."
            >
              <option value="">Chưa chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </SelectField>
            <TextField
              label="Tuổi"
              type="number"
              inputMode="numeric"
              value={draft.age}
              onChange={(e) => set('age', Number.parseInt(e.target.value, 10) || 0)}
            />
            <TextField
              label="Chiều cao (cm)"
              type="number"
              inputMode="numeric"
              value={draft.height_cm}
              onChange={(e) => set('height_cm', Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <TextField
              label="Cân nặng bắt đầu (kg)"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.starting_weight_kg}
              onChange={(e) => set('starting_weight_kg', Number.parseFloat(e.target.value) || 0)}
            />
            <TextField
              label="Cân nặng hiện tại (kg)"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.current_weight_kg}
              onChange={(e) => set('current_weight_kg', Number.parseFloat(e.target.value) || 0)}
              hint="Ghi cân mới ở trang Hôm nay để TDEE bám sát thực tế."
            />
            <TextField
              label="Cân nặng mục tiêu (kg)"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.target_weight_kg}
              onChange={(e) => set('target_weight_kg', Number.parseFloat(e.target.value) || 0)}
            />
          </div>
        </Card>
      </section>

      {/* Energy targets */}
      <section aria-labelledby="energy-targets" className="space-y-5">
        <SectionHead
          title={<span id="energy-targets">Mục tiêu calo &amp; tốc độ</span>}
          meta="Calo mục tiêu chỉ nên dịch tối đa 100-150 kcal mỗi tuần để tránh nhiễu nước."
        />
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <SelectField
              label="Loại mục tiêu"
              value={draft.goal_type}
              onChange={(e) => set('goal_type', e.target.value as Profile['goal_type'])}
            >
              <option value="cut">Cắt mỡ (cut)</option>
              <option value="bulk">Tăng cơ (bulk)</option>
              <option value="recomp">Body recomposition</option>
            </SelectField>
            <TextField
              label="Tốc độ thay đổi (kg/tuần)"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.weekly_target_rate_kg}
              onChange={(e) => set('weekly_target_rate_kg', Number.parseFloat(e.target.value) || 0)}
              hint="Âm là giảm cân, dương là tăng cân."
            />
            <TextField
              label="Calo mục tiêu nạp (kcal)"
              type="number"
              inputMode="numeric"
              value={draft.target_calories}
              onChange={(e) => set('target_calories', Number.parseInt(e.target.value, 10) || 0)}
              hint={`TDEE hiện tại ${formatNumber(draft.current_tdee)} kcal`}
            />
          </div>
        </Card>
      </section>

      {/* Macro split */}
      <section aria-labelledby="macro-targets" className="space-y-5">
        <SectionHead
          title={<span id="macro-targets">Mục tiêu macro</span>}
          meta={`Tổng năng lượng từ macro: ${formatNumber(
            draft.macros_target.protein_g * 4 + draft.macros_target.carbs_g * 4 + draft.macros_target.fat_g * 9,
          )} kcal`}
        />
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <TextField
              label="Protein (g)"
              type="number"
              inputMode="numeric"
              value={draft.macros_target.protein_g}
              onChange={(e) => setMacro('protein_g', Number.parseInt(e.target.value, 10) || 0)}
              hint={`≈ ${formatNumber(draft.macros_target.protein_g * 4)} kcal từ đạm`}
            />
            <TextField
              label="Carbs (g)"
              type="number"
              inputMode="numeric"
              value={draft.macros_target.carbs_g}
              onChange={(e) => setMacro('carbs_g', Number.parseInt(e.target.value, 10) || 0)}
              hint="Ưu tiên quanh khung tập để giữ hiệu suất."
            />
            <TextField
              label="Fat (g)"
              type="number"
              inputMode="numeric"
              value={draft.macros_target.fat_g}
              onChange={(e) => setMacro('fat_g', Number.parseInt(e.target.value, 10) || 0)}
              hint="Không nên xuống dưới 0,5 g cho mỗi kg cân nặng."
            />
          </div>
        </Card>
      </section>

      {/* Training schedule */}
      <section aria-labelledby="training-split" className="space-y-5">
        <SectionHead
          title={<span id="training-split">Lịch tập</span>}
          meta="Số buổi mỗi tuần và giáo án phân chia đang theo."
        />
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Số buổi tập mỗi tuần"
              type="number"
              inputMode="numeric"
              value={draft.training_days_per_week}
              onChange={(e) => set('training_days_per_week', Number.parseInt(e.target.value, 10) || 0)}
            />
            <TextField
              label="Giáo án phân chia"
              value={draft.split_name ?? ''}
              onChange={(e) => set('split_name', e.target.value)}
              placeholder="VD: Upper / Lower (4 buổi)"
            />
          </div>
        </Card>
      </section>
    </div>
  );
}
