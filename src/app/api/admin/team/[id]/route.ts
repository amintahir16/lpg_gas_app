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
                regionId: true,
                region: {
                    select: { id: true, name: true, code: true, isActive: true },
                },
                userRegions: {
                    select: {
                        regionId: true,
                        region: { select: { id: true, name: true, code: true, isActive: true } },
                    },
                },
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

        // Build a canonical accessible-regions list for the UI: primary first,
        // then any additional branches from the join table (de-duplicated).
        const seen = new Set<string>();
        const regions: Array<{ id: string; name: string; code?: string | null; isActive: boolean; isPrimary: boolean }> = [];
        if (user.region) {
            seen.add(user.region.id);
            regions.push({ ...user.region, isPrimary: true });
        }
        for (const ur of user.userRegions) {
            if (!ur.region || seen.has(ur.region.id)) continue;
            seen.add(ur.region.id);
            regions.push({ ...ur.region, isPrimary: false });
        }

        return NextResponse.json({ ...user, regions });

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

        // Branch assignment payload: prefer `regionIds: string[]` (multi-branch,
        // first = primary). Fall back to legacy `regionId: string | null`.
        let regionIdsInput: string[] | undefined;
        if (Array.isArray(body.regionIds)) {
            regionIdsInput = Array.from(
                new Set(
                    (body.regionIds as unknown[]).filter(
                        (v): v is string => typeof v === 'string' && v.trim().length > 0
                    )
                )
            );
        } else if (body.regionId !== undefined) {
            // Legacy single-region payload — `null`/`''` means "revoke all".
            regionIdsInput = body.regionId ? [body.regionId as string] : [];
        }

        const target = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                regionId: true,
                name: true,
                email: true,
                userRegions: { select: { regionId: true } },
            },
        });
        if (!target) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
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

        // Resolve region changes (SUPER_ADMIN superpower).
        // Only meaningful for ADMIN users; SUPER_ADMINs are not region-scoped.
        let regionChange: {
            from: { primary: string | null; ids: string[] };
            to: { primary: string | null; ids: string[] };
        } | null = null;

        if (regionIdsInput !== undefined && target.role === 'ADMIN') {
            const newPrimary = regionIdsInput[0] ?? null;

            if (regionIdsInput.length > 0) {
                const found = await prisma.region.findMany({
                    where: { id: { in: regionIdsInput } },
                    select: { id: true, isActive: true },
                });
                if (found.length !== regionIdsInput.length) {
                    return NextResponse.json(
                        { error: 'One or more selected branches were not found.' },
                        { status: 400 }
                    );
                }
                if (found.some((r) => !r.isActive)) {
                    return NextResponse.json(
                        { error: 'One or more selected branches are inactive.' },
                        { status: 400 }
                    );
                }
            }

            updateData.regionId = newPrimary;

            const previousIds = (() => {
                const seen = new Set<string>();
                const out: string[] = [];
                if (target.regionId) { seen.add(target.regionId); out.push(target.regionId); }
                for (const ur of target.userRegions) {
                    if (!seen.has(ur.regionId)) { seen.add(ur.regionId); out.push(ur.regionId); }
                }
                return out;
            })();

            regionChange = {
                from: { primary: target.regionId, ids: previousIds },
                to: { primary: newPrimary, ids: regionIdsInput },
            };
        }

        // Apply user update + region join sync atomically. The join table
        // mirrors the full assigned set (including the primary) so the union
        // has one canonical source.
        const updatedUser = await prisma.$transaction(async (tx) => {
            const u = await tx.user.update({
                where: { id },
                data: updateData,
                include: {
                    region: { select: { id: true, name: true, code: true } },
                },
            });
            if (regionChange) {
                await tx.userRegion.deleteMany({ where: { userId: id } });
                if (regionChange.to.ids.length > 0) {
                    await tx.userRegion.createMany({
                        data: regionChange.to.ids.map((rid) => ({ userId: id, regionId: rid })),
                        skipDuplicates: true,
                    });
                }
            }
            return u;
        });

        if (regionChange) {
            const action =
                regionChange.to.ids.length === 0
                    ? 'REVOKED_ADMIN_REGION'
                    : regionChange.from.ids.length === 0
                        ? 'ASSIGNED_ADMIN_REGION'
                        : 'CHANGED_ADMIN_REGION';
            await prisma.activityLog.create({
                data: {
                    userId: session.user.id,
                    action,
                    entityType: 'User',
                    entityId: id,
                    details: `Admin ${target.email} branches: [${
                        regionChange.from.ids.join(', ') || 'none'
                    }] -> [${regionChange.to.ids.join(', ') || 'none'}]`,
                    metadata: regionChange,
                },
            });
        }

        // Strip the password hash before responding even though only a
        // SUPER_ADMIN gets here — defense in depth keeps hashes out of the
        // browser/devtools/log pipeline.
        const { password: _pw, ...safeUser } = updatedUser;
        return NextResponse.json(safeUser);

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
