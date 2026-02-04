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

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(transaction: any, customer: any, cylinderTypeMap: Map<string, { typeName: string | null, capacity: number | null }>) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');

  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // Professional margins (20mm on each side)
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
  doc.text(`Phone: ${customer.phone}`, margin + 5, yPosition + 6);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, margin + 5, yPosition + 12);
    yPosition += 6;
  }
  if (customer.address) {
    const addressLines = doc.splitTextToSize(`Address: ${customer.address}`, contentWidth - 10);
    doc.text(addressLines, margin + 5, yPosition + (customer.email ? 18 : 12));
    yPosition += (addressLines.length - 1) * 6;
  }

  yPosition += (customer.email && customer.address ? 30 : customer.email || customer.address ? 24 : 18);

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

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Transaction Type logic
  const badges: string[] = [];
  const hasSold = (transaction.gasItems?.length > 0 || transaction.accessoryItems?.length > 0);
  const hasReturn = transaction.securityItems?.some((i: any) => i.isReturn);
  const hasDeposit = transaction.securityItems?.some((i: any) => !i.isReturn);

  if (hasSold) badges.push('SALE');
  if (hasDeposit) badges.push('SECURITY DEPOSIT');
  if (hasReturn) badges.push('SECURITY RETURN');
  if (badges.length === 0) badges.push('TRANSACTION');

  doc.text('Transaction Type: ', margin + 5, yPosition);

  let badgeX = margin + 45;
  badges.forEach((badge) => {
    const badgeWidth = doc.getTextWidth(badge) + 8;
    let badgeColor: [number, number, number];

    switch (badge) {
      case 'SALE': badgeColor = [34, 197, 94]; break; // Green
      case 'SECURITY DEPOSIT': badgeColor = [59, 130, 246]; break; // Blue
      case 'SECURITY RETURN': badgeColor = [251, 146, 60]; break; // Orange (Using Orange for Return in B2C to match Modal)
      default: badgeColor = [107, 114, 128]; // Gray
    }

    doc.setFillColor(...badgeColor);
    doc.roundedRect(badgeX, yPosition - 4, badgeWidth, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(badge, badgeX + 4, yPosition);
    badgeX += badgeWidth + 3;
  });

  yPosition += 8;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method: ${transaction.paymentMethod ? transaction.paymentMethod.replace(/_/g, ' ') : '-'}`, margin + 5, yPosition);
  yPosition += 8;

  yPosition += 5;

  // Helper function to draw an items table
  const drawItemsTable = (title: string, items: any[], type: 'sale' | 'return' | 'deposit', titleColor: [number, number, number]) => {
    if (items.length === 0) return;

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

    let headers: string[];
    let tableData: any[];
    let columnStyles: any;

    if (type === 'sale') {
      headers = ['Item', 'Quantity', 'Price/Item', 'Total Price'];
      tableData = items.map(item => [
        item.cylinderType ? getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap) : (item.productName || 'N/A'),
        item.quantity,
        formatCurrencyRs(Number(item.totalPrice) / Number(item.quantity)), // approximate unit price calculate to handle total match
        formatCurrencyRs(Number(item.totalPrice))
      ]);
      columnStyles = {
        0: { cellWidth: contentWidth * 0.45, halign: 'left' },
        1: { cellWidth: contentWidth * 0.15, halign: 'center' },
        2: { cellWidth: contentWidth * 0.20, halign: 'right' },
        3: { cellWidth: contentWidth * 0.20, halign: 'right' }
      };
    } else if (type === 'deposit') {
      headers = ['Item', 'Quantity', 'Deposit/Item', 'Total Deposit'];
      tableData = items.map(item => [
        getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap),
        item.quantity,
        formatCurrencyRs(Number(item.totalPrice) / Number(item.quantity)),
        formatCurrencyRs(Number(item.totalPrice))
      ]);
      columnStyles = {
        0: { cellWidth: contentWidth * 0.45, halign: 'left' },
        1: { cellWidth: contentWidth * 0.15, halign: 'center' },
        2: { cellWidth: contentWidth * 0.20, halign: 'right' },
        3: { cellWidth: contentWidth * 0.20, halign: 'right' }
      };
    } else {
      // return
      headers = ['Item', 'Quantity', 'Refund/Item', 'Total Refund'];
      tableData = items.map(item => [
        getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap),
        item.quantity,
        formatCurrencyRs(Number(item.totalPrice) / Number(item.quantity)),
        formatCurrencyRs(Number(item.totalPrice))
      ]);
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

  // Categorize items
  const saleItems = [
    ...(transaction.gasItems || []),
    ...(transaction.accessoryItems || [])
  ];
  const depositItems = transaction.securityItems?.filter((i: any) => !i.isReturn) || [];
  const returnItems = transaction.securityItems?.filter((i: any) => i.isReturn) || [];

  // Draw Sale Items
  if (saleItems.length > 0) {
    drawItemsTable('SOLD ITEMS', saleItems, 'sale', [34, 197, 94]); // Green
  }

  // Draw Deposit Items
  if (depositItems.length > 0) {
    drawItemsTable('DEPOSIT ITEMS', depositItems, 'deposit', [59, 130, 246]); // Blue
  }

  // Draw Return Items
  if (returnItems.length > 0) {
    drawItemsTable('RETURNED ITEMS', returnItems, 'return', [251, 146, 60]); // Orange
  }

  // Summary Section
  yPosition += 5;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(155, 89, 182); // Purple for summary header
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin + 5, yPosition + 6);

  yPosition += 15;

  // Summary Box
  doc.setFillColor(248, 249, 250);
  const summaryHeight = 40 + (transaction.deliveryCharges > 0 ? 8 : 0) + 10;
  doc.rect(margin, yPosition, contentWidth, summaryHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, contentWidth, summaryHeight, 'S');

  const summaryY = yPosition + 10;
  const rightX = pageWidth - margin - 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  let currentY = summaryY;

  // Sale Total
  const saleTotal = saleItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
  if (saleTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Sale Total:', margin + 10, currentY);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrencyRs(saleTotal), rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Deposit Total
  const depositTotal = depositItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
  if (depositTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Security Deposit:', margin + 10, currentY);
    doc.setTextColor(59, 130, 246);
    doc.text(formatCurrencyRs(depositTotal), rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Return Refund
  const returnRefund = returnItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
  if (returnRefund > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Security Refund:', margin + 10, currentY);
    doc.setTextColor(251, 146, 60);
    doc.text(`-${formatCurrencyRs(returnRefund)}`, rightX, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Delivery Charges
  if (transaction.deliveryCharges > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Delivery Charges:', margin + 10, currentY);
    doc.text(formatCurrencyRs(Number(transaction.deliveryCharges)), rightX, currentY, { align: 'right' });
    currentY += 8;
  }

  // Net Amount
  currentY += 2;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + 10, currentY - 2, rightX, currentY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Net Transaction Amount:', margin + 10, currentY + 4);
  doc.text(formatCurrencyRs(Number(transaction.finalAmount)), rightX, currentY + 4, { align: 'right' });

  yPosition += summaryHeight + 10;

  // Add Footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');

    // Line 1
    doc.text('This report was generated automatically by Flamora Gas Management System', pageWidth / 2, footerY, { align: 'center' });

    // Line 2
    doc.text(`Page ${i} of ${pageCount} | Confidential Document`, pageWidth / 2, footerY + 5, { align: 'center' });
  }

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

    const transaction = await prisma.b2CTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true
          }
        },
        gasItems: true,
        securityItems: true,
        accessoryItems: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Build cylinder type mapping for proper display names
    const uniqueCylinderTypes = new Set<string>();
    transaction.gasItems?.forEach((item: any) => {
      if (item.cylinderType) uniqueCylinderTypes.add(item.cylinderType);
    });
    transaction.securityItems?.forEach((item: any) => {
      if (item.cylinderType) uniqueCylinderTypes.add(item.cylinderType);
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

    // Generate PDF
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
