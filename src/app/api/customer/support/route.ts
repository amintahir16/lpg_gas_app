import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Customer access required' },
        { status: 401 }
      );
    }

    // Get the customer ID
    const customer = await prisma.customer.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch support requests for this customer
    const supportRequests = await prisma.supportRequest.findMany({
      where: {
        customerId: customer.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform support requests into tickets format
    const tickets = supportRequests.map((request) => ({
      id: request.id,
      title: request.subject || `Support Request ${request.id}`,
      description: request.description,
      status: request.status,
      priority: request.priority || 'MEDIUM',
      category: request.category || 'GENERAL',
      createdAt: request.createdAt.toISOString().split('T')[0],
      updatedAt: request.updatedAt.toISOString().split('T')[0]
    }));

    return NextResponse.json({
      tickets,
      totalTickets: tickets.length,
      openTickets: tickets.filter(ticket => ticket.status === "PENDING" || ticket.status === "IN_PROGRESS").length,
      resolvedTickets: tickets.filter(ticket => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Customer access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Get the customer ID
    const customer = await prisma.customer.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create a new support request in the database
    const newSupportRequest = await prisma.supportRequest.create({
      data: {
        customerId: customer.id,
        subject: body.title,
        description: body.description,
        priority: body.priority || 'MEDIUM',
        category: body.category || 'GENERAL',
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket: {
        id: newSupportRequest.id,
        title: newSupportRequest.subject,
        description: newSupportRequest.description,
        status: newSupportRequest.status,
        priority: newSupportRequest.priority,
        category: newSupportRequest.category,
        createdAt: newSupportRequest.createdAt.toISOString().split('T')[0],
        updatedAt: newSupportRequest.updatedAt.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
} 