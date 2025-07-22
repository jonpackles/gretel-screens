import { NextRequest, NextResponse } from 'next/server';
import {
  getContentOverride,
  setContentVisibility,
  setContentOverrides,
  updateContentRecord,
  toggleContentVisibility,
  removeContentOverride,
  loadInformContentDb,
  type InformContentOverride
} from '@/shared/utils/informContentDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('id');
  const action = searchParams.get('action');

  try {
    if (action === 'list-all') {
      // Get all content overrides
      const db = loadInformContentDb();
      return NextResponse.json(db);
    }

    if (contentId) {
      // Get specific content override
      const override = getContentOverride(contentId);
      return NextResponse.json({ 
        id: contentId, 
        ...override,
        visibility: override?.visibility || 'visible'
      });
    }

    return NextResponse.json({ error: 'Missing content ID or action parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error in inform content GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, contentId, visibility, overrides } = body;

    if (!contentId) {
      return NextResponse.json({ error: 'Missing contentId' }, { status: 400 });
    }

    switch (action) {
      case 'set-visibility':
        if (!visibility) {
          return NextResponse.json({ error: 'Missing visibility parameter' }, { status: 400 });
        }
        setContentVisibility(contentId, visibility);
        return NextResponse.json({ 
          success: true, 
          contentId, 
          visibility 
        });

      case 'toggle-visibility':
        const newVisibility = toggleContentVisibility(contentId);
        return NextResponse.json({ 
          success: true, 
          contentId, 
          visibility: newVisibility 
        });

      case 'set-overrides':
        if (!overrides) {
          return NextResponse.json({ error: 'Missing overrides parameter' }, { status: 400 });
        }
        setContentOverrides(contentId, overrides);
        return NextResponse.json({ 
          success: true, 
          contentId, 
          overrides 
        });

      case 'update':
        const updateData: Partial<InformContentOverride> = {};
        if (visibility) updateData.visibility = visibility;
        if (overrides) updateData.overrides = overrides;
        
        updateContentRecord(contentId, updateData);
        return NextResponse.json({ 
          success: true, 
          contentId, 
          updated: updateData 
        });

      case 'remove':
        removeContentOverride(contentId);
        return NextResponse.json({ 
          success: true, 
          contentId, 
          message: 'Content reset to original' 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in inform content POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 