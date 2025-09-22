import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeTransactions = searchParams.get('includeTransactions') === 'true';

    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      include: includeTransactions ? {
        transactions: {
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

      const csvLines = [headers.join(',')];

      customers.forEach(customer => {
        const row = [
          customer.id,
          `"${customer.name}"`,
          `"${customer.contactPerson}"`,
          customer.phone,
          customer.email || '',
          `"${customer.address || ''}"`,
          customer.creditLimit?.toString() || '0',
          customer.paymentTermsDays.toString(),
          customer.ledgerBalance.toString(),
          customer.domestic118kgDue.toString(),
          customer.standard15kgDue.toString(),
          customer.commercial454kgDue.toString(),
          `"${customer.notes || ''}"`,
          customer.createdAt.toISOString().split('T')[0]
        ];

        if (includeTransactions) {
          const totalTransactions = customer.transactions?.length || 0;
          const lastTransactionDate = customer.transactions?.[0]?.date?.toISOString().split('T')[0] || '';
          const totalSalesAmount = customer.transactions
            ?.filter(t => t.transactionType === 'SALE')
            .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0) || 0;

          row.push(
            totalTransactions.toString(),
            lastTransactionDate,
            totalSalesAmount.toString()
          );
        }

        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');

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
        transactions: includeTransactions ? customer.transactions?.map(t => ({
          id: t.id,
          billSno: t.billSno,
          transactionType: t.transactionType,
          date: t.date,
          totalAmount: t.totalAmount.toNumber(),
          paymentReference: t.paymentReference,
          notes: t.notes,
          items: t.items?.map(item => ({
            productName: item.productName,
            quantity: item.quantity.toNumber(),
            pricePerItem: item.pricePerItem.toNumber(),
            totalPrice: item.totalPrice.toNumber(),
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
