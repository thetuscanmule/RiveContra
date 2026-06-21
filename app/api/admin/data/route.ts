import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const encounters = JSON.parse(fs.readFileSync(path.join(dataDir, 'encounters.json'), 'utf8'));
  const reactions  = JSON.parse(fs.readFileSync(path.join(dataDir, 'reactions.json'),  'utf8'));
  const settings   = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'),   'utf8'));
  return NextResponse.json({ encounters, reactions, settings });
}
