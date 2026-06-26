import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { name?: unknown; score?: unknown } | null;

  const name  = typeof body?.name  === 'string'  ? body.name.trim().slice(0, 16)  : null;
  const score = typeof body?.score === 'number'   ? Math.floor(body.score)         : null;

  if (!name || !score || score <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase.from('leaderboard').insert({ name, score });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
