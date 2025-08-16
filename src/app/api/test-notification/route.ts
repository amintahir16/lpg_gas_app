import { NextRequest, NextResponse } from 'next/server';
import { createSimpleNotification } from '@/lib/simpleNotifications';

export async function POST(request: NextRequest) {
  try {
    const notification = await createSimpleNotification(
      'TEST',
      'Test Notification',
      'This is a test notification to verify the system works',
      'test@example.com'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification created successfully',
      notification 
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification' },
      { status: 500 }
    );
  }
} 