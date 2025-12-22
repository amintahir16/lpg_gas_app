import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

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

// Helper function to get cylinder type display name - uses dynamic utility
function getCylinderTypeDisplay(type: string | null): string {
  if (!type) return 'N/A';
  // Use dynamic utility function - works for any cylinder type
  return getCylinderTypeDisplayName(type);
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
  doc.text(`Contact: ${customer.contactPerson}`, margin + 5, yPosition + 6);
  doc.text(`Phone: ${customer.phone}`, margin + 5, yPosition + 12);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, margin + 5, yPosition + 18);
    yPosition += 6;
  }
  if (customer.address) {
    // Handle long addresses with text wrapping
    const addressLines = doc.splitTextToSize(`Address: ${customer.address}`, contentWidth - 10);
    doc.text(addressLines, margin + 5, yPosition + 18);
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
  
  // Transaction Type and Payment Status (removed redundant Total Amount here)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transaction Type: ${transaction.transactionType}`, margin + 5, yPosition);
  
  if (transaction.paymentStatus) {
    const statusText = transaction.paymentStatus === 'FULLY_PAID' ? 'Paid' : 
                      transaction.paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid';
    doc.text(`Payment Status: ${statusText}`, margin + 5, yPosition + 6);
    yPosition += 6;
  }
  
  yPosition += 8;
  
  // Items Table with proper column widths
  const isBuyback = transaction.transactionType === 'BUYBACK';
  
  const tableData = transaction.items.map((item: any) => {
    // Determine item name: use cylinder display name if cylinderType exists, otherwise use productName
    let itemName = 'N/A';
    if (item.cylinderType) {
      itemName = getCylinderTypeDisplay(item.cylinderType);
    } else if (item.productName) {
      itemName = item.productName;
    }
    
    if (isBuyback) {
      // For buyback transactions, include remaining gas and buyback rate
      const remainingKg = item.remainingKg ? Number(item.remainingKg).toFixed(1) : '-';
      const buybackRate = item.buybackRate ? ((item.buybackRate * 100).toFixed(1) + '%') : '-';
      const price = item.buybackPricePerItem ? formatCurrency(Number(item.buybackPricePerItem)) : formatCurrency(Number(item.pricePerItem));
      
      return [
        itemName,
        Number(item.quantity).toString(),
        remainingKg + ' kg',
        buybackRate,
        price,
        formatCurrency(Number(item.totalPrice))
      ];
    } else {
      // For other transaction types, use standard format
      return [
        itemName,
        Number(item.quantity).toString(),
        formatCurrency(Number(item.pricePerItem)),
        formatCurrency(Number(item.totalPrice))
      ];
    }
  });
  
  // Calculate proper column widths based on content width (in mm)
  let itemWidth, quantityWidth, priceWidth, totalWidth;
  let headers: string[];
  
  if (isBuyback) {
    // Item: 30%, Quantity: 10%, Remaining Gas: 12%, Buyback Rate: 12%, Buyback Price: 18%, Total: 18%
    itemWidth = contentWidth * 0.30;
    quantityWidth = contentWidth * 0.10;
    const remainingWidth = contentWidth * 0.12;
    const rateWidth = contentWidth * 0.12;
    priceWidth = contentWidth * 0.18;
    totalWidth = contentWidth * 0.18;
    headers = ['Item', 'Quantity', 'Remaining Gas', 'Buyback Rate', 'Buyback Price', 'Total Price'];
  } else {
    // Item: 50%, Quantity: 15%, Price Per Item: 17.5%, Total Price: 17.5%
    itemWidth = contentWidth * 0.50;
    quantityWidth = contentWidth * 0.15;
    priceWidth = contentWidth * 0.175;
    totalWidth = contentWidth * 0.175;
    headers = ['Item', 'Quantity', 'Price Per Item', 'Total Price'];
  }
  
  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: tableData,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: isBuyback ? {
      0: { cellWidth: itemWidth, halign: 'left' }, // Item name left-aligned
      1: { cellWidth: quantityWidth, halign: 'center' }, // Quantity centered
      2: { cellWidth: contentWidth * 0.12, halign: 'center' }, // Remaining Gas centered
      3: { cellWidth: contentWidth * 0.12, halign: 'center' }, // Buyback Rate centered
      4: { cellWidth: priceWidth, halign: 'right' }, // Buyback Price right-aligned
      5: { cellWidth: totalWidth, halign: 'right' } // Total right-aligned
    } : {
      0: { cellWidth: itemWidth, halign: 'left' }, // Item name left-aligned
      1: { cellWidth: quantityWidth, halign: 'center' }, // Quantity centered
      2: { cellWidth: priceWidth, halign: 'right' }, // Price right-aligned
      3: { cellWidth: totalWidth, halign: 'right' } // Total right-aligned
    },
    styles: { 
      fontSize: 10, 
      cellPadding: 4,
      overflow: 'visible'
    },
    alternateRowStyles: { fillColor: [248, 249, 250] }
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
  
  doc.setFillColor(155, 89, 182);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin + 5, yPosition + 6);
  
  const summaryY = yPosition + 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Right-align all summary values for professional appearance
  const rightX = pageWidth - margin - 5;
  
  // Total Amount
  doc.setFont('helvetica', 'bold');
  const totalAmountText = `Total Amount:`;
  const totalAmountValue = formatCurrency(Number(transaction.totalAmount));
  doc.text(totalAmountText, margin + 5, summaryY);
  doc.text(totalAmountValue, rightX, summaryY, { align: 'right' });
  
  // Payment details
  // BUYBACK transactions are always considered paid (credit to customer)
  if (transaction.transactionType === 'BUYBACK') {
    doc.setFont('helvetica', 'normal');
    doc.text('Status: Paid', margin + 5, summaryY + 8);
  } else if (transaction.paymentStatus === 'FULLY_PAID' && transaction.paidAmount) {
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Received:', margin + 5, summaryY + 8);
    doc.text(formatCurrency(Number(transaction.paidAmount)), rightX, summaryY + 8, { align: 'right' });
    doc.text('Status: Fully Paid', margin + 5, summaryY + 14);
  } else if (transaction.paymentStatus === 'PARTIAL' && transaction.paidAmount && transaction.unpaidAmount) {
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Received:', margin + 5, summaryY + 8);
    doc.text(formatCurrency(Number(transaction.paidAmount)), rightX, summaryY + 8, { align: 'right' });
    doc.text('Remaining:', margin + 5, summaryY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red for unpaid amount
    doc.text(formatCurrency(Number(transaction.unpaidAmount)), rightX, summaryY + 14, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('Status: Unpaid', margin + 5, summaryY + 8);
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
