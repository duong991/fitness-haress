import { NextResponse } from 'next/server';
import { getExercises, saveExercises, Exercise } from '@/lib/data';

export async function GET() {
  try {
    const exercises = getExercises();
    return NextResponse.json(exercises);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const exercise: Exercise = await request.json();
    const exercises = getExercises();
    const index = exercises.findIndex(e => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = exercise;
    } else {
      exercises.push(exercise);
    }
    saveExercises(exercises);
    return NextResponse.json({ success: true, exercise });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
