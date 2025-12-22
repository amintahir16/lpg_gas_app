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

// Helper function to format transaction type
function formatTransactionType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'SALE': 'Sale',
    'PAYMENT': 'Payment',
    'BUYBACK': 'Buyback',
    'RETURN_EMPTY': 'Return Empty',
    'ADJUSTMENT': 'Adjustment',
    'CREDIT_NOTE': 'Credit Note'
  };
  return typeMap[type] || type;
}

// Helper function to get cylinder type display name - uses dynamic utility
// This will be enhanced with cylinder type mapping in the generatePDF function
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

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(customer: any, transactions: any[], startDate: string | null, endDate: string | null, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>) {
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
  doc.text(`Total Transactions: ${transactions.length}`, pageWidth - 50, 55);
  
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
  
  yPosition += 15;
  
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
    
    // Build items description
    const items: string[] = [];
    if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((item: any) => {
        let itemText = '';
        if (item.cylinderType) {
          itemText = `${getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap)} x${item.quantity || 0}`;
          // Add buyback details for BUYBACK transactions
          if (transaction.transactionType === 'BUYBACK') {
            const buybackDetails: string[] = [];
            if (item.remainingKg) {
              buybackDetails.push(`${Number(item.remainingKg).toFixed(1)}kg remaining`);
            }
            if (item.buybackRate) {
              buybackDetails.push(`${(item.buybackRate * 100).toFixed(1)}% rate`);
            }
            if (buybackDetails.length > 0) {
              itemText += ` (${buybackDetails.join(', ')})`;
            }
          }
          items.push(itemText);
        } else if (item.productName) {
          items.push(`${item.productName} x${item.quantity || 0}`);
        } else if (item.itemName) {
          items.push(`${item.itemName} x${item.quantity || 0}`);
        }
      });
    }
    
    const itemsText = items.join(', ') || '-';
    const totalAmount = Number(transaction.totalAmount);
    
    // Calculate debit (Out) and credit (In)
    // Out = Sales (increases what customer owes) - shown in red
    // In = Payments (decreases what customer owes) - shown in green
    let debit = '';
    let credit = '';
    if (transaction.transactionType === 'SALE') {
      // For fully paid SALE transactions, show dash (paid amount cancels out)
      if (transaction.paymentStatus === 'FULLY_PAID') {
        debit = '-';
      } else {
        // Show unpaid amount in debit column
        const unpaidAmount = transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined
          ? Number(transaction.unpaidAmount)
          : totalAmount;
        debit = unpaidAmount > 0 ? formatCurrencyRsRounded(unpaidAmount) : '-';
      }
      // Show paid amount in credit column if partially or fully paid
      if (transaction.paidAmount) {
        const paidAmount = Number(transaction.paidAmount);
        credit = paidAmount > 0 ? formatCurrencyRsRounded(paidAmount) : '-';
      } else if (transaction.paymentStatus === 'FULLY_PAID') {
        // For fully paid, show dash in credit too
        credit = '-';
      }
    } else if (['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType)) {
      credit = formatCurrencyRsRounded(totalAmount);
    }
    
    // Net Balance = negative when customer owes, positive when customer has credit
    // runningBalance from ledger API is positive (Sales - Payments), so we negate it
    const netBalance = -(transaction.runningBalance || 0);
    
    // Format transaction type with payment status for SALE transactions
    let transactionTypeText = formatTransactionType(transaction.transactionType);
    if (transaction.transactionType === 'SALE' && transaction.paymentStatus) {
      if (transaction.paymentStatus === 'PARTIAL') {
        transactionTypeText = 'Sale (Partial)';
      } else if (transaction.paymentStatus === 'FULLY_PAID') {
        transactionTypeText = 'Sale (Paid)';
      } else if (transaction.paymentStatus === 'UNPAID') {
        transactionTypeText = 'Sale (Unpaid)';
      }
    }
    
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
  
  // Add total row
  // Total Out: Sum of all SALE transaction total amounts
  const totalOut = sortedTransactions
    .filter(t => t.transactionType === 'SALE')
    .reduce((sum, t) => sum + Number(t.totalAmount), 0);
  
  // Total In: Sum of separate payments + partial payments from SALE transactions
  const totalIn = sortedTransactions.reduce((sum, t) => {
    // Separate payment transactions
    if (['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(t.transactionType)) {
      return sum + Number(t.totalAmount);
    }
    // Partial payments from SALE transactions
    if (t.transactionType === 'SALE' && t.paidAmount) {
      return sum + Number(t.paidAmount);
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
  
  // Add table - use autoTable as a function, not a method
  // Set tableWidth to match header width exactly (pageWidth - 30)
  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Bill No.', 'Type', 'Items', 'Out (-) (Rs)', 'In (+) (Rs)', 'Net Balance (Rs)']],
    body: tableData,
    startY: yPosition,
    tableWidth: pageWidth - 30, // Match header width exactly
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.5
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
      0: { halign: 'center', cellWidth: 8 },       // #
      1: { cellWidth: 16.5 },                       // Date
      2: { cellWidth: 14.5 },                       // Time
      3: { cellWidth: 21.5 },                       // Bill No.
      4: { cellWidth: 25.5 },                       // Type (accommodates "Sale (Partial)")
      5: { cellWidth: 35 },                         // Items
      6: { halign: 'right', cellWidth: 18 },        // Out (-) (Rs)
      7: { halign: 'right', cellWidth: 18 },        // In (+) (Rs)
      8: { halign: 'right', cellWidth: 22 }         // Net Balance (Rs)
      // Total: 8+16.5+14.5+21.5+25.5+35+18+18+22 = 179mm (autoTable will scale to 180mm with tableWidth)
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
  doc.text(`${transactions.length}`, pageWidth - 50, yPosition + 22, { align: 'right' });
  
  // Total Out (Sales)
  doc.setFont('helvetica', 'bold');
  doc.text('Total Out (-):', 25, yPosition + 32);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(231, 76, 60); // Red color
  doc.text(formatCurrencyRsRounded(totalOut), pageWidth - 50, yPosition + 32, { align: 'right' });
  
  // Total In (Payments)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.text('Total In (+):', 25, yPosition + 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(39, 174, 96); // Green color
  doc.text(formatCurrencyRsRounded(totalIn), pageWidth - 50, yPosition + 42, { align: 'right' });
  
  // Net Balance = Total Out - Total In
  // Negative when customer owes (Total Out > Total In)
  // Positive when customer has credit (Total In > Total Out)
  const netBalance = totalOut - totalIn;
  const displayBalance = netBalance; // Positive means customer owes, negative means credit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Net Balance:', 25, yPosition + 55);
  doc.setTextColor(displayBalance > 0 ? 231 : 39, displayBalance > 0 ? 76 : 174, displayBalance > 0 ? 60 : 96);
  // Display with negative sign when customer owes (positive balance)
  const balanceValueText = displayBalance > 0 ? `-${formatCurrencyRsRounded(displayBalance)}` : formatCurrencyRsRounded(Math.abs(displayBalance));
  doc.text(balanceValueText, pageWidth - 50, yPosition + 55, { align: 'right' });
  
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
  
  // Footer
  yPosition += 75;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This report was generated automatically by Flamora Gas Management System', pageWidth / 2, yPosition, { align: 'center' });
  doc.text(`Page 1 of 1 | Confidential Document`, pageWidth / 2, yPosition + 5, { align: 'center' });

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
    // Use same logic as ledger API: for SALE transactions, use unpaidAmount
    let runningBalance = 0;
    const allTransactionsWithBalance = allTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          // For SALE transactions, only unpaid amount affects balance
          // Check if paymentStatus is FULLY_PAID first (new format)
          if (transaction.paymentStatus === 'FULLY_PAID') {
            // Fully paid sale - zero balance impact
            balanceImpact = 0;
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            // New format with unpaidAmount field
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            // Old transaction format - no payment info, assume fully unpaid
            balanceImpact = totalAmount;
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount; // Decreases what customer owes
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

    // Calculate starting balance before filtered range (same logic as ledger API)
    // Use createdAt to match ledger API exactly
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
            // For SALE transactions, only unpaid amount affects balance
            if (transaction.paymentStatus === 'FULLY_PAID') {
              balanceImpact = 0; // Fully paid sale - zero impact
            } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
              balanceImpact = parseFloat(transaction.unpaidAmount.toString());
            } else {
              balanceImpact = totalAmount; // Old format - assume fully unpaid
            }
            break;
          case 'PAYMENT':
          case 'BUYBACK':
          case 'ADJUSTMENT':
          case 'CREDIT_NOTE':
            balanceImpact = -totalAmount; // Decreases what customer owes
            break;
          default:
            balanceImpact = 0;
        }
        startingBalance += balanceImpact;
      });
    }

    // Calculate running balances for filtered transactions
    // runningBalance is positive (Sales - Payments), we'll negate for display
    // Use same logic as ledger API: for SALE transactions, use unpaidAmount
    let currentBalance = startingBalance;
    const transactionsWithBalance = filteredTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          // For SALE transactions, only unpaid amount affects balance
          if (transaction.paymentStatus === 'FULLY_PAID') {
            balanceImpact = 0; // Fully paid sale - zero impact
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            balanceImpact = totalAmount; // Old format - assume fully unpaid
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount; // Decreases what customer owes
          break;
        default:
          balanceImpact = 0;
      }
      currentBalance += balanceImpact;
      
      return {
        ...transaction,
        runningBalance: currentBalance // Positive, will be negated for display
      };
    });

    // Build cylinder type mapping for proper display names
    // Get all unique cylinder types from transaction items
    const uniqueCylinderTypes = new Set<string>();
    transactionsWithBalance.forEach(transaction => {
      transaction.items?.forEach((item: any) => {
        if (item.cylinderType) {
          uniqueCylinderTypes.add(item.cylinderType);
        }
      });
    });

    // Query cylinders to get typeName and capacity for each cylinderType
    const cylinderTypeMap = new Map<string, { typeName: string | null, capacity: number | null }>();
    
    if (uniqueCylinderTypes.size > 0) {
      // Query cylinders and group by cylinderType to get unique typeName and capacity
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

      // Build the mapping - use the first cylinder of each type for typeName and capacity
      cylinders.forEach(cylinder => {
        if (!cylinderTypeMap.has(cylinder.cylinderType)) {
          cylinderTypeMap.set(cylinder.cylinderType, {
            typeName: cylinder.typeName,
            capacity: cylinder.capacity ? Number(cylinder.capacity) : null
          });
        }
      });

      // For cylinder types not found in database, set to null (will use fallback)
      uniqueCylinderTypes.forEach(type => {
        if (!cylinderTypeMap.has(type)) {
          cylinderTypeMap.set(type, { typeName: null, capacity: null });
        }
      });
    }

    // Generate PDF
    const doc = await generatePDF(customer, transactionsWithBalance, startDate, endDate, cylinderTypeMap);

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

