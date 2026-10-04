import { NextResponse } from 'next/server';
import { parseNaturalFoodInput } from '@/lib/foodParser';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input required' }, { status: 400 });
    }
    const result = parseNaturalFoodInput(text);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
