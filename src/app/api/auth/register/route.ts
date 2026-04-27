import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimitResponse } from '@/lib/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

/**
 * Account self-registration is intentionally disabled.
 *
 * Originally this endpoint accepted a `userType` from the request body and
 * minted ADMIN / VENDOR accounts on demand, which was a privilege-escalation
 * sink for any unauthenticated caller. The application only ever creates
 * privileged users via the SUPER_ADMIN team management UI
 * (`/api/admin/team`), so we lock this endpoint down to SUPER_ADMIN and
 * always create regular USER accounts — never admin/vendor — regardless of
 * what the client sends. The role field is ignored.
 */
export async function POST(req: NextRequest) {
  try {
    // Even though this is gated to SUPER_ADMIN, rate-limit by IP to slow down
    // anyone probing the endpoint (e.g. with stolen session cookies or trying
    // to enumerate behavior via 401 timing).
    const limited = rateLimitResponse(req, {
      name: 'auth:register',
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { firstName, lastName, email, password, phone, companyName } = data;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Always USER. Privileged roles are only assignable through the
    // SUPER_ADMIN team management UI.
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: 'USER',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
