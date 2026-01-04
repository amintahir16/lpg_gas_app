import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format currency with Rs and rounded to whole numbers (for Out, In, Net Balance columns)
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

// Helper function to get cylinder type display name - uses dynamic utility
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

// Categorize items into Sale, Buyback, and Return
function categorizeItems(items: any[]): {
  saleItems: any[];
  buybackItems: any[];
  returnItems: any[];
} {
  const saleItems: any[] = [];
  const buybackItems: any[] = [];
  const returnItems: any[] = [];

  items.forEach(item => {
    const hasRegularPrice = item.pricePerItem && Number(item.pricePerItem) > 0;
    const hasBuybackData = item.remainingKg && Number(item.remainingKg) > 0;
    // Key check: buybackRate being SET (even if 0) indicates this is a buyback item
    const hasBuybackRateSet = item.buybackRate !== null && item.buybackRate !== undefined;

    // BUYBACK items: have buybackRate set (including 0%) - this is the definitive indicator
    // A buyback with 0% rate still has buybackRate = 0, while sales have buybackRate = null
    if (hasBuybackRateSet) {
      buybackItems.push(item);
    }
    // SALE items: have a regular sale price AND no buyback rate set
    else if (hasRegularPrice && !hasBuybackRateSet) {
      saleItems.push(item);
    }
    // Empty returns: cylinder with no sale price and no buyback rate
    else if (item.cylinderType && !hasRegularPrice && !hasBuybackRateSet && !hasBuybackData) {
      returnItems.push(item);
    }
    // Professional Accessories (Vaporizers, etc.) - Catch all non-cylinder items
    // This includes charged items (price > 0) AND free items (price = 0)
    else if (!item.cylinderType) {
      saleItems.push(item);
    }
    // Default to return items for cylinders
    else if (item.cylinderType) {
      returnItems.push(item);
    }
  });

  return { saleItems, buybackItems, returnItems };
}

// Get transaction type display text with unified transaction support
function getTransactionTypeText(transaction: any, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>): string {
  const { saleItems, buybackItems, returnItems } = categorizeItems(transaction.items || []);

  const types: string[] = [];

  if (saleItems.length > 0 && saleItems.some((item: any) => item.pricePerItem && Number(item.pricePerItem) > 0)) {
    if (transaction.paymentStatus === 'FULLY_PAID') {
      types.push('Sale (Paid)');
    } else if (transaction.paymentStatus === 'PARTIAL') {
      types.push('Sale (Partial)');
    } else {
      // Default to Unpaid for explicit UNPAID or null/undefined (legacy/credit)
      types.push('Sale (Unpaid)');
    }
  }

  if (buybackItems.length > 0) {
    types.push('Buyback');
  }

  if (returnItems.length > 0) {
    types.push('Return');
  }

  // If only payment transaction
  if (types.length === 0) {
    if (transaction.transactionType === 'PAYMENT') {
      return 'Payment';
    }
    return transaction.transactionType;
  }

  return types.join(' + ');
}

// Build items description with proper categorization
function buildItemsDescription(transaction: any, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>): string {
  const { saleItems, buybackItems, returnItems } = categorizeItems(transaction.items || []);

  const parts: string[] = [];

  // Sale items
  if (saleItems.length > 0) {
    const saleDescriptions = saleItems.map((item: any) => {
      if (item.cylinderType) {
        return `${getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap)} x${item.quantity || 0}`;
      } else if (item.productName) {
        let name = item.productName;

        // Check if this is a vaporizer
        const isVaporizer = item.category && item.category.toLowerCase().includes('vaporizer');

        if (!isVaporizer) {
          return `${name} x${item.quantity || 0}`;
        }

        // Add details for split pricing (Usage vs Selling)
        const costPrice = item.costPrice ? Number(item.costPrice) : 0;
        const sellingPrice = item.sellingPrice ? Number(item.sellingPrice) : 0;
        const pricePerItem = Number(item.pricePerItem || 0);

        if (pricePerItem > 0) {
          if (costPrice > 0 && sellingPrice === 0) {
            name += ` (Charged: ${formatCurrencyRsRounded(costPrice)})`;
          } else if (costPrice === 0 && sellingPrice > 0) {
            name += ` (Sold: ${formatCurrencyRsRounded(sellingPrice)})`;
          } else if (costPrice > 0 && sellingPrice > 0) {
            name += ` (Charged: ${formatCurrencyRsRounded(costPrice)}, Sold: ${formatCurrencyRsRounded(sellingPrice)})`;
          }
        } else {
          // Free item
          name += ' (Not Charged)';
        }

        return `${name} x${item.quantity || 0}`;
      }
      return '';
    }).filter(Boolean);

    if (saleDescriptions.length > 0) {
      parts.push(`Sold: ${saleDescriptions.join(', ')}`);
    }
  }

  // Buyback items
  if (buybackItems.length > 0) {
    const buybackDescriptions = buybackItems.map((item: any) => {
      const name = item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : 'Item';
      const details: string[] = [];
      if (item.remainingKg && Number(item.remainingKg) > 0) {
        details.push(`${Number(item.remainingKg).toFixed(1)}kg`);
      }
      if (item.buybackRate) {
        details.push(`${(Number(item.buybackRate) * 100).toFixed(0)}%`);
      }
      const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      return `${name} x${item.quantity || 0}${detailsStr}`;
    });

    parts.push(`Buyback: ${buybackDescriptions.join(', ')}`);
  }

  // Return items
  if (returnItems.length > 0) {
    const returnDescriptions = returnItems.map((item: any) => {
      const name = item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : 'Item';
      return `${name} x${item.quantity || 0}`;
    });

    parts.push(`Returned: ${returnDescriptions.join(', ')}`);
  }

  // Payment only transaction
  if (parts.length === 0 && transaction.transactionType === 'PAYMENT') {
    return 'Payment Received';
  }

  return parts.join(' | ') || '-';
}

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(
  customer: any,
  transactions: any[],
  startDate: string | null,
  endDate: string | null,
  cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>,
  cylinderStats?: Map<string, { delivered: number, returned: number, buyback: number, held: number }>
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

  // Company Logo Area (placeholder)
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
  doc.text('B2B TRANSACTION REPORT', pageWidth / 2, 22, { align: 'center' });

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
  doc.text(`Contact Person: ${customer.contactPerson}`, 20, yPosition + 7);
  doc.text(`Phone: ${customer.phone}`, 20, yPosition + 14);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 20, yPosition + 21);
    yPosition += 7;
  }
  if (customer.address) {
    doc.text(`Address: ${customer.address}`, 20, yPosition + (customer.email ? 21 : 14));
    yPosition += 7;
  }

  yPosition += (customer.email && customer.address ? 28 : customer.email || customer.address ? 21 : 14);

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

  yPosition += 10;

  // Prepare table data - sort by date descending (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) {
      return dateB - dateA; // Descending order (newest first)
    }
    // If dates are equal, sort by time descending
    const timeA = new Date(a.createdAt || a.date).getTime();
    const timeB = new Date(b.createdAt || b.date).getTime();
    return timeB - timeA;
  });

  const tableData = sortedTransactions.map((transaction, index) => {
    const date = formatDate(transaction.date);
    const time = transaction.time ? new Date(transaction.time).toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';

    // Build items description with categorization
    const itemsText = buildItemsDescription(transaction, cylinderTypeMap);

    const totalAmount = Number(transaction.totalAmount);

    // Categorize items for proper debit/credit calculation
    const { saleItems, buybackItems } = categorizeItems(transaction.items || []);

    // Calculate debit (Out) and credit (In)
    let debit = '';
    let credit = '';

    if (transaction.transactionType === 'SALE') {
      // Calculate actual sale amount from sale items
      const saleTotal = saleItems.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0);

      // Calculate buyback credit
      const buybackCredit = buybackItems.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0);

      // Net Transaction Amount = Sale Total - Buyback Credit (shown in Debit)
      const netTransactionAmount = saleTotal - buybackCredit;

      if (netTransactionAmount > 0) {
        debit = formatCurrencyRsRounded(netTransactionAmount);
      } else if (saleTotal > 0) {
        // Fallback to sale total if no buyback
        debit = formatCurrencyRsRounded(saleTotal);
      } else {
        // Fallback to totalAmount if no items breakdown
        debit = formatCurrencyRsRounded(totalAmount);
      }

      // Credit shows only paid amount (buyback credit is already deducted from debit)
      const paidAmount = transaction.paidAmount ? Number(transaction.paidAmount) : 0;

      if (paidAmount > 0) {
        credit = formatCurrencyRsRounded(paidAmount);
      }
    } else if (['PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType)) {
      credit = formatCurrencyRsRounded(totalAmount);
    } else if (transaction.transactionType === 'BUYBACK') {
      credit = formatCurrencyRsRounded(totalAmount);
    }

    const netBalance = -(transaction.runningBalance || 0);

    // Get transaction type text with unified support
    const transactionTypeText = getTransactionTypeText(transaction, cylinderTypeMap);

    return [
      index + 1,
      date,
      time,
      transaction.billSno || '-',
      transactionTypeText,
      itemsText,
      debit,
      credit,
      formatCurrencyRsRounded(netBalance)
    ];
  });

  // Add total row - calculate Net Transaction Amounts (Debit) and Paid Amounts (Credit)
  const totalOut = sortedTransactions.reduce((sum, t) => {
    if (t.transactionType === 'SALE') {
      // Calculate Net Transaction Amount = Sale Total - Buyback Credit
      const { saleItems, buybackItems } = categorizeItems(t.items || []);
      const saleTotal = saleItems.reduce((sSum: number, item: any) => sSum + (Number(item.totalPrice) || 0), 0);
      const buybackCredit = buybackItems.reduce((bSum: number, item: any) => bSum + (Number(item.totalPrice) || 0), 0);
      const netTransactionAmount = saleTotal - buybackCredit;

      // If we have sale items, use net amount; otherwise fallback to totalAmount
      return sum + (saleTotal > 0 ? netTransactionAmount : Number(t.totalAmount));
    }
    return sum;
  }, 0);

  const totalIn = sortedTransactions.reduce((sum, t) => {
    // Payment transactions
    if (['PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(t.transactionType)) {
      return sum + Number(t.totalAmount);
    }
    // Pure BUYBACK transactions
    if (t.transactionType === 'BUYBACK') {
      return sum + Number(t.totalAmount);
    }
    // SALE transactions - add only paid amounts (buyback credit is already deducted from debit)
    if (t.transactionType === 'SALE') {
      const paidAmount = t.paidAmount ? Number(t.paidAmount) : 0;
      return sum + paidAmount;
    }
    return sum;
  }, 0);

  tableData.push([
    '',
    '',
    '',
    '',
    'TOTAL:',
    '',
    formatCurrencyRsRounded(totalOut),
    formatCurrencyRsRounded(totalIn),
    ''
  ]);

  // Add table
  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Bill No.', 'Type', 'Details', 'Out (-)', 'In (+)', 'Balance']],
    body: tableData,
    startY: yPosition,
    tableWidth: pageWidth - 30,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },       // #
      1: { cellWidth: 16 },                         // Date
      2: { cellWidth: 12 },                         // Time
      3: { cellWidth: 20 },                         // Bill No.
      4: { cellWidth: 22 },                         // Type
      5: { cellWidth: 52 },                         // Details (wider for categorized items)
      6: { halign: 'right', cellWidth: 16 },        // Out (-)
      7: { halign: 'right', cellWidth: 16 },        // In (+)
      8: { halign: 'right', cellWidth: 18 }         // Balance
    },
    margin: { left: 15, right: 15 }
  });



  // Cylinder History Section
  const historyY = (doc as any).lastAutoTable?.finalY || yPosition;

  if (cylinderStats && cylinderStats.size > 0) {
    if (historyY > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition = historyY + 5;
    }

    // Section Header
    doc.setFillColor(52, 73, 94);
    doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CYLINDER HISTORY', 20, yPosition + 6);

    yPosition += 10;

    // Prepare table data
    const historyData: any[] = [];
    cylinderStats.forEach((stats, type) => {
      if (stats.delivered > 0 || stats.returned > 0 || stats.buyback > 0 || stats.held !== 0) {
        const typeName = getCylinderTypeDisplay(type, cylinderTypeMap);
        historyData.push([
          typeName,
          stats.delivered,
          stats.returned,
          stats.buyback,
          stats.held
        ]);
      }
    });

    if (historyData.length > 0) {
      autoTable(doc, {
        head: [['Type', 'Delivered', 'Returned Empty', 'Bought Back', 'Holding Qty']],
        body: historyData,
        startY: yPosition,
        tableWidth: pageWidth - 30,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [52, 73, 94], // Matching Transaction History Header
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { halign: 'left' },
          4: { fontStyle: 'bold' } // Emphasize Holding Qty
        },
        margin: { left: 15, right: 15 }
      });

      yPosition = (doc as any).lastAutoTable?.finalY + 5;
    }
  } else {
    yPosition = historyY + 5;
  }

  // Financial Summary Section check page break
  // Height of financial summary is ~85 (Header 8 + Gap 12 + Box 65)
  if (yPosition > pageHeight - 85) {
    doc.addPage();
    yPosition = 20;
  }

  // Summary Header
  doc.setFillColor(155, 89, 182);
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 20, yPosition + 6);

  yPosition += 10;

  // Summary Box - Financial
  doc.setFillColor(248, 249, 250);
  doc.rect(15, yPosition, pageWidth - 30, 65, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, yPosition, pageWidth - 30, 65, 'S');


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

  // Total Out (Sales)
  doc.setFont('helvetica', 'bold');
  doc.text('Total Out (-):', 25, yPosition + 32);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(231, 76, 60); // Red color
  doc.text(formatCurrencyRsRounded(totalOut), pageWidth - 25, yPosition + 32, { align: 'right' });

  // Total In (Payments + Buybacks)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total In (+):', 25, yPosition + 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(39, 174, 96); // Green color
  doc.text(formatCurrencyRsRounded(totalIn), pageWidth - 25, yPosition + 42, { align: 'right' });

  // Net Balance
  const netBalance = totalOut - totalIn;
  const displayBalance = netBalance;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Net Balance:', 25, yPosition + 55);
  doc.setTextColor(displayBalance > 0 ? 231 : 39, displayBalance > 0 ? 76 : 174, displayBalance > 0 ? 60 : 96);
  const balanceValueText = displayBalance > 0 ? `-${formatCurrencyRsRounded(displayBalance)}` : formatCurrencyRsRounded(Math.abs(displayBalance));
  doc.text(balanceValueText, pageWidth - 25, yPosition + 55, { align: 'right' });

  // Balance Interpretation
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const balanceStatusText = displayBalance > 0
    ? 'Customer owes you'
    : displayBalance < 0
      ? 'Customer has credit'
      : 'Balance settled';
  doc.text(balanceStatusText, 25, yPosition + 62);

  // Add Footer to All Pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text('This report was generated automatically by Flamora Gas Management System', pageWidth / 2, footerY - 5, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount} | Confidential Document`, pageWidth / 2, footerY, { align: 'center' });
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
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Build date filter
    const transactionWhere: any = { customerId };
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

    // Get ALL transactions first to calculate running balance correctly
    const allTransactions = await prisma.b2BTransaction.findMany({
      where: { customerId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get filtered transactions if date filter is applied
    const filteredTransactions = (startDate || endDate)
      ? await prisma.b2BTransaction.findMany({
        where: transactionWhere,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      : allTransactions;

    // Calculate running balance for all transactions
    let runningBalance = 0;
    const allTransactionsWithBalance = allTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          if (transaction.paymentStatus === 'FULLY_PAID') {
            balanceImpact = 0;
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            balanceImpact = totalAmount;
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
        default:
          balanceImpact = 0;
      }
      runningBalance += balanceImpact;
      return {
        ...transaction,
        runningBalance: runningBalance
      };
    });

    // Calculate starting balance before filtered range
    let startingBalance = 0;
    if (filteredTransactions.length > 0 && (startDate || endDate)) {
      const firstFilteredCreatedAt = filteredTransactions[0].createdAt;
      const transactionsBeforeFilter = allTransactions.filter(t =>
        t.createdAt < firstFilteredCreatedAt
      );

      transactionsBeforeFilter.forEach(transaction => {
        const totalAmount = parseFloat(transaction.totalAmount.toString());
        let balanceImpact = 0;
        switch (transaction.transactionType) {
          case 'SALE':
            if (transaction.paymentStatus === 'FULLY_PAID') {
              balanceImpact = 0;
            } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
              balanceImpact = parseFloat(transaction.unpaidAmount.toString());
            } else {
              balanceImpact = totalAmount;
            }
            break;
          case 'PAYMENT':
          case 'BUYBACK':
          case 'ADJUSTMENT':
          case 'CREDIT_NOTE':
            balanceImpact = -totalAmount;
            break;
          default:
            balanceImpact = 0;
        }
        startingBalance += balanceImpact;
      });
    }

    // Calculate running balances for filtered transactions
    let currentBalance = startingBalance;
    const transactionsWithBalance = filteredTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          if (transaction.paymentStatus === 'FULLY_PAID') {
            balanceImpact = 0;
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            balanceImpact = totalAmount;
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
        default:
          balanceImpact = 0;
      }
      currentBalance += balanceImpact;

      return {
        ...transaction,
        runningBalance: currentBalance
      };
    });

    // Build cylinder type mapping for proper display names
    const uniqueCylinderTypes = new Set<string>();
    // Use allTransactions to ensure we capture types for historical holdings as well
    allTransactions.forEach(transaction => {
      transaction.items?.forEach((item: any) => {
        if (item.cylinderType) {
          uniqueCylinderTypes.add(item.cylinderType);
        }
      });
    });

    const cylinderTypeMap = new Map<string, { typeName: string | null, capacity: number | null }>();

    if (uniqueCylinderTypes.size > 0) {
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

      cylinders.forEach(cylinder => {
        if (!cylinderTypeMap.has(cylinder.cylinderType)) {
          cylinderTypeMap.set(cylinder.cylinderType, {
            typeName: cylinder.typeName,
            capacity: cylinder.capacity ? Number(cylinder.capacity) : null
          });
        }
      });

      uniqueCylinderTypes.forEach(type => {
        if (!cylinderTypeMap.has(type)) {
          cylinderTypeMap.set(type, { typeName: null, capacity: null });
        }
      });
    }

    // Calculate Dynamic Cylinder Statistics
    // Iterate through all transactions UP TO the end date (or all if no end date)
    const cylinderStats = new Map<string, { delivered: number, returned: number, buyback: number, held: number }>();

    const holdingCalculationTransactions = endDate
      ? allTransactions.filter(t => new Date(t.date).getTime() <= new Date(endDate).setHours(23, 59, 59, 999))
      : allTransactions;

    holdingCalculationTransactions.forEach(transaction => {
      const items = transaction.items || [];
      const { saleItems, buybackItems, returnItems } = categorizeItems(items);

      // Sale Items (Deliveries) -> ADD to delivered and held
      saleItems.forEach((item: any) => {
        if (item.cylinderType) {
          const current = cylinderStats.get(item.cylinderType) || { delivered: 0, returned: 0, buyback: 0, held: 0 };
          const qty = item.quantity ? Number(item.quantity) : 0;
          current.delivered += qty;
          current.held += qty;
          cylinderStats.set(item.cylinderType, current);
        }
      });

      // Buyback Items (Returns with value) -> ADD to buyback, SUBTRACT from held
      buybackItems.forEach((item: any) => {
        if (item.cylinderType) {
          const current = cylinderStats.get(item.cylinderType) || { delivered: 0, returned: 0, buyback: 0, held: 0 };
          const qty = item.quantity ? Number(item.quantity) : 0;
          current.buyback += qty;
          current.held -= qty;
          cylinderStats.set(item.cylinderType, current);
        }
      });

      // Return Items (Empty Returns) -> ADD to returned, SUBTRACT from held
      returnItems.forEach((item: any) => {
        if (item.cylinderType) {
          const current = cylinderStats.get(item.cylinderType) || { delivered: 0, returned: 0, buyback: 0, held: 0 };
          const qty = item.quantity ? Number(item.quantity) : 0;
          current.returned += qty;
          current.held -= qty;
          cylinderStats.set(item.cylinderType, current);
        }
      });
    });

    // Generate PDF
    const doc = await generatePDF(customer, transactionsWithBalance, startDate, endDate, cylinderTypeMap, cylinderStats);

    // Generate PDF buffer
    const pdfBlob = doc.output('blob');
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="B2B-Transaction-Report-${customer.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating B2B transaction report:', error);
    return NextResponse.json(
      { error: 'Failed to generate transaction report' },
      { status: 500 }
    );
  }
}
