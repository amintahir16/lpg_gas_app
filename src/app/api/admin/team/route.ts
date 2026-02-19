import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: List all admins and super admins
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const whereClause: any = {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { cnic: { contains: search, mode: 'insensitive' } }
            ];
        }

        const teamMembers = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true, // Assuming isActive exists on User model based on schema read
                firstName: true,
                lastName: true,
                phone: true,
                cnic: true,
                lastActiveAt: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(teamMembers);

    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json(
            { error: 'Failed to fetch team members' },
            { status: 500 }
        );
    }
}

// POST: Create a new admin
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { firstName, lastName, email, phone, cnic, password } = body;

        // Validation
        if (!firstName || !lastName || !email || !phone || !cnic || !password) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate CNIC format (MB-1234567-8 or 12345-1234567-8)
        // Assuming standard Pakistani CNIC format: 5 digits - 7 digits - 1 digit
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
        if (!cnicRegex.test(cnic)) {
            return NextResponse.json(
                { error: 'Invalid CNIC format. Use standard format (e.g., 12345-1234567-8)' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { cnic } // CNIC must be unique
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email or CNIC already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${firstName} ${lastName}`;

        const newUser = await prisma.user.create({
            data: {
                name: fullName,
                firstName,
                lastName,
                email,
                phone,
                cnic,
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true
            }
        });

        // Log the activity
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: 'CREATED_ADMIN',
                entityType: 'User',
                entityId: newUser.id,
                details: `Created admin account for ${fullName} (${email})`
            }
        });

        return NextResponse.json(newUser, { status: 201 });

    } catch (error) {
        console.error('Error creating admin:', error);
        return NextResponse.json(
            { error: 'Failed to create admin' },
            { status: 500 }
        );
    }
}
