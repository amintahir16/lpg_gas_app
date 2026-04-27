import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { toCsvRow } from '@/lib/csv';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeTransactions = searchParams.get('includeTransactions') === 'true';

    const customers = await prisma.customer.findMany({
      where: { isActive: true, ...regionScopedWhere(regionId) },
      include: includeTransactions ? {
        b2bTransactions: {
          where: { voided: false },
          include: { items: true },
          orderBy: { date: 'desc' }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Customer ID',
        'Name',
        'Contact Person',
        'Phone',
        'Email',
        'Address',
        'Credit Limit',
        'Payment Terms (Days)',
        'Account Receivables',
        'Domestic 11.8kg Due',
        'Standard 15kg Due',
        'Commercial 45.4kg Due',
        'Notes',
        'Created At'
      ];

      if (includeTransactions) {
        headers.push('Total Transactions', 'Last Transaction Date', 'Total Sales Amount');
      }

      // toCsvRow handles both standard RFC-4180 escaping AND CSV formula
      // injection — fields starting with =,+,-,@ are prefixed with a single
      // quote so Excel/Sheets render them as plain text instead of executing.
      const csvLines: string[] = [toCsvRow(headers)];

      customers.forEach(customer => {
        const row: unknown[] = [
          customer.id,
          customer.name,
          customer.contactPerson,
          customer.phone,
          customer.email || '',
          customer.address || '',
          customer.creditLimit?.toString() || '0',
          customer.paymentTermsDays.toString(),
          customer.ledgerBalance.toString(),
          customer.domestic118kgDue.toString(),
          customer.standard15kgDue.toString(),
          customer.commercial454kgDue.toString(),
          customer.notes || '',
          customer.createdAt.toISOString().split('T')[0],
        ];

        if (includeTransactions) {
          const txs = (customer as any).b2bTransactions || [];
          const totalTransactions = txs.length;
          const lastTransactionDate = txs[0]?.date?.toISOString().split('T')[0] || '';
          const totalSalesAmount = txs
            .filter((t: any) => t.transactionType === 'SALE')
            .reduce((sum: number, t: any) => sum + Number(t.totalAmount), 0);

          row.push(
            totalTransactions.toString(),
            lastTransactionDate,
            totalSalesAmount.toString()
          );
        }

        csvLines.push(toCsvRow(row));
      });

      const csvContent = csvLines.join('\r\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON format
    return NextResponse.json({
      customers: customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        creditLimit: customer.creditLimit?.toNumber() || 0,
        paymentTermsDays: customer.paymentTermsDays,
        ledgerBalance: customer.ledgerBalance.toNumber(),
        domestic118kgDue: customer.domestic118kgDue,
        standard15kgDue: customer.standard15kgDue,
        commercial454kgDue: customer.commercial454kgDue,
        notes: customer.notes,
        createdAt: customer.createdAt,
        transactions: includeTransactions ? ((customer as any).b2bTransactions || []).map((t: any) => ({
          id: t.id,
          billSno: t.billSno,
          transactionType: t.transactionType,
          date: t.date,
          totalAmount: Number(t.totalAmount),
          paymentReference: t.paymentReference,
          notes: t.notes,
          items: (t.items || []).map((item: any) => ({
            productName: item.productName,
            quantity: Number(item.quantity),
            pricePerItem: Number(item.pricePerItem),
            totalPrice: Number(item.totalPrice),
            cylinderType: item.cylinderType
          }))
        })) : undefined
      })),
      exportDate: new Date().toISOString(),
      totalCustomers: customers.length
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}
