import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format currency with Rs and rounded to whole numbers (for columns)
function formatCurrencyRsRounded(amount: number): string {
  const rounded = Math.round(amount);
  return `Rs ${rounded.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper function to format date
function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Helper function to get cylinder type display name - uses database mapping with fallback
function getCylinderTypeDisplay(type: string, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>): string {
  if (!type) return 'N/A';

  // If we have a type map with proper typeName, use it
  if (cylinderTypeMap && cylinderTypeMap.has(type)) {
    const cylinderInfo = cylinderTypeMap.get(type)!;
    if (cylinderInfo.typeName && cylinderInfo.typeName.trim() !== '' && cylinderInfo.typeName.trim() !== 'Cylinder') {
      const capacity = cylinderInfo.capacity !== null ? cylinderInfo.capacity : 'N/A';
      return `${cylinderInfo.typeName} (${capacity}kg)`;
    } else if (cylinderInfo.capacity !== null) {
      return `Cylinder (${cylinderInfo.capacity}kg)`;
    }
  }

  // Fallback to dynamic utility function
  return getCylinderTypeDisplayName(type);
}

// Get transaction type display text
function getTransactionTypeText(transaction: any): string {
  const types: string[] = [];

  if (transaction.gasItems?.length > 0 || transaction.accessoryItems?.length > 0) {
    types.push('Sale');
  }

  const hasDeposit = transaction.securityItems?.some((i: any) => !i.isReturn);
  const hasReturn = transaction.securityItems?.some((i: any) => i.isReturn);

  if (hasDeposit) types.push('Deposit');
  if (hasReturn) types.push('Return');

  if (types.length === 0) return 'Transaction';

  return types.join(' + ');
}

// Build items description
function buildItemsDescription(transaction: any, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>): string {
  const parts: string[] = [];

  // Sale items (Gas + Accessories)
  const saleItems = [...(transaction.gasItems || []), ...(transaction.accessoryItems || [])];
  if (saleItems.length > 0) {
    const descriptions = saleItems.map((item: any) => {
      if (item.cylinderType) {
        return `${getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap)} x${item.quantity}`;
      } else {
        return `${item.productName} x${item.quantity}`;
      }
    });
    parts.push(`Sold: ${descriptions.join(', ')}`);
  }

  // Deposit items
  const depositItems = transaction.securityItems?.filter((i: any) => !i.isReturn) || [];
  if (depositItems.length > 0) {
    const descriptions = depositItems.map((item: any) => {
      const price = Number(item.totalPrice);
      return `${getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap)} x${item.quantity} (${formatCurrencyRsRounded(price)})`;
    });
    parts.push(`Deposit: ${descriptions.join(', ')}`);
  }

  // Return items
  const returnItems = transaction.securityItems?.filter((i: any) => i.isReturn) || [];
  if (returnItems.length > 0) {
    const descriptions = returnItems.map((item: any) => {
      const price = Number(item.totalPrice);
      return `${getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap)} x${item.quantity} (${formatCurrencyRsRounded(price)})`;
    });
    parts.push(`Returned: ${descriptions.join(', ')}`);
  }

  return parts.join(' | ') || '-';
}

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(
  customer: any,
  transactions: any[],
  startDate: string | null,
  endDate: string | null,
  cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>
) {
  // Import jsPDF and jspdf-autotable
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');

  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Professional Header with Company Branding
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company Logo Area
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 18, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(41, 128, 185);
  doc.setFont('helvetica', 'bold');
  doc.text('Flamora', 25, 20, { align: 'center' });

  // Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('B2C TRANSACTION REPORT', pageWidth / 2, 22, { align: 'center' });

  // Report Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${customer.name}`, pageWidth / 2, 30, { align: 'center' });

  if (startDate && endDate) {
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 35, { align: 'center' });
  } else if (startDate) {
    doc.text(`Period: From ${formatDate(startDate)}`, pageWidth / 2, 35, { align: 'center' });
  } else if (endDate) {
    doc.text(`Period: Up to ${formatDate(endDate)}`, pageWidth / 2, 35, { align: 'center' });
  } else {
    doc.text(`Period: All Time`, pageWidth / 2, 35, { align: 'center' });
  }

  // Reset colors
  doc.setTextColor(0, 0, 0);

  // Report Info Box
  doc.setFillColor(248, 249, 250);
  doc.rect(15, 45, pageWidth - 30, 25, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, 45, pageWidth - 30, 25, 'S');

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 20, 55);

  doc.text(`Report ID: RPT-${Date.now().toString().slice(-6)}`, 20, 60);
  doc.text(`Total Transactions: ${transactions.length}`, pageWidth - 25, 55, { align: 'right' });

  // Customer Information Section
  let yPosition = 80;
  doc.setFillColor(52, 73, 94);
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 20, yPosition + 6);

  yPosition += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name}`, 20, yPosition);
  doc.text(`Phone: ${customer.phone}`, 20, yPosition + 7);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 20, yPosition + 14);
    yPosition += 7;
  }
  if (customer.address) {
    doc.text(`Address: ${customer.address}${customer.city ? `, ${customer.city}` : ''}`, 20, yPosition + (customer.email ? 14 : 7));
  }

  yPosition += (customer.email ? 25 : 18);

  // Transaction History Section
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(52, 73, 94);
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION HISTORY', 20, yPosition + 6);

  yPosition += 15;

  // Prepare table data
  const tableData = transactions.map((transaction, index) => {
    const date = formatDate(transaction.date);
    const time = new Date(transaction.time).toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build items description
    const itemsText = buildItemsDescription(transaction, cylinderTypeMap);
    const typeText = getTransactionTypeText(transaction);
    const finalAmount = Number(transaction.finalAmount);

    return [
      index + 1,
      date,
      time,
      transaction.billSno,
      typeText,
      itemsText,
      formatCurrencyRsRounded(finalAmount)
    ];
  });

  // Add total row
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.finalAmount), 0);
  tableData.push([
    '',
    '',
    '',
    '',
    '',
    'TOTAL:',
    formatCurrencyRsRounded(totalAmount)
  ]);

  // Add table - use autoTable as a function
  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Bill No.', 'Type', 'Details', 'Amount']],
    body: tableData,
    startY: yPosition,
    tableWidth: pageWidth - 30,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },    // #
      1: { cellWidth: 20 },                       // Date
      2: { cellWidth: 15 },                       // Time
      3: { cellWidth: 25 },                       // Bill No.
      4: { cellWidth: 25 },                       // Type
      5: { cellWidth: 60 },                       // Details
      6: { halign: 'right', cellWidth: 25 }       // Amount
    },
    margin: { left: 15, right: 15 }
  });

  // Financial Summary Section
  const finalY = (doc as any).lastAutoTable?.finalY || yPosition;

  if (finalY > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition = finalY + 15;
  }

  // Summary Header
  doc.setFillColor(155, 89, 182);
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 20, yPosition + 6);

  yPosition += 20;

  // Summary Box
  doc.setFillColor(248, 249, 250);
  doc.rect(15, yPosition, pageWidth - 30, 50, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, yPosition, pageWidth - 30, 50, 'S');

  // Date Range Info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateRangeText = startDate && endDate
    ? `Summary for Period: ${formatDate(startDate)} - ${formatDate(endDate)}`
    : 'Summary for All Time';
  doc.text(dateRangeText, 25, yPosition + 10);

  // Summary Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  // Total Transactions
  doc.text('Total Transactions:', 25, yPosition + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`${transactions.length}`, pageWidth - 25, yPosition + 22, { align: 'right' });

  // Total Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total Amount:', 25, yPosition + 35);
  doc.setTextColor(39, 174, 96);
  doc.text(formatCurrency(totalAmount), pageWidth - 25, yPosition + 35, { align: 'right' });

  // Footer Loop
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 25; // Moved up to fit more lines
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');

    // Line 1
    doc.text('This report was generated automatically by Flamora Gas Management System', pageWidth / 2, footerY, { align: 'center' });

    // Line 2
    doc.text(`Page ${i} of ${pageCount} | Confidential Document`, pageWidth / 2, footerY + 5, { align: 'center' });

    // Developer Credits
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Software by AMIN TAHIR', pageWidth / 2, footerY + 12, { align: 'center' });
    doc.text('Contact No: 03339109535', pageWidth / 2, footerY + 16, { align: 'center' });
  }

  return doc;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch customer
    const customer = await prisma.b2CCustomer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        phone: true,
        email: true,
        address: true,
        city: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Build date filter
    const transactionWhere: any = {};
    if (startDate || endDate) {
      transactionWhere.date = {};
      if (startDate) {
        transactionWhere.date.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        transactionWhere.date.lte = endDateObj;
      }
    }

    // Fetch transactions
    const transactions = await prisma.b2CTransaction.findMany({
      where: {
        customerId,
        voided: false,
        ...transactionWhere
      },
      include: {
        gasItems: true,
        securityItems: true,
        accessoryItems: true
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    });

    // Build cylinder type mapping for proper display names
    const uniqueCylinderTypes = new Set<string>();
    transactions.forEach(tx => {
      tx.gasItems?.forEach((item: any) => {
        if (item.cylinderType) uniqueCylinderTypes.add(item.cylinderType);
      });
      tx.securityItems?.forEach((item: any) => {
        if (item.cylinderType) uniqueCylinderTypes.add(item.cylinderType);
      });
    });

    const cylinderTypeMap = new Map<string, { typeName: string | null, capacity: number | null }>();

    if (uniqueCylinderTypes.size > 0) {
      // Query cylinders
      const cylinders = await prisma.cylinder.findMany({
        where: {
          cylinderType: { in: Array.from(uniqueCylinderTypes) }
        },
        select: {
          cylinderType: true,
          typeName: true,
          capacity: true
        }
      });

      // Build map
      cylinders.forEach(cylinder => {
        if (!cylinderTypeMap.has(cylinder.cylinderType)) {
          cylinderTypeMap.set(cylinder.cylinderType, {
            typeName: cylinder.typeName,
            capacity: cylinder.capacity ? Number(cylinder.capacity) : null
          });
        }
      });

      // Fill missing types with null
      uniqueCylinderTypes.forEach(type => {
        if (!cylinderTypeMap.has(type)) {
          cylinderTypeMap.set(type, { typeName: null, capacity: null });
        }
      });
    }

    // Generate PDF
    const doc = await generatePDF(customer, transactions, startDate, endDate, cylinderTypeMap);

    // Generate PDF buffer
    const pdfBlob = doc.output('blob');
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="B2C-Transaction-Report-${customer.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating B2C transaction report:', error);
    return NextResponse.json(
      { error: 'Failed to generate transaction report' },
      { status: 500 }
    );
  }
}
