import { NextRequest, NextResponse } from 'next/server';
import { 
  getFileVisibility, 
  setFileVisibility, 
  toggleFileVisibility, 
  batchUpdateVisibility,
  getHiddenFiles,
  clearVisibilityDb 
} from '@/shared/utils/visibilityDb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const action = searchParams.get('action');

  try {
    if (action === 'list-hidden') {
      // Get all hidden files
      const hiddenFiles = getHiddenFiles();
      return NextResponse.json({ hiddenFiles });
    }

    if (filePath) {
      // Get visibility for specific file
      const visibility = getFileVisibility(filePath);
      return NextResponse.json({ path: filePath, visibility });
    }

    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error in visibility GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path, visibility, updates } = body;

    switch (action) {
      case 'set':
        if (!path || !visibility) {
          return NextResponse.json({ error: 'Missing path or visibility' }, { status: 400 });
        }
        setFileVisibility(path, visibility);
        return NextResponse.json({ success: true, path, visibility });

      case 'toggle':
        if (!path) {
          return NextResponse.json({ error: 'Missing path' }, { status: 400 });
        }
        const newVisibility = toggleFileVisibility(path);
        return NextResponse.json({ success: true, path, visibility: newVisibility });

      case 'batch':
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({ error: 'Missing or invalid updates' }, { status: 400 });
        }
        batchUpdateVisibility(updates);
        return NextResponse.json({ success: true, updatedCount: Object.keys(updates).length });

      case 'clear':
        clearVisibilityDb();
        return NextResponse.json({ success: true, message: 'All files set to visible' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in visibility POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 