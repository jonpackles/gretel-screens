import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_PATH = path.join(process.cwd(), 'public/content');

function getDirectoryContents(dirPath: string, relativeBase = '', recursive = false): any[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap(entry => {
    const absolutePath = path.join(dirPath, entry.name);
    const relativePath = path.join(relativeBase, entry.name);
    const stat = fs.statSync(absolutePath);

    if (entry.isDirectory()) {
      const dirItem = {
        name: entry.name,
        type: 'directory',
        path: relativePath.replace(/\\/g, '/'),
        lastModified: stat.mtime.toISOString(),
      };

      if (recursive) {
        const children = getDirectoryContents(absolutePath, relativePath, true);
        return [dirItem, ...children];
      } else {
        return [dirItem];
      }
    } else {
      return [{
        name: entry.name,
        type: 'file',
        path: relativePath.replace(/\\/g, '/'),
        lastModified: stat.mtime.toISOString(),
      }];
    }
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relativePath = searchParams.get('path') || '';
  const recursive = searchParams.get('recursive') === 'true';
  const fullPath = path.join(BASE_PATH, relativePath);

  try {
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    const items = getDirectoryContents(fullPath, relativePath, recursive);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}