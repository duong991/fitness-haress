import { describe, expect, it } from 'vitest';
import { availableExercises, buildWorkoutRecommendation } from '@/lib/core/recommend';
import type { Exercise } from '@/lib/data';
import { makeProfile } from './helpers';

const lib: Exercise[] = [
  { id: 'bench', name: 'Barbell Bench Press', target_muscle: 'Chest', category: 'Compound', equipment: ['barbell'] },
  { id: 'push_up', name: 'Push-Up', target_muscle: 'Chest', category: 'Bodyweight', equipment: ['bodyweight'] },
  { id: 'db_press', name: 'Dumbbell Floor Press', target_muscle: 'Chest', category: 'Compound', equipment: ['dumbbell'] },
  { id: 'untagged', name: 'Mystery Chest Move', target_muscle: 'Chest', category: 'Compound' },
];

describe('availableExercises', () => {
  it('returns the whole library for gym users', () => {
    expect(availableExercises(lib, makeProfile()).length).toBe(4);
  });

  it('keeps only owned gear (plus bodyweight) at home and drops untagged moves', () => {
    const ids = availableExercises(lib, makeProfile({ training_location: 'home', equipment: ['dumbbell'] })).map((e) => e.id);
    expect(ids).toEqual(['push_up', 'db_press']);
  });

  it('with no equipment, home leaves bodyweight only', () => {
    const ids = availableExercises(lib, makeProfile({ training_location: 'home', equipment: [] })).map((e) => e.id);
    expect(ids).toEqual(['push_up']);
  });
});

describe('home workout recommendation', () => {
  it('prescribes bodyweight moves by reps, not by an invented load', () => {
    const profile = makeProfile({
      training_location: 'home',
      equipment: [],
      training_days_per_week: 7,
      split_config: { name: 'Home', days: [{ name: 'Push', muscles: ['Chest'] }] },
    });
    const rec = buildWorkoutRecommendation({ profile, logs: [], exercises: lib, date: '2026-10-05' });
    expect(rec.items.map((i) => i.exercise_id)).toEqual(['push_up']);
    expect(rec.items[0].top_set_weight_kg).toBe(0);
    expect(rec.items[0].reps).toBeGreaterThanOrEqual(10);
  });
});
