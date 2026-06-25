import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

const ALLOWED = ['png', 'svg', 'webp', 'jpg', 'jpeg'];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `Unsupported format — use ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const filename = `dialogue-divider.${ext}`;
  await writeFile(
    path.join(process.cwd(), 'public', filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ src: `/${filename}` });
}
