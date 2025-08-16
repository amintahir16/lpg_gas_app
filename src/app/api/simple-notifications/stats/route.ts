import { NextRequest, NextResponse } from 'next/server';
import { getNotificationStats } from '@/lib/simpleNotifications';

export async function GET(request: NextRequest) {
  try {
    const stats = await getNotificationStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Simple notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
} 