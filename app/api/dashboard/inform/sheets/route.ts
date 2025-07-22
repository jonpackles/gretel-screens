import { NextResponse } from 'next/server';
import { fetchProjectsFromSheet } from '@/lib/inform/fetch/fetchProjectsFromSheet';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🚀 API route /api/dashboard/inform/sheets called');
  
  try {
    const projects = await fetchProjectsFromSheet();
    console.log(`📦 API returning ${projects.length} projects from sheets`);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('❌ API Error fetching sheets data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheets data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 