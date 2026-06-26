import { NextResponse } from 'next/server';
import { supabase, type LeaderboardEntry } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('id, name, score, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data as LeaderboardEntry[] });
}
