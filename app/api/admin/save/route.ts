import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function POST(request: NextRequest) {
  let body: { encounters?: unknown; reactions?: unknown; settings?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.encounters || !body.reactions || !body.settings) {
    return NextResponse.json({ error: 'Missing encounters, reactions, or settings' }, { status: 400 });
  }

  try {
    fs.writeFileSync(
      path.join(DATA_DIR, 'encounters.json'),
      JSON.stringify(body.encounters, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(DATA_DIR, 'reactions.json'),
      JSON.stringify(body.reactions, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(DATA_DIR, 'settings.json'),
      JSON.stringify(body.settings, null, 2),
      'utf8',
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin save failed:', err);
    return NextResponse.json({ error: 'Write failed — filesystem may be read-only (production)' }, { status: 500 });
  }
}
