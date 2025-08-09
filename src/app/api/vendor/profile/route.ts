import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    // Fetch the vendor data from the database
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Vendor profile not found' },
        { status: 404 }
      );
    }

    // Transform the vendor data to match the expected format
    const vendorProfile = {
      id: vendor.id,
      name: vendor.companyName,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      companyName: vendor.companyName,
      registrationNumber: vendor.vendorCode,
      taxId: vendor.taxId,
      contactPerson: vendor.contactPerson,
      paymentTerms: `${vendor.paymentTerms} days`,
      bankDetails: {
        accountName: vendor.companyName,
        accountNumber: "1234567890", // This would need a separate bank details table
        bankName: "First National Bank",
        swiftCode: "FNBNUS33"
      }
    };

    return NextResponse.json(vendorProfile);
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Update the vendor data in the database
    const updatedVendor = await prisma.vendor.update({
      where: {
        email: session.user.email
      },
      data: {
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        address: body.address,
        taxId: body.taxId,
        paymentTerms: parseInt(body.paymentTerms.replace(' days', '')),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        id: updatedVendor.id,
        name: updatedVendor.companyName,
        email: updatedVendor.email,
        phone: updatedVendor.phone,
        address: updatedVendor.address,
        companyName: updatedVendor.companyName,
        registrationNumber: updatedVendor.vendorCode,
        taxId: updatedVendor.taxId,
        contactPerson: updatedVendor.contactPerson,
        paymentTerms: `${updatedVendor.paymentTerms} days`,
        bankDetails: {
          accountName: updatedVendor.companyName,
          accountNumber: "1234567890",
          bankName: "First National Bank",
          swiftCode: "FNBNUS33"
        }
      }
    });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 