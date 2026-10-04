import { NextResponse } from 'next/server';
import { getProfile, saveProfile, Profile } from '@/lib/data';

export async function GET() {
  try {
    const profile = getProfile();
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: Profile = await request.json();
    body.updated_at = new Date().toISOString().split('T')[0];
    saveProfile(body);
    return NextResponse.json({ success: true, profile: body });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
