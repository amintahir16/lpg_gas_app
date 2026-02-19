import { NextRequest, NextResponse } from 'next/server'; // Correct import
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Get specific admin details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Correct type for dynamic routes in Next.js 15
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                firstName: true,
                lastName: true,
                phone: true,
                cnic: true,
                lastActiveAt: true,
                createdAt: true,
                activityLogs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        action: true,
                        details: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);

    } catch (error) {
        console.error('Error fetching admin details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admin details' },
            { status: 500 }
        );
    }
}

// PUT: Update admin details
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { firstName, lastName, email, phone, cnic, isActive, password } = body;

        const updateData: any = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (cnic) updateData.cnic = cnic;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (firstName && lastName) {
            updateData.name = `${firstName} ${lastName}`;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error('Error updating admin:', error);
        return NextResponse.json(
            { error: 'Failed to update admin' },
            { status: 500 }
        );
    }
}

// DELETE: Delete admin (or deactivate)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Correct type for dynamic routes in Next.js 15
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        // Instead of hard delete, maybe just deactivate?
        // User requested "remove them completely" for vendors/customers, but for admins...
        // "remove them completly" was for customer/vendor portals.
        // Let's implement hard delete but with caution.

        // Check if user has related records that prevent deletion
        // If they have created transactions, we might need to keep them or use cascade delete
        // For now, let's try to delete and handle error
        try {
            await prisma.user.delete({
                where: { id }
            });
        } catch (error: any) {
            if (error.code === 'P2003') { // Foreign key constraint failed
                // Fallback to deactivation if they have related data
                await prisma.user.update({
                    where: { id },
                    data: { isActive: false }
                });
                return NextResponse.json({ message: 'User deactivated (could not delete due to related data)' });
            }
            throw error;
        }

        return NextResponse.json({ message: 'Admin deleted successfully' });

    } catch (error) {
        console.error('Error deleting admin:', error);
        return NextResponse.json(
            { error: 'Failed to delete admin' },
            { status: 500 }
        );
    }
}
