import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const userEmail = request.headers.get('x-user-email');
  
  console.log(`[TEST API] Headers - UserId: ${userId}, Role: ${userRole}, Email: ${userEmail}`);
  
  if (!userId) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'No user ID in headers',
      headers: {
        userId,
        userRole,
        userEmail
      }
    }, { status: 401 });
  }
  
  return NextResponse.json({ 
    success: true,
    message: 'Authentication working',
    user: {
      id: userId,
      role: userRole,
      email: userEmail
    }
  });
} 