import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext !== 'svg') {
    return NextResponse.json({ error: 'Only SVG files are supported' }, { status: 400 });
  }

  const filename = `bg-texture.svg`;
  await writeFile(
    path.join(process.cwd(), 'public', filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ src: `/${filename}` });
}
