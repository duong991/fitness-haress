'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Plus, Search, SearchX, Trophy, X } from 'lucide-react';
import { Exercise } from '@/lib/data';
import { estimate1RM, formatDecimal } from '@/lib/format';
import { cx } from '@/lib/cx';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Card, EmptyState, Pill, SectionHead, SkeletonRows, type StickerTone } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

const MUSCLES = ['ALL', 'Chest', 'Back', 'Quads', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps'];

/* A sticker tone per muscle group: decoration that helps a long list read
   faster. It never reaches a button or a chart. */
const MUSCLE_TONE: Record<string, StickerTone> = {
  Chest: 'orange',
  Back: 'sky',
  Quads: 'purple',
  Hamstrings: 'teal',
  Shoulders: 'pink',
  Biceps: 'green',
  Triceps: 'brown',
};

const TONE_TILE: Record<StickerTone, string> = {
  orange: 'bg-sticker-orange',
  sky: 'bg-sticker-sky',
  purple: 'bg-sticker-purple',
  teal: 'bg-sticker-teal',
  pink: 'bg-sticker-pink',
  green: 'bg-sticker-green',
  brown: 'bg-sticker-brown',
  neutral: 'bg-hairline',
  primary: 'bg-primary',
};

function toneFor(muscle: string): StickerTone {
  const key = Object.keys(MUSCLE_TONE).find((m) => muscle.toLowerCase().includes(m.toLowerCase()));
  return key ? MUSCLE_TONE[key] : 'neutral';
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Chest');
  const [newExCategory, setNewExCategory] = useState('Compound');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadExercises() {
    fetch('/api/exercises')
      .then((res) => res.json())
      .then((data: Exercise[]) => setExercises(data))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadExercises();
  }, []);

  const filtered = useMemo(
    () =>
      exercises.filter((ex) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          ex.name.toLowerCase().includes(q) ||
          ex.target_muscle.toLowerCase().includes(q);
        const matchesMuscle =
          selectedMuscle === 'ALL' ||
          ex.target_muscle.toLowerCase().includes(selectedMuscle.toLowerCase());
        return matchesSearch && matchesMuscle;
      }),
    [exercises, search, selectedMuscle],
  );

  const prCount = exercises.filter((e) => e.personal_record).length;

  async function handleCreateExercise() {
    const name = newExName.trim();
    if (!name) {
      setFormError('Cần nhập tên bài tập.');
      return;
    }
    if (exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      setFormError('Bài tập này đã có trong thư viện.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const newEx: Exercise = {
        id: name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, ''),
        name,
        target_muscle: newExMuscle,
        category: newExCategory,
      };
      await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEx),
      });
      setIsModalOpen(false);
      setNewExName('');
      loadExercises();
    } catch {
      setFormError('Không lưu được bài tập mới. Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10 pb-8">
      <PageHeader
        title="Thư viện bài tập & kỷ lục"
        description="Danh mục bài tập, nhóm cơ chính và mức tạ kỷ lục cá nhân, kèm ước tính 1RM theo công thức Epley."
        icon={Trophy}
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setIsModalOpen(true)}>
            Thêm bài tập
          </Button>
        }
      />

      {/* Filter bar */}
      <section aria-label="Bộ lọc bài tập" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên bài tập hoặc nhóm cơ"
              aria-label="Tìm bài tập"
              className="w-full r-input border border-hairline bg-surface py-2 pl-9 pr-3 text-body-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <p className="text-[13px] text-ink-muted">
            <span className="font-metric font-semibold text-ink">{prCount}</span> / {exercises.length}{' '}
            bài đã có kỷ lục
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="flex-shrink-0 text-[12px] font-medium text-ink-faint">Nhóm cơ</span>
          {MUSCLES.map((muscle) => {
            const active = selectedMuscle === muscle;
            return (
              <button
                key={muscle}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedMuscle(muscle)}
                className={cx(
                  'flex-shrink-0 r-chip border px-3 py-1.5 text-[13px] font-medium transition-colors active:scale-[0.98]',
                  active
                    ? 'border-transparent bg-primary text-white'
                    : 'border-hairline bg-surface text-ink-muted hover:bg-canvas hover:text-ink',
                )}
              >
                {muscle === 'ALL' ? 'Tất cả' : muscle}
              </button>
            );
          })}
          {(search || selectedMuscle !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedMuscle('ALL');
              }}
              className="flex flex-shrink-0 items-center gap-1 r-chip px-2.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <X className="h-3.5 w-3.5" /> Xóa lọc
            </button>
          )}
        </div>
      </section>

      {/* Library grid */}
      <section aria-label="Danh mục bài tập" className="space-y-5">
        <SectionHead
          title="Danh mục"
          meta={
            filtered.length === exercises.length
              ? `${exercises.length} bài tập trong exercises.json`
              : `${filtered.length} kết quả trên ${exercises.length} bài tập`
          }
        />

        {loading ? (
          <SkeletonRows rows={3} cols={3} />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((ex) => {
              const pr = ex.personal_record;
              const tone = toneFor(ex.target_muscle);
              const oneRm = pr ? estimate1RM(pr.weight_kg, pr.reps) : null;

              return (
                <Card key={ex.id} className="flex flex-col">
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          'flex h-8 w-8 flex-shrink-0 items-center justify-center r-card text-white',
                          TONE_TILE[tone],
                        )}
                      >
                        <Dumbbell className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-body-sm font-semibold leading-snug text-ink">{ex.name}</h3>
                        <p className="mt-0.5 text-[12px] text-ink-muted">{ex.target_muscle}</p>
                      </div>
                      <Pill>{ex.category}</Pill>
                    </div>

                    {pr ? (
                      <div className="mt-auto border-t border-hairline-soft pt-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                            <Trophy className="h-3.5 w-3.5 text-sticker-orange" strokeWidth={1.75} />
                            Kỷ lục cá nhân
                          </span>
                          <span className="font-metric text-[11px] text-ink-faint">{pr.date}</span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                          <p className="font-metric text-[17px] font-bold leading-none text-ink">
                            {pr.weight_kg} kg
                            <span className="ml-1.5 text-[13px] font-normal text-ink-muted">
                              × {pr.reps} reps
                            </span>
                          </p>
                          {oneRm ? (
                            <span className="font-metric text-[12px] text-ink-faint">
                              1RM ≈ {formatDecimal(oneRm)} kg
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto border-t border-dashed border-hairline pt-3">
                        <p className="text-[12px] text-ink-faint">
                          Chưa có bản ghi PR. Ghi set đầu tiên ở trang Buổi tập.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<SearchX />}
            title="Không có bài tập nào khớp bộ lọc"
            description="Thử bỏ từ khóa tìm kiếm, chọn nhóm cơ khác, hoặc thêm bài tập mới vào thư viện."
            action={
              <Button
                variant="utility"
                onClick={() => {
                  setSearch('');
                  setSelectedMuscle('ALL');
                }}
              >
                Xóa bộ lọc
              </Button>
            }
          />
        )}
      </section>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm bài tập mới"
        description="Bài tập mới xuất hiện trong danh sách chọn khi ghi set tập."
        size="sm"
        icon={<Dumbbell />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateExercise} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo bài tập'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <TextField
            label="Tên bài tập"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
            placeholder="VD: Incline Dumbbell Press"
            autoFocus
            error={formError}
            hint="Dùng đúng tên tiếng Anh để dễ đối chiếu với kỷ lục cũ."
          />
          <SelectField
            label="Nhóm cơ chính"
            value={newExMuscle}
            onChange={(e) => setNewExMuscle(e.target.value)}
          >
            {['Chest', 'Back', 'Quads', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Calves'].map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ),
            )}
          </SelectField>
          <SelectField
            label="Phân loại"
            value={newExCategory}
            onChange={(e) => setNewExCategory(e.target.value)}
          >
            <option value="Compound">Compound (đa khớp)</option>
            <option value="Isolation">Isolation (đơn khớp)</option>
            <option value="Machine">Machine / Cable</option>
            <option value="Bodyweight">Bodyweight</option>
          </SelectField>
        </div>
      </Modal>
    </div>
  );
}
