import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Dynamic import to ensure proper loading in Next.js API routes
async function generatePDF(customer: any, transactions: any[], startDate: string | null, endDate: string | null) {
  // Import jsPDF and jspdf-autotable
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Transaction Report', 14, 20);
  
  doc.setFontSize(10);
  doc.text('Customer Information:', 14, 30);
  doc.text(`Name: ${customer.name}`, 14, 35);
  doc.text(`Phone: ${customer.phone}`, 14, 40);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 14, 45);
  }
  doc.text(`Address: ${customer.address}, ${customer.city}`, 14, 50);
  
  // Date range
  let startY = 55;
  if (startDate || endDate) {
    let dateRange = 'Period: ';
    if (startDate && endDate) {
      dateRange += `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    } else if (startDate) {
      dateRange += `From ${new Date(startDate).toLocaleDateString()}`;
    } else if (endDate) {
      dateRange += `Up to ${new Date(endDate).toLocaleDateString()}`;
    }
    doc.text(dateRange, 14, startY);
    startY += 5;
  }
  doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, startY);
  startY += 5;

  // Prepare table data
  const tableData = transactions.map((transaction) => {
    const date = new Date(transaction.date).toLocaleDateString();
    const time = new Date(transaction.time).toLocaleTimeString();
    
    // Build items description
    const items = [];
    transaction.gasItems.forEach(item => {
      const cylinderType = item.cylinderType.replace(/_/g, ' ').replace('KG', 'kg');
      items.push(`${cylinderType} x${item.quantity}`);
    });
    transaction.securityItems.forEach(item => {
      items.push(`Security x${item.quantity}${item.isReturn ? ' (Return)' : ''}`);
    });
    transaction.accessoryItems.forEach(item => {
      items.push(`${item.productName} x${item.quantity}`);
    });
    
    return [
      date,
      time,
      transaction.billSno,
      items.join(', ') || '-',
      `Rs ${Number(transaction.finalAmount).toFixed(2)}`,
      transaction.paymentMethod || 'CASH'
    ];
  });

  // Add table - use autoTable as a function, not a method
  autoTable(doc, {
    startY: startY + 5,
    head: [['Date', 'Time', 'Bill No.', 'Items', 'Amount', 'Payment']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 }
  });

  // Add summary
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 5;
  doc.setFontSize(10);
  doc.text(`Total Transactions: ${transactions.length}`, 14, finalY + 10);
  
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.finalAmount), 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Amount: Rs ${totalAmount.toFixed(2)}`, 14, finalY + 15);

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

    // Generate PDF
    const doc = await generatePDF(customer, transactions, startDate, endDate);

    // Generate PDF buffer
    const pdfBlob = doc.output('blob');
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="B2C-Transaction-Report-${customer.name}-${Date.now()}.pdf"`,
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
