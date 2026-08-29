import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  b2bItemVariantKey,
  formatB2bItemCylinderLabel,
  formatB2bVariantKeyForReport,
} from '@/lib/b2b-transaction-item-variant';
import { adoptLegacyB2bCustomerIfNeeded, getActiveRegionId, regionScopedWhere } from '@/lib/region';
import {
  isOpeningBalanceTransaction,
  isOpeningDuesSaleItem,
  isOpeningDuesTransaction,
} from '@/lib/b2b-opening-entries';
import { formatPaymentMethodLabel } from '@/lib/payment-methods';
import { logoBase64 } from '@/lib/logoBase64';

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

// Helper function to format time
function formatTime(timeString?: string | Date | null): string {
  if (!timeString) return '-';
  try {
    const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(timeString);
  }
}

// Categorize items into Sale, Buyback, and Return
function categorizeItems(
  items: any[],
  transactionType: string,
  isOpeningDues: boolean = false,
  transaction?: any,
): {
  saleItems: any[];
  buybackItems: any[];
  returnItems: any[];
} {
  const saleItems: any[] = [];
  const buybackItems: any[] = [];
  const returnItems: any[] = [];

  // Opening cylinder dues record cylinders already held by the customer
  // (deliveries at price 0). Treat them all as deliveries, not empty returns.
  if (isOpeningDues) {
    return { saleItems: [...items], buybackItems, returnItems };
  }

  items.forEach(item => {
    // Untagged zero-value SALE fallback (opening dues without notes marker)
    if (isOpeningDuesSaleItem(transaction, item)) {
      saleItems.push(item);
      return;
    }

    const hasRegularPrice = item.pricePerItem && Number(item.pricePerItem) > 0;
    const hasBuybackData = item.remainingKg && Number(item.remainingKg) > 0;
    // Key check: buybackRate being SET (even if 0) indicates this is a buyback item
    const hasBuybackRateSet = item.buybackRate !== null && item.buybackRate !== undefined;
    const isExplicitEmptyReturn = item.returnedCondition === 'EMPTY';

    // BUYBACK items: have buybackRate set (including 0%) - this is the definitive indicator
    // A buyback with 0% rate still has buybackRate = 0, while sales have buybackRate = null
    if (hasBuybackRateSet && !isExplicitEmptyReturn) {
      buybackItems.push(item);
    }
    // SALE items: have a regular sale price AND no buyback rate set
    else if (hasRegularPrice && !hasBuybackRateSet) {
      saleItems.push(item);
    }
    // Empty returns: explicitly marked EMPTY, or cylinder with no sale price and no buyback
    else if (
      item.cylinderType &&
      (isExplicitEmptyReturn || (!hasRegularPrice && !hasBuybackRateSet && !hasBuybackData))
    ) {
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
async function generatePDF(
  transaction: any,
  customer: any,
  cylinderTypeMap: Map<string, { typeName: string | null, capacity: number | null }>,
  cylinderStats: Map<string, { delivered: number, returned: number, buyback: number, held: number, buybackWeight: number, buybackCredit: number }>
) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Receipt Layout Dimensions
  const receiptWidth = 146;
  const receiptX = (pageWidth - receiptWidth) / 2;
  const innerLeft = receiptX + 10;
  const innerRight = receiptX + receiptWidth - 10;
  let y = 16;

  function drawDashedLine(x1: number, yPos: number, x2: number) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(x1, yPos, x2, yPos);
    doc.setLineDashPattern([], 0);
  }

  function drawZigzag(startX: number, yPos: number, width: number, dir: number = 1) {
    const toothW = 3.5;
    const toothH = 1.6;
    const count = Math.floor(width / toothW);
    const w = width / count;
    let x = startX;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    for (let i = 0; i < count; i++) {
      doc.line(x, yPos, x + w / 2, yPos + dir * toothH);
      doc.line(x + w / 2, yPos + dir * toothH, x + w, yPos);
      x += w;
    }
  }

  function checkPageBreak(requiredHeight: number) {
    if (y + requiredHeight > pageHeight - 35) {
      drawZigzag(receiptX, y, receiptWidth, -1);
      doc.addPage();
      y = 16;
      drawZigzag(receiptX, y, receiptWidth, 1);
      y += 6;
    }
  }

  // Top Zigzag
  drawZigzag(receiptX, y, receiptWidth, 1);
  y += 6;

  // Logo
  const logoW = 40;
  const logoH = 20;
  const logoX = (pageWidth - logoW) / 2;
  const imgData = logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`;
  doc.addImage(imgData, 'PNG', logoX, y, logoW, logoH);
  y += logoH + 4;

  // Receipt title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('RECEIPT', pageWidth / 2, y, { align: 'center' });
  y += 5;

  if (transaction.voided) {
    y += 2;
    doc.setFillColor(239, 68, 68);
    doc.roundedRect((pageWidth - 32) / 2, y - 4, 32, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('VOIDED', pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  y += 2;
  drawDashedLine(innerLeft, y, innerRight);
  y += 6;

  // Metadata block
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Transaction ID:', innerLeft, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${transaction.billSno}`, innerLeft + 26, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Date:', innerRight - 36, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(transaction.date), innerRight, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Customer:', innerLeft, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const customerNameLines = doc.splitTextToSize(customer.name, 60);
  doc.text(customerNameLines[0], innerLeft + 26, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Time:', innerRight - 36, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatTime(transaction.time || transaction.createdAt), innerRight, y, { align: 'right' });
  y += 5.5;

  if (customer.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Phone:', innerLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(customer.phone, innerLeft + 26, y);
    y += 5.5;
  }

  y += 1;
  drawDashedLine(innerLeft, y, innerRight);
  y += 6;

  // Categorize items
  const openingDues = isOpeningDuesTransaction(transaction);
  const { saleItems, buybackItems, returnItems } = categorizeItems(
    transaction.items || [],
    transaction.transactionType,
    openingDues,
    transaction,
  );

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Item:', innerLeft, y);
  doc.text('Amount', innerRight, y, { align: 'right' });
  y += 5.5;

  // Render items
  doc.setFontSize(9);

  // 1. Sale Items
  saleItems.forEach(item => {
    checkPageBreak(8);
    let itemName = item.cylinderType ? formatB2bItemCylinderLabel(item, cylinderTypeMap) : (item.productName || 'Item');
    const isVaporizer = item.category && item.category.toLowerCase().includes('vaporizer');
    if (isVaporizer) {
      const pricePerItemVal = Number(item.pricePerItem || 0);
      itemName += pricePerItemVal > 0 ? ' (Charged)' : ' (Not Charged)';
    }

    const qty = Number(item.quantity) || 1;
    const label = `${qty}x ${itemName}`;
    const totalPrice = Number(item.totalPrice) > 0 ? formatCurrencyRs(Number(item.totalPrice)) : 'Rs 0';

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
    doc.text(itemLines, innerLeft, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(totalPrice, innerRight, y, { align: 'right' });
    y += Math.max(itemLines.length * 4.5, 5.5);
  });

  // 2. Buyback Items
  buybackItems.forEach(item => {
    checkPageBreak(8);
    const itemName = item.cylinderType ? formatB2bItemCylinderLabel(item, cylinderTypeMap) : (item.productName || 'Cylinder');
    const qty = Number(item.quantity) || 1;
    const gasKg = item.remainingKg ? ` (${Number(item.remainingKg).toFixed(1)}kg gas)` : '';
    const label = `${qty}x ${itemName} - Buyback${gasKg}`;
    const credit = Number(item.totalPrice) > 0 ? `-${formatCurrencyRs(Number(item.totalPrice))}` : 'Rs 0';

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(194, 65, 12);
    const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
    doc.text(itemLines, innerLeft, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(194, 65, 12);
    doc.text(credit, innerRight, y, { align: 'right' });
    y += Math.max(itemLines.length * 4.5, 5.5);
  });

  // 3. Return Items
  returnItems.forEach(item => {
    checkPageBreak(8);
    const itemName = item.cylinderType ? formatB2bItemCylinderLabel(item, cylinderTypeMap) : (item.productName || 'Cylinder');
    const qty = Number(item.quantity) || 1;
    const label = `${qty}x ${itemName} (Empty Returned)`;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
    doc.text(itemLines, innerLeft, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Rs 0', innerRight, y, { align: 'right' });
    y += Math.max(itemLines.length * 4.5, 5.5);
  });

  // 4. Payment Only transaction
  if (transaction.transactionType === 'PAYMENT') {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Payment Received', innerLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    const totalVal = Number(transaction.totalAmount || transaction.paidAmount || 0);
    doc.text(formatCurrencyRs(totalVal), innerRight, y, { align: 'right' });
    y += 5.5;
  }

  y += 2;
  drawDashedLine(innerLeft, y, innerRight);
  y += 6;

  // Financial calculations
  const totalAmountVal = Number(transaction.totalAmount || transaction.finalAmount || 0);
  const paidAmountVal = Number(transaction.paidAmount || (transaction.transactionType === 'PAYMENT' ? totalAmountVal : 0));
  const saleTotal = saleItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const buybackTotal = buybackItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  // Subtotal & Buyback deduction display if applicable
  if (saleTotal > 0 && buybackTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Sale Subtotal:', innerLeft, y);
    doc.text(formatCurrencyRs(saleTotal), innerRight, y, { align: 'right' });
    y += 5;

    doc.text('Buyback Credit:', innerLeft, y);
    doc.setTextColor(194, 65, 12);
    doc.text(`-${formatCurrencyRs(buybackTotal)}`, innerRight, y, { align: 'right' });
    y += 5.5;
  }

  // Net Total
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Total:', innerLeft, y);
  const finalDisplayAmount = transaction.transactionType === 'PAYMENT'
    ? formatCurrency(totalAmountVal || paidAmountVal)
    : formatCurrency(Math.max(0, saleTotal - buybackTotal) || totalAmountVal);
  doc.text(finalDisplayAmount, innerRight, y, { align: 'right' });
  y += 7;

  // Status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Status:', innerLeft, y);

  let statusText = 'Paid';
  let statusColor: [number, number, number] = [22, 163, 74]; // Green

  if (transaction.transactionType === 'SALE') {
    const status = transaction.paymentStatus || 'UNPAID';
    if (status === 'UNPAID' || paidAmountVal === 0) {
      statusText = 'Unpaid';
      statusColor = [217, 119, 6]; // Amber
    } else if (status === 'PARTIAL' || (paidAmountVal > 0 && paidAmountVal < totalAmountVal)) {
      statusText = 'Partial';
      statusColor = [37, 99, 235]; // Blue
    } else {
      statusText = 'Paid';
      statusColor = [22, 163, 74]; // Green
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(statusText, innerRight, y, { align: 'right' });
  y += 5.5;

  // Payment Method
  if (transaction.paymentMethod) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Payment Method:', innerLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPaymentMethodLabel(transaction.paymentMethod), innerRight, y, { align: 'right' });
    y += 5.5;
  }

  // Partial payment breakdown
  if (statusText === 'Partial' || (transaction.unpaidAmount && Number(transaction.unpaidAmount) > 0)) {
    const unpaidVal = Number(transaction.unpaidAmount || (totalAmountVal - paidAmountVal));
    if (paidAmountVal > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Paid Amount:', innerLeft, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(formatCurrencyRs(paidAmountVal), innerRight, y, { align: 'right' });
      y += 5;
    }
    if (unpaidVal > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Balance Due:', innerLeft, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(formatCurrencyRs(unpaidVal), innerRight, y, { align: 'right' });
      y += 5;
    }
  }

  // Notes
  if (transaction.notes) {
    y += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const notesLines = doc.splitTextToSize(`Note: ${transaction.notes}`, innerRight - innerLeft);
    doc.text(notesLines, innerLeft, y);
    y += notesLines.length * 4.5;
  }

  // Void Reason
  if (transaction.voided && transaction.voidReason) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    const voidLines = doc.splitTextToSize(`Void Reason: ${transaction.voidReason}`, innerRight - innerLeft);
    doc.text(voidLines, innerLeft, y);
    y += voidLines.length * 4.5;
  }

  // Cylinder History / Holding Section
  if (cylinderStats && cylinderStats.size > 0) {
    const historyData: any[] = [];
    let hasAnyBuyback = false;

    cylinderStats.forEach(stats => {
      if (stats.buybackWeight > 0 || stats.buybackCredit > 0) {
        hasAnyBuyback = true;
      }
    });

    cylinderStats.forEach((stats, type) => {
      if (stats.delivered > 0 || stats.returned > 0 || stats.buyback > 0 || stats.held !== 0) {
        const typeName = formatB2bVariantKeyForReport(type, cylinderTypeMap);
        const row = [
          typeName,
          stats.delivered.toString(),
          stats.returned.toString()
        ];

        if (hasAnyBuyback) {
          row.push(stats.buybackWeight > 0 ? `${stats.buybackWeight.toFixed(1)}kg` : '-');
        }

        row.push(stats.held.toString());
        historyData.push(row);
      }
    });

    if (historyData.length > 0) {
      checkPageBreak(25);
      y += 2;
      drawDashedLine(innerLeft, y, innerRight);
      y += 5.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Cylinder History / Holding:', innerLeft, y);
      y += 3.5;

      const historyHeader = ['Type', 'Delivered', 'Returned'];
      if (hasAnyBuyback) {
        historyHeader.push('Buyback Gas');
      }
      historyHeader.push('Holding');

      const innerWidth = innerRight - innerLeft;
      const columnStyles: any = hasAnyBuyback ? {
        0: { halign: 'left', cellWidth: innerWidth * 0.38 },
        1: { halign: 'center', cellWidth: innerWidth * 0.15 },
        2: { halign: 'center', cellWidth: innerWidth * 0.15 },
        3: { halign: 'center', cellWidth: innerWidth * 0.17 },
        4: { halign: 'center', cellWidth: innerWidth * 0.15, fontStyle: 'bold', textColor: [243, 101, 35] }
      } : {
        0: { halign: 'left', cellWidth: innerWidth * 0.46 },
        1: { halign: 'center', cellWidth: innerWidth * 0.18 },
        2: { halign: 'center', cellWidth: innerWidth * 0.18 },
        3: { halign: 'center', cellWidth: innerWidth * 0.18, fontStyle: 'bold', textColor: [243, 101, 35] }
      };

      autoTable(doc, {
        startY: y,
        head: [historyHeader],
        body: historyData,
        theme: 'plain',
        tableWidth: innerWidth,
        margin: { left: innerLeft, right: pageWidth - innerRight },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
          halign: 'center'
        },
        columnStyles: columnStyles,
        styles: {
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        }
      });

      y = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  y += 2;
  drawDashedLine(innerLeft, y, innerRight);
  y += 7;

  // Tagline & Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(243, 101, 35); // Flame orange
  doc.text('GAS RIGHT TO YOUR DOORSTEP', pageWidth / 2, y, { align: 'center' });
  y += 5;

  drawZigzag(receiptX, y, receiptWidth, -1);

  // Add Footer to all pages
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
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { transactionId } = await params;

    const transaction = await prisma.b2BTransaction.findFirst({
      where: { id: transactionId, ...regionScopedWhere(regionId) },
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

    await adoptLegacyB2bCustomerIfNeeded(transaction.customerId, regionId);

    // Get all transactions for this customer up to this transaction to calculate holding (region-scoped, active only)
    const allTransactions = await prisma.b2BTransaction.findMany({
      where: {
        customerId: transaction.customerId,
        voided: false,
        createdAt: {
          lte: transaction.createdAt
        },
        ...regionScopedWhere(regionId),
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Build cylinder stats
    const cylinderStats = new Map<string, { delivered: number, returned: number, buyback: number, held: number, buybackWeight: number, buybackCredit: number }>();

    allTransactions.forEach(t => {
      const items = t.items || [];
      const { saleItems, buybackItems, returnItems } = categorizeItems(
        items,
        t.transactionType,
        isOpeningDuesTransaction(t),
        t,
      );

      saleItems.forEach((item: any) => {
        const vk = b2bItemVariantKey(item);
        if (!vk) return;
        const current = cylinderStats.get(vk) || { delivered: 0, returned: 0, buyback: 0, held: 0, buybackWeight: 0, buybackCredit: 0 };
        const qty = item.quantity ? Number(item.quantity) : 0;
        current.delivered += qty;
        current.held += qty;
        cylinderStats.set(vk, current);
      });

      buybackItems.forEach((item: any) => {
        const vk = b2bItemVariantKey(item);
        if (!vk) return;
        const current = cylinderStats.get(vk) || { delivered: 0, returned: 0, buyback: 0, held: 0, buybackWeight: 0, buybackCredit: 0 };
        const qty = item.quantity ? Number(item.quantity) : 0;
        current.returned += qty;
        current.buyback += qty;
        current.held -= qty;
        if (item.remainingKg) {
          current.buybackWeight += Number(item.remainingKg) * qty;
        }
        if (item.totalPrice) {
          current.buybackCredit += Number(item.totalPrice);
        }
        cylinderStats.set(vk, current);
      });

      returnItems.forEach((item: any) => {
        const vk = b2bItemVariantKey(item);
        if (!vk) return;
        const current = cylinderStats.get(vk) || { delivered: 0, returned: 0, buyback: 0, held: 0, buybackWeight: 0, buybackCredit: 0 };
        const qty = item.quantity ? Number(item.quantity) : 0;
        current.returned += qty;
        current.held -= qty;
        cylinderStats.set(vk, current);
      });
    });

    // Build cylinder type mapping for proper display names
    const uniqueCylinderTypes = new Set<string>();
    allTransactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        if (item.cylinderType) {
          uniqueCylinderTypes.add(item.cylinderType);
        }
      });
    });

    const cylinderTypeMap = new Map<string, { typeName: string | null, capacity: number | null }>();

    if (uniqueCylinderTypes.size > 0) {
      // Query cylinders to get typeName and capacity for each cylinderType (region-scoped)
      const cylinders = await prisma.cylinder.findMany({
        where: {
          cylinderType: { in: Array.from(uniqueCylinderTypes) },
          ...regionScopedWhere(regionId),
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
    const doc = await generatePDF(transaction, transaction.customer, cylinderTypeMap, cylinderStats);
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
