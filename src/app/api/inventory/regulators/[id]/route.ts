import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.regulator.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting regulator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete regulator' },
      { status: 500 }
    );
  }
}
