import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { firstName, lastName, email, password, phone, companyName, userType } = data;
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: userType === 'admin' ? 'ADMIN' : 'USER',
      },
    });
    // Optionally, create Customer or Vendor profile
    if (userType === 'customer') {
      await prisma.customer.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          code: `CUST${Date.now()}`,
          customerType: 'RESIDENTIAL',
          userId: user.id,
        },
      });
    } else if (userType === 'vendor') {
      await prisma.vendor.create({
        data: {
          companyName: companyName || `${firstName} ${lastName}`,
          contactPerson: `${firstName} ${lastName}`,
          email,
          phone,
          vendorCode: `VEND${Date.now()}`,
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}