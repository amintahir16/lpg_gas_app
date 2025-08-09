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

    // Get system settings from the database
    const systemSettings = await prisma.systemSettings.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        category: 'asc'
      }
    });

    // Get some basic statistics to inform settings
    const totalCustomers = await prisma.customer.count();
    const totalVendors = await prisma.vendor.count();
    const totalCylinders = await prisma.cylinder.count();

    // Transform settings into a more usable format
    const settingsMap = systemSettings.reduce((acc: Record<string, string>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Create settings object with defaults and database values
    const settings = {
      companyName: settingsMap.companyName || "LPG Gas Supply Co.",
      contactEmail: settingsMap.contactEmail || process.env.ADMIN_EMAIL || "admin@lpg.com",
      contactPhone: settingsMap.contactPhone || process.env.ADMIN_PHONE || "+1 (555) 123-4567",
      address: settingsMap.address || "123 Gas Street, Industrial District, City, State 12345",
      businessHours: settingsMap.businessHours || process.env.BUSINESS_HOURS || "Monday - Friday: 8AM - 6PM, Saturday: 9AM - 2PM",
      deliveryRadius: parseInt(settingsMap.deliveryRadius || process.env.DELIVERY_RADIUS || "50"),
      defaultCreditLimit: parseInt(settingsMap.defaultCreditLimit || process.env.DEFAULT_CREDIT_LIMIT || "1000"),
      taxRate: parseFloat(settingsMap.taxRate || process.env.TAX_RATE || "8.5"),
      currency: settingsMap.currency || process.env.CURRENCY || "USD",
      timezone: settingsMap.timezone || process.env.TIMEZONE || "America/New_York",
      maintenanceInterval: parseInt(settingsMap.maintenanceInterval || process.env.MAINTENANCE_INTERVAL || "90"),
      safetyInspectionInterval: parseInt(settingsMap.safetyInspectionInterval || process.env.SAFETY_INSPECTION_INTERVAL || "180"),
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
    
    // Update or create system settings
    const settingsToUpdate = [
      { key: 'companyName', value: body.companyName },
      { key: 'contactEmail', value: body.contactEmail },
      { key: 'contactPhone', value: body.contactPhone },
      { key: 'address', value: body.address },
      { key: 'businessHours', value: body.businessHours },
      { key: 'deliveryRadius', value: body.deliveryRadius?.toString() },
      { key: 'defaultCreditLimit', value: body.defaultCreditLimit?.toString() },
      { key: 'taxRate', value: body.taxRate?.toString() },
      { key: 'currency', value: body.currency },
      { key: 'timezone', value: body.timezone },
      { key: 'maintenanceInterval', value: body.maintenanceInterval?.toString() },
      { key: 'safetyInspectionInterval', value: body.safetyInspectionInterval?.toString() }
    ];

    // Update each setting
    for (const setting of settingsToUpdate) {
      if (setting.value !== undefined) {
        await prisma.systemSettings.upsert({
          where: {
            key: setting.key
          },
          update: {
            value: setting.value,
            updatedAt: new Date()
          },
          create: {
            key: setting.key,
            value: setting.value,
            category: 'GENERAL',
            description: `System setting for ${setting.key}`
          }
        });
      }
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
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