import { NextResponse } from 'next/server';
import { getInformContent } from '@/lib/inform/getInformContent';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🚀 API route /api/inform called');
  console.log('📋 Environment check:');
  console.log('  - GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID ? 'SET' : 'MISSING');
  
  try {
    const content = await getInformContent();
    console.log(`📦 API returning ${content.length} content blocks`);
    return NextResponse.json(content);
  } catch (error) {
    console.error('❌ API Error fetching inform content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inform content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 