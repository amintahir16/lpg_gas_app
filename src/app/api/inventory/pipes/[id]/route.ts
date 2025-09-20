import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.gasPipe.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting gas pipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete gas pipe' },
      { status: 500 }
    );
  }
}
