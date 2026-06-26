import { NextResponse } from 'next/server';
import type { LeaderboardEntry } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });

  const res = await fetch(
    `${url}/rest/v1/leaderboard?select=id,name,score,created_at&order=score.desc,created_at.asc&limit=10`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body }, { status: res.status });
  }

  const entries = await res.json() as LeaderboardEntry[];
  return NextResponse.json({ entries });
}
