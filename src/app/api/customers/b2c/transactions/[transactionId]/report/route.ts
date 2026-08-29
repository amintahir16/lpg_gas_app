import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { logoBase64 } from '@/lib/logoBase64';
import { formatPaymentMethodLabel } from '@/lib/payment-methods';

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
  const jsPDF = jsPDFModule.default;
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

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Item:', innerLeft, y);
  doc.text('Amount', innerRight, y, { align: 'right' });
  y += 5.5;

  doc.setFontSize(9);

  // 1. Gas Items
  if (transaction.gasItems && transaction.gasItems.length > 0) {
    transaction.gasItems.forEach((item: any) => {
      checkPageBreak(8);
      const typeDisplay = getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap);
      const qty = Number(item.quantity) || 1;
      const label = `${qty}x ${typeDisplay}`;
      const totalPrice = formatCurrencyRs(Number(item.totalPrice));

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
      doc.text(itemLines, innerLeft, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(totalPrice, innerRight, y, { align: 'right' });
      y += Math.max(itemLines.length * 4.5, 5.5);
    });
  }

  // 2. Security Deposits & Returns
  if (transaction.securityItems && transaction.securityItems.length > 0) {
    transaction.securityItems.forEach((item: any) => {
      checkPageBreak(8);
      const typeDisplay = getCylinderTypeDisplay(item.cylinderType, cylinderTypeMap);
      const qty = Number(item.quantity) || 1;
      const isReturn = item.isReturn;
      const label = isReturn
        ? `${qty}x ${typeDisplay} (Security Refund)`
        : `${qty}x ${typeDisplay} (Security Deposit)`;
      const priceText = isReturn
        ? `-${formatCurrencyRs(Number(item.totalPrice))}`
        : formatCurrencyRs(Number(item.totalPrice));

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(isReturn ? 194 : 51, isReturn ? 65 : 65, isReturn ? 12 : 85);
      const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
      doc.text(itemLines, innerLeft, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isReturn ? 194 : 15, isReturn ? 65 : 23, isReturn ? 12 : 42);
      doc.text(priceText, innerRight, y, { align: 'right' });
      y += Math.max(itemLines.length * 4.5, 5.5);
    });
  }

  // 3. Accessory Items
  if (transaction.accessoryItems && transaction.accessoryItems.length > 0) {
    transaction.accessoryItems.forEach((item: any) => {
      checkPageBreak(8);
      const qty = Number(item.quantity) || 1;
      const label = `${qty}x ${item.productName || 'Accessory'}`;
      const totalPrice = formatCurrencyRs(Number(item.totalPrice));

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const itemLines = doc.splitTextToSize(label, innerRight - innerLeft - 35);
      doc.text(itemLines, innerLeft, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(totalPrice, innerRight, y, { align: 'right' });
      y += Math.max(itemLines.length * 4.5, 5.5);
    });
  }

  // 4. Delivery Charges
  const deliveryCharges = Number(transaction.deliveryCharges) || 0;
  if (deliveryCharges > 0) {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Delivery Charges', innerLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyRs(deliveryCharges), innerRight, y, { align: 'right' });
    y += 5.5;
  }

  y += 2;
  drawDashedLine(innerLeft, y, innerRight);
  y += 6;

  // Net Total
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Total:', innerLeft, y);
  const finalAmountVal = Number(transaction.finalAmount) || Number(transaction.totalAmount) || 0;
  doc.text(formatCurrency(finalAmountVal), innerRight, y, { align: 'right' });
  y += 7;

  // Status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Status:', innerLeft, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Green
  doc.text('Paid', innerRight, y, { align: 'right' });
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

  y += 3;
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

    const transaction = await prisma.b2CTransaction.findFirst({
      where: { id: transactionId, ...regionScopedWhere(regionId) },
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
      // Query cylinders to get typeName and capacity (region-scoped)
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
