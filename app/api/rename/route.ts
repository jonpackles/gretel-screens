import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_PATH = path.join(process.cwd(), 'public/content');

export async function POST(req: NextRequest) {
  const { oldPath, newName } = await req.json();

  if (!oldPath || !newName) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const fullOldPath = path.join(BASE_PATH, oldPath);
  const newPath = path.join(path.dirname(fullOldPath), newName);

  try {
    fs.renameSync(fullOldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Rename error:', err);
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
  }
}