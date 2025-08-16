import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      },
      include: {
        bankDetails: {
          where: {
            isActive: true
          }
        }
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
      bankDetails: vendor.bankDetails.length > 0 ? {
        accountName: vendor.bankDetails[0].accountName,
        accountNumber: vendor.bankDetails[0].accountNumber,
        bankName: vendor.bankDetails[0].bankName,
        swiftCode: vendor.bankDetails[0].swiftCode || "N/A",
        routingNumber: vendor.bankDetails[0].routingNumber || "N/A"
      } : {
        accountName: vendor.companyName,
        accountNumber: "Not provided",
        bankName: "Not provided",
        swiftCode: "N/A",
        routingNumber: "N/A"
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
    
    // Get the vendor ID
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update the vendor data in the database
    const updatedVendor = await prisma.vendor.update({
      where: {
        id: vendor.id
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

    // Update or create bank details
    if (body.bankDetails) {
      const existingBankDetails = await prisma.vendorBankDetails.findFirst({
        where: {
          vendorId: vendor.id,
          isActive: true
        }
      });

      if (existingBankDetails) {
        await prisma.vendorBankDetails.update({
          where: {
            id: existingBankDetails.id
          },
          data: {
            accountName: body.bankDetails.accountName,
            accountNumber: body.bankDetails.accountNumber,
            bankName: body.bankDetails.bankName,
            swiftCode: body.bankDetails.swiftCode,
            routingNumber: body.bankDetails.routingNumber,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.vendorBankDetails.create({
          data: {
            vendorId: vendor.id,
            accountName: body.bankDetails.accountName,
            accountNumber: body.bankDetails.accountNumber,
            bankName: body.bankDetails.bankName,
            swiftCode: body.bankDetails.swiftCode,
            routingNumber: body.bankDetails.routingNumber
          }
        });
      }
    }

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
        paymentTerms: `${updatedVendor.paymentTerms} days`
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