import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Report {
  id: string;
  name: string;
  type: string;
  lastGenerated: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
  size: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Reports functionality will be implemented in future iterations
    // For now, return empty array as no reports table exists yet
    const reports: Report[] = [];
    const total = 0;

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type } = body;

    // Reports functionality will be implemented in future iterations
    // For now, return a placeholder report object
    const report: Report = {
      id: Date.now().toString(),
      name,
      type,
      lastGenerated: new Date().toISOString().split('T')[0],
      status: 'GENERATING',
      size: '0 MB'
    };

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
} 