import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { firstName, lastName, email, password, phone, companyName, userType } = data;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine user role
    let role = 'USER';
    if (userType === 'admin') {
      role = 'ADMIN';
    } else if (userType === 'vendor') {
      role = 'VENDOR';
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: role as any,
      },
    });

    // Create associated profiles based on user type
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

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: error.message || 'Registration failed' 
    }, { status: 500 });
  }
}