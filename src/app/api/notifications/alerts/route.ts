import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = [];

    // High outstanding balance alert
    const highOutstandingCustomers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ledgerBalance: { gt: 100000 } // Configurable threshold
      },
      select: {
        id: true,
        name: true,
        ledgerBalance: true,
        contactPerson: true,
        phone: true,
        email: true
      }
    });

    highOutstandingCustomers.forEach(customer => {
      alerts.push({
        type: 'HIGH_OUTSTANDING',
        priority: 'HIGH',
        title: 'High Outstanding Balance',
        message: `Customer ${customer.name} has outstanding balance of ${customer.ledgerBalance.toNumber().toLocaleString()} PKR`,
        customerId: customer.id,
        customerName: customer.name,
        amount: customer.ledgerBalance.toNumber(),
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        createdAt: new Date()
      });
    });

    // Low stock alert
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lt: prisma.product.fields.lowStockThreshold }
      },
      select: {
        id: true,
        name: true,
        category: true,
        stockQuantity: true,
        lowStockThreshold: true
      }
    });

    lowStockProducts.forEach(product => {
      alerts.push({
        type: 'LOW_STOCK',
        priority: 'MEDIUM',
        title: 'Low Stock Alert',
        message: `Product ${product.name} is low on stock. Current: ${product.stockQuantity}, Threshold: ${product.lowStockThreshold}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        currentStock: product.stockQuantity.toNumber(),
        threshold: product.lowStockThreshold,
        createdAt: new Date()
      });
    });

    // Overdue customers (based on payment terms)
    const overdueCustomers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ledgerBalance: { gt: 0 }
      },
      include: {
        transactions: {
          where: {
            transactionType: 'SALE',
            voided: false
          },
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const today = new Date();
    overdueCustomers.forEach(customer => {
      const lastSale = customer.transactions[0];
      if (lastSale) {
        const daysSinceLastSale = Math.floor(
          (today.getTime() - new Date(lastSale.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastSale > customer.paymentTermsDays) {
          alerts.push({
            type: 'OVERDUE',
            priority: 'HIGH',
            title: 'Overdue Customer',
            message: `Customer ${customer.name} is overdue by ${daysSinceLastSale - customer.paymentTermsDays} days`,
            customerId: customer.id,
            customerName: customer.name,
            overdueDays: daysSinceLastSale - customer.paymentTermsDays,
            ledgerBalance: customer.ledgerBalance.toNumber(),
            paymentTermsDays: customer.paymentTermsDays,
            lastTransactionDate: lastSale.date,
            createdAt: new Date()
          });
        }
      }
    });

    // Sort alerts by priority and date
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    alerts.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.priority === 'HIGH').length,
        medium: alerts.filter(a => a.priority === 'MEDIUM').length,
        low: alerts.filter(a => a.priority === 'LOW').length
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
