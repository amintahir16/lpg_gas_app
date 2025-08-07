import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Expect: customerId, subject, description
    const { customerId, subject, description } = data;
    if (!customerId || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const supportRequest = await prisma.supportRequest.create({
      data: {
        customerId,
        subject,
        description,
        status: 'PENDING',
      },
    });
    return NextResponse.json(supportRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}