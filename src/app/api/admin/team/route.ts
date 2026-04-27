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
            },
            orderBy: { createdAt: 'desc' }
        });

        // Merge `regionId` (primary) + `userRegions` (additional) into a
        // canonical de-duplicated `regions` array per admin so the UI can
        // render branch chips without re-implementing the union client-side.
        const shaped = teamMembers.map((m) => {
            const seen = new Set<string>();
            const regions: Array<{ id: string; name: string; code?: string | null; isActive: boolean; isPrimary: boolean }> = [];
            if (m.region) {
                seen.add(m.region.id);
                regions.push({ ...m.region, isPrimary: true });
            }
            for (const ur of m.userRegions) {
                if (!ur.region || seen.has(ur.region.id)) continue;
                seen.add(ur.region.id);
                regions.push({ ...ur.region, isPrimary: false });
            }
            return { ...m, regions };
        });

        return NextResponse.json(shaped);

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
        // Accept either `regionIds: string[]` (multi-branch, first = primary) or
        // legacy `regionId: string` (single branch). Empty / missing => error.
        const rawRegionIds: unknown = Array.isArray(body.regionIds)
            ? body.regionIds
            : (body.regionId ? [body.regionId] : []);
        const regionIds = Array.from(
            new Set(
                (rawRegionIds as unknown[])
                    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
            )
        );

        if (!firstName || !lastName || !email || !phone || !cnic || !password) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (regionIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one branch must be assigned to every admin.' },
                { status: 400 }
            );
        }

        const regions = await prisma.region.findMany({
            where: { id: { in: regionIds } },
            select: { id: true, isActive: true },
        });
        if (regions.length !== regionIds.length) {
            return NextResponse.json(
                { error: 'One or more selected branches were not found.' },
                { status: 400 }
            );
        }
        const inactive = regions.find((r) => !r.isActive);
        if (inactive) {
            return NextResponse.json(
                { error: 'One or more selected branches are inactive.' },
                { status: 400 }
            );
        }
        const primaryRegionId = regionIds[0];

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

        const newUser = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    name: fullName,
                    firstName,
                    lastName,
                    email,
                    phone,
                    cnic,
                    password: hashedPassword,
                    role: 'ADMIN',
                    isActive: true,
                    regionId: primaryRegionId,
                },
            });
            // Mirror EVERY assigned region (including the primary) into the
            // join table so the accessible-region union has a single source
            // of truth and additional branches are persisted.
            if (regionIds.length > 0) {
                await tx.userRegion.createMany({
                    data: regionIds.map((rid) => ({ userId: created.id, regionId: rid })),
                    skipDuplicates: true,
                });
            }
            return created;
        });

        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: 'CREATED_ADMIN',
                entityType: 'User',
                entityId: newUser.id,
                details: `Created admin account for ${fullName} (${email}) with ${regionIds.length} branch${regionIds.length === 1 ? '' : 'es'}`,
                metadata: { regionIds, primaryRegionId },
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
