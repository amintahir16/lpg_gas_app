import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format currency with Rs rounded
function formatCurrencyRs(amount: number): string {
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
function getCylinderTypeDisplay(type: string | null, cylinderTypeMap?: Map<string, { typeName: string | null, capacity: number | null }>): string {
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
function categorizeItems(items: any[], transactionType: string): {
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
    // Non-cylinder items (accessories) with price
    else if (item.productName && hasRegularPrice) {
      saleItems.push(item);
    }
    // Default to return items for cylinders
    else if (item.cylinderType) {
      returnItems.push(item);
    }
  });

  return { saleItems, buybackItems, returnItems };
}

// Determine transaction type badges to display
function getTransactionTypeBadges(saleItems: any[], buybackItems: any[], returnItems: any[], transactionType: string): string[] {
  const badges: string[] = [];

  // If we have sale items with positive value
  if (saleItems.length > 0 && saleItems.some(item => item.pricePerItem && Number(item.pricePerItem) > 0)) {
    badges.push('SALE');
  }

  // If we have buyback items
  if (buybackItems.length > 0) {
    badges.push('BUYBACK');
  }

  // If we have return items
  if (returnItems.length > 0) {
    badges.push('RETURN');
  }

  // If no badges, use the original transaction type
  if (badges.length === 0) {
    badges.push(transactionType);
  }

  return badges;
}

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(transaction: any, customer: any, cylinderTypeMap: Map<string, { typeName: string | null, capacity: number | null }>) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');

  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

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
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION DETAIL REPORT', pageWidth / 2, 22, { align: 'center' });

  // Transaction Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill No: ${transaction.billSno}`, pageWidth / 2, 30, { align: 'center' });
  doc.text(`Date: ${formatDate(transaction.date)}`, pageWidth / 2, 35, { align: 'center' });

  // Reset colors
  doc.setTextColor(0, 0, 0);

  // Report Info Box
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, 45, contentWidth, 20, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, 45, contentWidth, 20, 'S');

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, margin + 5, 52);
  doc.text(`Report ID: ${transaction.billSno}-${Date.now().toString().slice(-6)}`, margin + 5, 58);

  // Customer Information
  let yPosition = 75;
  doc.setFillColor(52, 73, 94);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', margin + 5, yPosition + 6);

  yPosition += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name}`, margin + 5, yPosition);
  doc.text(`Contact: ${customer.contactPerson}`, margin + 5, yPosition + 6);
  doc.text(`Phone: ${customer.phone}`, margin + 5, yPosition + 12);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, margin + 5, yPosition + 18);
    yPosition += 6;
  }
  if (customer.address) {
    const addressLines = doc.splitTextToSize(`Address: ${customer.address}`, contentWidth - 10);
    doc.text(addressLines, margin + 5, yPosition + 18);
    yPosition += (addressLines.length - 1) * 6;
  }

  yPosition += (customer.email && customer.address ? 30 : customer.email || customer.address ? 24 : 18);

  // Categorize items
  const { saleItems, buybackItems, returnItems } = categorizeItems(transaction.items || [], transaction.transactionType);
  const badges = getTransactionTypeBadges(saleItems, buybackItems, returnItems, transaction.transactionType);

  // Transaction Details Header
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(52, 73, 94);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION DETAILS', margin + 5, yPosition + 6);

  yPosition += 15;

  // Transaction Type badges
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Type: ', margin + 5, yPosition);

  let badgeX = margin + 45;
  badges.forEach((badge, index) => {
    // Draw badge background
    const badgeWidth = doc.getTextWidth(badge) + 8;
    let badgeColor: [number, number, number];

    switch (badge) {
      case 'SALE':
        badgeColor = [34, 197, 94]; // Green
        break;
      case 'BUYBACK':
        badgeColor = [251, 146, 60]; // Orange
        break;
      case 'RETURN':
        badgeColor = [156, 163, 175]; // Gray
        break;
      case 'PAYMENT':
        badgeColor = [59, 130, 246]; // Blue
        break;
      default:
        badgeColor = [107, 114, 128]; // Gray
    }

    doc.setFillColor(...badgeColor);
    doc.roundedRect(badgeX, yPosition - 4, badgeWidth, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(badge, badgeX + 4, yPosition);
    badgeX += badgeWidth + 3;
  });

  yPosition += 8;

  // Payment Status
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Always show payment status for SALE transactions, default to Unpaid if null
  if (transaction.transactionType === 'SALE') {
    const status = transaction.paymentStatus || 'UNPAID';
    const statusText = status === 'FULLY_PAID' ? 'Paid' :
      status === 'PARTIAL' ? 'Partial' : 'Unpaid';
    doc.text(`Payment Status: ${statusText}`, margin + 5, yPosition);
    yPosition += 8;
  } else if (transaction.paymentStatus) {
    const statusText = transaction.paymentStatus === 'FULLY_PAID' ? 'Paid' :
      transaction.paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid';
    doc.text(`Payment Status: ${statusText}`, margin + 5, yPosition);
    yPosition += 8;
  }

  yPosition += 5;

  // Helper function to draw an items table
  const drawItemsTable = (title: string, items: any[], isBuyback: boolean = false, isReturn: boolean = false, titleColor: [number, number, number]) => {
    if (items.length === 0) return;

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Section title with colored bar
    doc.setFillColor(...titleColor);
    doc.rect(margin, yPosition, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, yPosition + 4.5);
    yPosition += 10;

    // Prepare table data
    let headers: string[];
    let tableData: any[];
    let columnStyles: any;

    if (isBuyback) {
      headers = ['Item', 'Qty', 'Remaining Gas', 'Buyback Rate', 'Credit/Item', 'Total Credit'];
      tableData = items.map(item => {
        const itemName = item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : (item.productName || 'N/A');
        const remainingKg = item.remainingKg ? `${Number(item.remainingKg).toFixed(1)} kg` : '-';
        const buybackRate = item.buybackRate ? `${(Number(item.buybackRate) * 100).toFixed(0)}%` : '-';
        const creditPerItem = item.buybackPricePerItem ? formatCurrencyRs(Number(item.buybackPricePerItem)) : '-';
        const totalCredit = item.totalPrice ? formatCurrencyRs(Number(item.totalPrice)) : '-';

        return [itemName, item.quantity, remainingKg, buybackRate, creditPerItem, totalCredit];
      });
      columnStyles = {
        0: { cellWidth: contentWidth * 0.28, halign: 'left' },
        1: { cellWidth: contentWidth * 0.08, halign: 'center' },
        2: { cellWidth: contentWidth * 0.16, halign: 'center' },
        3: { cellWidth: contentWidth * 0.14, halign: 'center' },
        4: { cellWidth: contentWidth * 0.17, halign: 'right' },
        5: { cellWidth: contentWidth * 0.17, halign: 'right' }
      };
    } else if (isReturn) {
      headers = ['Item', 'Quantity', 'Status'];
      tableData = items.map(item => {
        const itemName = item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : (item.productName || 'N/A');
        return [itemName, item.quantity, 'Empty Returned'];
      });
      columnStyles = {
        0: { cellWidth: contentWidth * 0.50, halign: 'left' },
        1: { cellWidth: contentWidth * 0.20, halign: 'center' },
        2: { cellWidth: contentWidth * 0.30, halign: 'center' }
      };
    } else {
      headers = ['Item', 'Quantity', 'Price/Item', 'Total Price'];
      tableData = items.map(item => {
        const itemName = item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : (item.productName || 'N/A');
        const pricePerItem = item.pricePerItem ? formatCurrencyRs(Number(item.pricePerItem)) : 'Rs 0';
        const totalPrice = item.totalPrice ? formatCurrencyRs(Number(item.totalPrice)) : 'Rs 0';
        return [itemName, item.quantity, pricePerItem, totalPrice];
      });
      columnStyles = {
        0: { cellWidth: contentWidth * 0.45, halign: 'left' },
        1: { cellWidth: contentWidth * 0.15, halign: 'center' },
        2: { cellWidth: contentWidth * 0.20, halign: 'right' },
        3: { cellWidth: contentWidth * 0.20, halign: 'right' }
      };
    }

    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: tableData,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: titleColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 9
      },
      columnStyles: columnStyles,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'visible'
      },
      alternateRowStyles: { fillColor: [248, 249, 250] }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  };

  // Draw Sale Items table
  if (saleItems.length > 0) {
    drawItemsTable('SOLD ITEMS', saleItems, false, false, [34, 197, 94]);
  }

  // Draw Buyback Items table
  if (buybackItems.length > 0) {
    drawItemsTable('BUYBACK ITEMS', buybackItems, true, false, [251, 146, 60]);
  }

  // Draw Return Items table
  if (returnItems.length > 0) {
    drawItemsTable('EMPTY RETURNS', returnItems, false, true, [107, 114, 128]);
  }

  // Summary Section
  yPosition += 5;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(155, 89, 182);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin + 5, yPosition + 6);

  yPosition += 15;

  // Summary Box
  doc.setFillColor(248, 249, 250);
  const summaryHeight = 50;
  doc.rect(margin, yPosition, contentWidth, summaryHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, contentWidth, summaryHeight, 'S');

  const summaryY = yPosition + 10;
  const rightX = pageWidth - margin - 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Calculate totals
  const saleTotal = saleItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const buybackTotal = buybackItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  let currentY = summaryY;

  // Sale Total
  if (saleTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Sale Total:', margin + 10, currentY);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrencyRs(saleTotal), rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Buyback Credit
  if (buybackTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Buyback Credit:', margin + 10, currentY);
    doc.setTextColor(251, 146, 60);
    doc.text(`-${formatCurrencyRs(buybackTotal)}`, rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Empty Returns Count
  if (returnItems.length > 0) {
    const returnCount = returnItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Empty Cylinders Returned:', margin + 10, currentY);
    doc.setTextColor(107, 114, 128);
    doc.text(`${returnCount} cylinder${returnCount > 1 ? 's' : ''}`, rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Net Amount / Total
  currentY += 2;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + 10, currentY - 2, rightX, currentY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const netAmount = saleTotal - buybackTotal;
  doc.text('Net Amount:', margin + 10, currentY + 4);

  if (netAmount >= 0) {
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrencyRs(netAmount), rightX, currentY + 4, { align: 'right' });
  } else {
    doc.setTextColor(34, 197, 94);
    doc.text(`Credit: ${formatCurrencyRs(Math.abs(netAmount))}`, rightX, currentY + 4, { align: 'right' });
  }

  yPosition += summaryHeight + 10;

  // Payment Details (if applicable)
  if (transaction.transactionType === 'SALE' || transaction.paidAmount || transaction.paymentStatus === 'FULLY_PAID') {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Always show payment received for sales, even if 0
    const paidAmount = Number(transaction.paidAmount || 0);
    doc.text(`Payment Received: ${formatCurrencyRs(paidAmount)}`, margin + 5, yPosition);
    yPosition += 6;

    if (transaction.paymentMethod) {
      doc.text(`Payment Method: ${transaction.paymentMethod}`, margin + 5, yPosition);
      yPosition += 6;
    }

    // Calculate unpaid amount if not explicitly set
    const unpaidAmount = transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined
      ? Number(transaction.unpaidAmount)
      : (transaction.transactionType === 'SALE' ? (Number(transaction.totalAmount) - Number(transaction.paidAmount || 0)) : 0);

    if (unpaidAmount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Remaining Balance: ${formatCurrencyRs(unpaidAmount)}`, margin + 5, yPosition);
    }
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Flamora - LPG Gas Management System', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Confidential Document', pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await params;

    const transaction = await prisma.b2BTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
            address: true
          }
        },
        items: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Build cylinder type mapping for proper display names
    const uniqueCylinderTypes = new Set<string>();
    transaction.items?.forEach((item: any) => {
      if (item.cylinderType) {
        uniqueCylinderTypes.add(item.cylinderType);
      }
    });

    const cylinderTypeMap = new Map<string, { typeName: string | null, capacity: number | null }>();

    if (uniqueCylinderTypes.size > 0) {
      // Query cylinders to get typeName and capacity for each cylinderType
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

    // Generate PDF with cylinder type mapping
    const doc = await generatePDF(transaction, transaction.customer, cylinderTypeMap);
    const pdfBlob = doc.output('blob');
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Transaction-${transaction.billSno}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating transaction report:', error);
    return NextResponse.json(
      { error: 'Failed to generate transaction report' },
      { status: 500 }
    );
  }
}
