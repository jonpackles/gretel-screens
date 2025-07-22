import { NextRequest, NextResponse } from 'next/server';
import { getInformContent } from '@/lib/inform/getInformContent';
import { processInformContent, filterVisibleContent } from '@/shared/utils/informContentDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🚀 API route /api/inform called');
  console.log('📋 Environment check:');
  console.log('  - GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID ? 'SET' : 'MISSING');
  
  const { searchParams } = new URL(request.url);
  const includeHidden = searchParams.get('includeHidden') === 'true';
  
  try {
    const rawContent = await getInformContent();
    console.log(`📦 Fetched ${rawContent.length} raw content blocks`);
    
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    if (includeHidden) {
      // For dashboard - show all content with hidden items sorted to bottom
      const processedContent = processInformContent(rawContent);
      console.log(`📦 API returning ${processedContent.length} content blocks with hidden items sorted to bottom`);
      return NextResponse.json(processedContent, { headers: responseHeaders });
    } else {
      // For actual screen display - filter out hidden content completely
      const processedContent = processInformContent(rawContent);
      const visibleContent = filterVisibleContent(processedContent);
      console.log(`📦 API returning ${visibleContent.length} visible content blocks (${processedContent.length - visibleContent.length} hidden)`);
      return NextResponse.json(visibleContent, { headers: responseHeaders });
    }
  } catch (error) {
    console.error('❌ API Error fetching inform content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inform content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 