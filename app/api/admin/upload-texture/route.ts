import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const slot = formData.get('slot') as string | null;

  if (!file || !slot) {
    return NextResponse.json({ error: 'Missing file or slot' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'svg') {
    return NextResponse.json({ error: 'SVG files only' }, { status: 400 });
  }

  const filename = `ring${slot}.svg`;
  const filepath = path.join(process.cwd(), 'public', filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  return NextResponse.json({ src: `/${filename}` });
}
