'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Plus, Trophy } from 'lucide-react';
import { Exercise } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Card';

interface QuickWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSuccess: () => void;
}

export default function QuickWorkoutModal({
  isOpen,
  onClose,
  date,
  onSuccess,
}: QuickWorkoutModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [weightKg, setWeightKg] = useState('60');
  const [reps, setReps] = useState('8');
  const [rpe, setRpe] = useState('8');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPr, setNewPr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/exercises')
      .then((res) => res.json())
      .then((data: Exercise[]) => {
        setExercises(data);
        setSelectedExId((prev) => prev || data[0]?.id || '');
      })
      .catch(() => setError('Không tải được thư viện bài tập.'));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setNewPr(null);
    }
  }, [isOpen]);

  const selected = exercises.find((e) => e.id === selectedExId);
  const weight = Number.parseFloat(weightKg) || 0;
  const repCount = Number.parseInt(reps, 10) || 0;
  const rpeValue = Number.parseFloat(rpe) || 0;
  const volume = weight * repCount;

  const beatsPr =
    selected &&
    (weight > (selected.personal_record?.weight_kg ?? 0) ||
      (weight === (selected.personal_record?.weight_kg ?? 0) &&
        repCount > (selected.personal_record?.reps ?? 0)));

  async function handleAddSet() {
    if (!selectedExId || repCount <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/daily/${date}`);
      const dailyLog = await res.json();

      const exName = selected?.name ?? selectedExId;

      if (!dailyLog.workout) {
        dailyLog.workout = {
          completed: true,
          session_name: 'Buổi tập hôm nay',
          duration_minutes: 60,
          total_volume_kg: 0,
          exercises: [],
        };
      }
      dailyLog.workout.completed = true;

      let target = dailyLog.workout.exercises.find(
        (e: { exercise_id: string }) => e.exercise_id === selectedExId,
      );
      if (!target) {
        target = { exercise_id: selectedExId, exercise_name: exName, sets: [] };
        dailyLog.workout.exercises.push(target);
      }

      target.sets.push({
        set_number: target.sets.length + 1,
        weight_kg: weight,
        reps: repCount,
        rpe: rpeValue,
        completed: true,
      });

      await fetch(`/api/daily/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyLog),
      });

      if (selected && beatsPr) {
        await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...selected,
            personal_record: { weight_kg: weight, reps: repCount, date },
          }),
        });
        setNewPr(`${exName}: ${weight} kg × ${repCount} reps`);
      }

      onSuccess();
      window.dispatchEvent(new CustomEvent('fitness-data-updated'));
      onClose();
    } catch {
      setError('Không ghi được set tập vào file ngày. Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Ghi set tập"
      description={`Ngày ${date} · mỗi set lưu set number, mức tạ, số reps và RPE.`}
      size="md"
      icon={<Dumbbell />}
      footer={
        <>
          <span className="mr-auto font-metric text-[12px] text-ink-muted">
            Volume set: {formatNumber(volume)} kg
          </span>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleAddSet}
            disabled={saving || !selectedExId}
            icon={<Plus />}
          >
            {saving ? 'Đang lưu...' : 'Lưu set tập'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <SelectField
          label="Bài tập"
          value={selectedExId}
          onChange={(e) => setSelectedExId(e.target.value)}
          hint={selected ? `Nhóm cơ: ${selected.target_muscle} · ${selected.category}` : undefined}
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} ({ex.target_muscle})
            </option>
          ))}
        </SelectField>

        {/* Current record for the selected lift, so the next set has a target. */}
        {selected ? (
          <div className="flex flex-wrap items-center gap-2 r-card border border-hairline bg-canvas px-3 py-2.5">
            <Trophy className="h-3.5 w-3.5 flex-shrink-0 text-sticker-orange" strokeWidth={1.75} />
            <span className="text-[13px] text-ink-secondary">Kỷ lục hiện tại</span>
            {selected.personal_record ? (
              <>
                <Pill tone="orange">
                  {selected.personal_record.weight_kg} kg × {selected.personal_record.reps}
                </Pill>
                <span className="font-metric text-[12px] text-ink-faint">
                  ghi ngày {selected.personal_record.date}
                </span>
              </>
            ) : (
              <span className="text-[12px] text-ink-faint">Chưa có bản ghi PR</span>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Mức tạ (kg)"
            type="number"
            step="0.5"
            inputMode="decimal"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <TextField
            label="Số reps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
          <TextField
            label="RPE (1-10)"
            type="number"
            step="0.5"
            min={1}
            max={10}
            inputMode="decimal"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
          />
        </div>

        {newPr ? (
          <p className="flex items-start gap-2 r-card border border-sticker-green-line bg-sticker-green-soft px-3 py-2.5 text-[13px] text-ink">
            <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-sticker-green" />
            <span>
              Kỷ lục mới đã ghi vào exercises.json · <strong>{newPr}</strong>
            </span>
          </p>
        ) : null}

        {beatsPr && !newPr ? (
          <p className="flex items-start gap-2 r-card border border-sticker-green-line bg-sticker-green-soft px-3 py-2.5 text-[13px] text-ink">
            <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-sticker-green" />
            <span>Set này vượt kỷ lục hiện tại. Lưu để cập nhật personal_record.</span>
          </p>
        ) : null}

        {error ? (
          <p className="r-card border border-bad-line bg-bad-surface px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
