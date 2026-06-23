import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

const ALLOWED = ['svg', 'png', 'webp', 'cur'];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const slot = formData.get('slot') as string | null; // 'default' | 'hover'

  if (!file || !slot) return NextResponse.json({ error: 'Missing file or slot' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `Unsupported format — use ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const filename = `cursor-${slot}.${ext}`;
  await writeFile(
    path.join(process.cwd(), 'public', filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ src: `/${filename}` });
}
