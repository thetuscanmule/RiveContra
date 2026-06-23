import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const ALLOWED = ['mp3', 'ogg', 'wav', 'webm', 'm4a'];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file  = formData.get('file')  as File   | null;
  const phase = formData.get('phase') as string | null;

  if (!file || !phase) return NextResponse.json({ error: 'Missing file or phase' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `Unsupported format — use ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const dir = path.join(process.cwd(), 'public', 'audio');
  await mkdir(dir, { recursive: true });

  const filename = `${phase}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ src: `/audio/${filename}` });
}
