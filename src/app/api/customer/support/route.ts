import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      status: request.status || 'OPEN',
      priority: 'MEDIUM', // Priority is not in the model, default to MEDIUM
      category: 'GENERAL', // Category is not in the model, default to GENERAL
      createdAt: request.createdAt.toISOString().split('T')[0],
      updatedAt: request.updatedAt.toISOString().split('T')[0]
    }));

    return NextResponse.json({
      tickets,
      totalTickets: tickets.length,
      openTickets: tickets.filter(ticket => ticket.status === "OPEN").length,
      resolvedTickets: tickets.filter(ticket => ticket.status === "RESOLVED").length
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
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const newTicket = {
      id: newSupportRequest.id,
      title: newSupportRequest.subject,
      description: newSupportRequest.description,
      status: newSupportRequest.status,
      priority: 'MEDIUM',
      category: body.category || 'GENERAL',
      createdAt: newSupportRequest.createdAt.toISOString().split('T')[0],
      updatedAt: newSupportRequest.updatedAt.toISOString().split('T')[0]
    };

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket: newTicket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create ticket' },
      { status: 500 }
    );
  }
} 