import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// Helper function to get cylinder type display name
function getCylinderTypeDisplay(type: string): string {
  const typeMap: { [key: string]: string } = {
    'DOMESTIC_11_8KG': 'Domestic (11.8kg)',
    'STANDARD_15KG': 'Standard (15kg)',
    'COMMERCIAL_45_4KG': 'Commercial (45.4kg)'
  };
  return typeMap[type] || type;
}

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(customer: any, transactions: any[], startDate: string | null, endDate: string | null) {
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
    const items = [];
    if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((item: any) => {
        if (item.cylinderType) {
          items.push(`${getCylinderTypeDisplay(item.cylinderType)} x${item.quantity || 0}`);
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
      debit = formatCurrency(totalAmount);
    } else if (['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType)) {
      credit = formatCurrency(totalAmount);
    }
    
    // Net Balance = negative when customer owes, positive when customer has credit
    // runningBalance from ledger API is positive (Sales - Payments), so we negate it
    const netBalance = -(transaction.runningBalance || 0);
    
    return [
      index + 1,
      date,
      time,
      transaction.billSno || '-',
      formatTransactionType(transaction.transactionType),
      itemsText,
      debit,
      credit,
      formatCurrency(netBalance)
    ];
  });
  
  // Add total row
  const totalOut = sortedTransactions
    .filter(t => t.transactionType === 'SALE')
    .reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalIn = sortedTransactions
    .filter(t => ['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(t.transactionType))
    .reduce((sum, t) => sum + Number(t.totalAmount), 0);
  
  tableData.push([
    '',
    '',
    '',
    '',
    'TOTAL:',
    '',
    formatCurrency(totalOut),
    formatCurrency(totalIn),
    ''
  ]);
  
  // Add table - use autoTable as a function, not a method
  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Bill No.', 'Type', 'Items', 'Out (-) (Rs)', 'In (+) (Rs)', 'Net Balance (Rs)']],
    body: tableData,
    startY: yPosition,
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
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 22 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 50 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 24 }
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
  doc.text(formatCurrency(totalOut), pageWidth - 50, yPosition + 32, { align: 'right' });
  
  // Total In (Payments)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.text('Total In (+):', 25, yPosition + 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(39, 174, 96); // Green color
  doc.text(formatCurrency(totalIn), pageWidth - 50, yPosition + 42, { align: 'right' });
  
  // Net Balance = Total Out - Total In (negative when customer owes)
  const netBalance = totalOut - totalIn;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Net Balance:', 25, yPosition + 55);
  doc.setTextColor(netBalance < 0 ? 231 : 39, netBalance < 0 ? 76 : 174, netBalance < 0 ? 60 : 96);
  doc.text(formatCurrency(netBalance), pageWidth - 50, yPosition + 55, { align: 'right' });
  
  // Balance Interpretation
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const balanceText = netBalance < 0 
    ? 'Customer owes this amount'
    : netBalance > 0
    ? 'Customer has credit'
    : 'Balance settled';
  doc.text(balanceText, 25, yPosition + 62);
  
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
    let runningBalance = 0;
    const allTransactionsWithBalance = allTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = totalAmount;
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
      }
      runningBalance += balanceImpact;
      return {
        ...transaction,
        runningBalance: runningBalance
      };
    });

    // Calculate starting balance before filtered range (same logic as ledger API)
    let startingBalance = 0;
    if (filteredTransactions.length > 0 && (startDate || endDate)) {
      const firstFilteredDate = new Date(filteredTransactions[0].date);
      const transactionsBeforeFilter = allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate < firstFilteredDate;
      });
      
      transactionsBeforeFilter.forEach(transaction => {
        const totalAmount = parseFloat(transaction.totalAmount.toString());
        let balanceImpact = 0;
        switch (transaction.transactionType) {
          case 'SALE':
            balanceImpact = totalAmount;
            break;
          case 'PAYMENT':
          case 'BUYBACK':
          case 'ADJUSTMENT':
          case 'CREDIT_NOTE':
            balanceImpact = -totalAmount;
            break;
        }
        startingBalance += balanceImpact;
      });
    }

    // Calculate running balances for filtered transactions
    // runningBalance is positive (Sales - Payments), we'll negate for display
    let currentBalance = startingBalance;
    const transactionsWithBalance = filteredTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = totalAmount;
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
      }
      currentBalance += balanceImpact;
      
      return {
        ...transaction,
        runningBalance: currentBalance // Positive, will be negated for display
      };
    });

    // Generate PDF
    const doc = await generatePDF(customer, transactionsWithBalance, startDate, endDate);

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

