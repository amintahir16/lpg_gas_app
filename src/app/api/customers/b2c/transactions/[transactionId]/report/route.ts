import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

// Helper function to get cylinder type display name
function getCylinderTypeDisplay(type: string | null): string {
  if (!type) return 'N/A';
  const typeMap: { [key: string]: string } = {
    'DOMESTIC_11_8KG': 'Domestic (11.8kg)',
    'STANDARD_15KG': 'Standard (15kg)',
    'COMMERCIAL_45_4KG': 'Commercial (45.4kg)'
  };
  return typeMap[type] || type.replace(/_/g, ' ');
}

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(transaction: any, customer: any) {
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
  
  // Transaction Details
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
  
  // Transaction info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method: ${transaction.paymentMethod}`, margin + 5, yPosition);
  
  if (transaction.deliveryCharges > 0) {
    doc.text(`Delivery Charges: ${formatCurrency(Number(transaction.deliveryCharges))}`, margin + 5, yPosition + 6);
    yPosition += 6;
  }
  
  yPosition += 8;
  
  // Items Table - Combine gas, security, and accessories
  const tableData: any[] = [];
  
  // Gas Items
  if (transaction.gasItems) {
    transaction.gasItems.forEach((item: any) => {
      tableData.push([
        getCylinderTypeDisplay(item.cylinderType),
        Number(item.quantity).toString(),
        formatCurrency(Number(item.pricePerItem)),
        formatCurrency(Number(item.totalPrice))
      ]);
    });
  }
  
  // Security Items
  if (transaction.securityItems) {
    transaction.securityItems.forEach((item: any) => {
      tableData.push([
        `Security - ${getCylinderTypeDisplay(item.cylinderType)}${item.isReturn ? ' (Return)' : ''}`,
        Number(item.quantity).toString(),
        formatCurrency(Number(item.pricePerItem)),
        formatCurrency(Number(item.totalPrice))
      ]);
    });
  }
  
  // Accessory Items
  if (transaction.accessoryItems) {
    transaction.accessoryItems.forEach((item: any) => {
      tableData.push([
        item.productName || 'N/A',
        Number(item.quantity).toString(),
        formatCurrency(Number(item.pricePerItem)),
        formatCurrency(Number(item.totalPrice))
      ]);
    });
  }
  
  // Calculate proper column widths based on content width (in mm)
  const itemWidth = contentWidth * 0.50;
  const quantityWidth = contentWidth * 0.15;
  const priceWidth = contentWidth * 0.175;
  const totalWidth = contentWidth * 0.175;
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Quantity', 'Price Per Item', 'Total Price']],
    body: tableData,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { 
      fillColor: [52, 73, 94], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: itemWidth, halign: 'left' },
      1: { cellWidth: quantityWidth, halign: 'center' },
      2: { cellWidth: priceWidth, halign: 'right' },
      3: { cellWidth: totalWidth, halign: 'right' }
    },
    styles: { 
      fontSize: 10, 
      cellPadding: 4,
      overflow: 'visible'
    },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });
  
  // Summary Section
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Check if we need a new page for summary
  if (finalY > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition = finalY;
  }
  
  doc.setFillColor(102, 51, 153);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin + 5, yPosition + 6);
  
  const summaryY = yPosition + 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Right-align all summary values
  const rightX = pageWidth - margin - 5;
  
  // Total Amount
  doc.setFont('helvetica', 'bold');
  const totalAmountText = `Total Amount:`;
  const totalAmountValue = formatCurrency(Number(transaction.totalAmount));
  doc.text(totalAmountText, margin + 5, summaryY);
  doc.text(totalAmountValue, rightX, summaryY, { align: 'right' });
  
  if (transaction.deliveryCharges > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Delivery Charges:', margin + 5, summaryY + 8);
    doc.text(formatCurrency(Number(transaction.deliveryCharges)), rightX, summaryY + 8, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Final Amount:', margin + 5, summaryY + 14);
    doc.text(formatCurrency(Number(transaction.finalAmount)), rightX, summaryY + 14, { align: 'right' });
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

    // Generate PDF
    const doc = await generatePDF(transaction, transaction.customer);
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

