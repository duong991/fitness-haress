import { NextResponse } from 'next/server';
import { getAllDailyLogs } from '@/lib/data';

export async function GET() {
  try {
    const logs = getAllDailyLogs();
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
