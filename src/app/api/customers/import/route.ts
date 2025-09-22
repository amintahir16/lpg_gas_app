import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have header and at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['name', 'contact_person', 'phone', 'email', 'address', 'credit_limit', 'payment_terms_days'];
    
    // Validate headers
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const customerData = {
          name: values[headers.indexOf('name')],
          contactPerson: values[headers.indexOf('contact_person')],
          phone: values[headers.indexOf('phone')],
          email: values[headers.indexOf('email')] || null,
          address: values[headers.indexOf('address')] || null,
          creditLimit: parseFloat(values[headers.indexOf('credit_limit')]) || 0,
          paymentTermsDays: parseInt(values[headers.indexOf('payment_terms_days')]) || 30,
          createdBy: userId
        };

        // Validate required fields
        if (!customerData.name || !customerData.contactPerson || !customerData.phone) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields (name, contact_person, phone)`);
          continue;
        }

        // Check for duplicate phone numbers
        const existingCustomer = await prisma.customer.findFirst({
          where: { phone: customerData.phone }
        });

        if (existingCustomer) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Customer with phone ${customerData.phone} already exists`);
          continue;
        }

        await prisma.customer.create({
          data: customerData
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.successful} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    );
  }
}
