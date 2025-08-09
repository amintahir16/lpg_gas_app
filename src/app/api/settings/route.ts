import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get company information from the first vendor (as a proxy for company settings)
    const companyVendor = await prisma.vendor.findFirst({
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get some basic statistics to inform settings
    const totalCustomers = await prisma.customer.count();
    const totalVendors = await prisma.vendor.count();
    const totalCylinders = await prisma.cylinder.count();

    // Create settings based on actual data and environment
    const settings = {
      companyName: companyVendor?.companyName || "LPG Gas Supply Co.",
      contactEmail: process.env.ADMIN_EMAIL || "admin@lpg.com",
      contactPhone: process.env.ADMIN_PHONE || "+1 (555) 123-4567",
      address: companyVendor?.address || "123 Gas Street, Industrial District, City, State 12345",
      businessHours: process.env.BUSINESS_HOURS || "Monday - Friday: 8AM - 6PM, Saturday: 9AM - 2PM",
      deliveryRadius: parseInt(process.env.DELIVERY_RADIUS || "50"),
      defaultCreditLimit: parseInt(process.env.DEFAULT_CREDIT_LIMIT || "1000"),
      taxRate: parseFloat(process.env.TAX_RATE || "8.5"),
      currency: process.env.CURRENCY || "USD",
      timezone: process.env.TIMEZONE || "America/New_York",
      maintenanceInterval: parseInt(process.env.MAINTENANCE_INTERVAL || "90"),
      safetyInspectionInterval: parseInt(process.env.SAFETY_INSPECTION_INTERVAL || "180"),
      // Add some dynamic settings based on actual data
      totalCustomers,
      totalVendors,
      totalCylinders
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // In a real implementation, you would save these settings to a database table
    // For now, we'll just log the settings and return success
    console.log('Updating system settings:', body);

    // You could also update environment variables or save to a settings table
    // For now, we'll just return the updated settings
    return NextResponse.json({
      message: 'Settings updated successfully (Note: In production, these would be saved to database)',
      settings: body
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 