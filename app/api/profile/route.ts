import { NextResponse } from 'next/server';
import { getProfile, saveProfile, Profile } from '@/lib/data';
import { localIsoDate } from '@/lib/format';
import { isProfileReady } from '@/lib/profile';

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
    body.updated_at = localIsoDate();
    // `onboarded` is derived, never hand-set: it flips on only when the real
    // body parameters and targets are present.
    body.onboarded = isProfileReady(body);
    saveProfile(body);
    return NextResponse.json({ success: true, profile: body });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
