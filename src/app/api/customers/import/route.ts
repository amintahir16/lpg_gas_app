import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { parseCsv, validateCsvFile } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.session.user.id;

    const regionId = getActiveRegionId(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const validation = validateCsvFile(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const csvText = await file!.text();

    let parsed;
    try {
      parsed = parseCsv(csvText);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid CSV' },
        { status: 400 }
      );
    }

    const { headers, rows } = parsed;
    if (rows.length < 1) {
      return NextResponse.json(
        { error: 'CSV file must have a header row and at least one data row' },
        { status: 400 }
      );
    }

    const requiredHeaders = [
      'name',
      'contact_person',
      'phone',
      'email',
      'address',
      'credit_limit',
      'payment_terms_days',
    ];

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    const idx = (key: string) => headers.indexOf(key);
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      // Row numbering for human-readable errors: 1-based, accounting for header.
      const lineNumber = i + 2;
      try {
        if (values.every((v) => v === '')) continue;

        const customerData = {
          name: values[idx('name')] || '',
          contactPerson: values[idx('contact_person')] || '',
          phone: values[idx('phone')] || '',
          email: values[idx('email')] || null,
          address: values[idx('address')] || null,
          creditLimit: parseFloat(values[idx('credit_limit')] || '0') || 0,
          paymentTermsDays: parseInt(values[idx('payment_terms_days')] || '30', 10) || 30,
          createdBy: userId,
        };

        if (!customerData.name || !customerData.contactPerson || !customerData.phone) {
          results.failed++;
          results.errors.push(
            `Row ${lineNumber}: Missing required fields (name, contact_person, phone)`
          );
          continue;
        }

        const existingCustomer = await prisma.customer.findFirst({
          where: { phone: customerData.phone, ...regionScopedWhere(regionId) },
        });

        if (existingCustomer) {
          results.failed++;
          results.errors.push(
            `Row ${lineNumber}: Customer with phone ${customerData.phone} already exists in this branch`
          );
          continue;
        }

        await prisma.customer.create({
          data: withRegionScope(customerData, regionId),
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.successful} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    );
  }
}
