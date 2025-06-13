import { NextRequest, NextResponse } from 'next/server';
import { MetadataCache } from '@/shared/utils/mediaMetadata';

export async function DELETE(req: NextRequest) {
  try {
    // Get cache stats before clearing
    const beforeStats = await MetadataCache.getStats();
    
    // Clear the metadata cache
    await MetadataCache.clear();
    
    // Get cache stats after clearing
    const afterStats = await MetadataCache.getStats();
    
    return NextResponse.json({
      message: 'Cache cleared successfully',
      before: beforeStats,
      after: afterStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ 
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const stats = await MetadataCache.getStats();
    
    return NextResponse.json({
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get cache stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Clean up expired entries
    const removedCount = await MetadataCache.cleanup();
    const stats = await MetadataCache.getStats();
    
    return NextResponse.json({
      message: 'Cache cleanup completed',
      removedEntries: removedCount,
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    return NextResponse.json({ 
      error: 'Failed to clean cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 