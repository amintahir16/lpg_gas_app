import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type SalesActivityPdfRow = {
  title: string;
  customerName: string;
  billSno?: string | null;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentStatus: string;
  recordedBy: string | null;
  time: string;
  description: string;
};

export type SalesActivitiesPdfInput = {
  periodLabel: string;
  branchName?: string | null;
  generatedAt?: string;
  activities: SalesActivityPdfRow[];
};

function formatRs(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'FULLY_PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Partial';
    case 'UNPAID':
      return 'Unpaid';
    case 'RECEIVED':
      return 'Received';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function buildSalesActivitiesPdf(input: SalesActivitiesPdfInput): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Activities Report', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generated = formatWhen(input.generatedAt || new Date().toISOString());
  doc.text(
    [
      input.branchName ? `Branch: ${input.branchName}` : null,
      `Period: ${input.periodLabel}`,
      `Generated: ${generated}`,
      `Records: ${input.activities.length}`,
    ]
      .filter(Boolean)
      .join('   |   '),
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 8;

  // Sales Total = B2B/B2C sales + B2C security retention (matches Period Revenue sales side).
  // Security deposit holds remain excluded. Payment rows are listed separately and
  // must not inflate Sales Total / footer (avoids sale+payment double-count).
  const isRevenueRow = (a: SalesActivityPdfRow) =>
    a.title === 'B2B Sale' ||
    a.title.startsWith('B2C');
  const revenueRows = input.activities.filter(isRevenueRow);
  const totalSales = revenueRows.reduce((s, a) => s + a.totalAmount, 0);
  const totalPaidOnSales = revenueRows.reduce((s, a) => s + a.paidAmount, 0);
  const totalUnpaidOnSales = revenueRows.reduce((s, a) => s + a.unpaidAmount, 0);
  const totalPayments = input.activities
    .filter((a) => a.paymentStatus === 'RECEIVED' || a.title === 'B2B Payment')
    .reduce((s, a) => s + a.totalAmount, 0);

  autoTable(doc, {
    startY: y,
    head: [['Sales Total (incl. retention)', 'Payments Received', 'Paid on Sales', 'Still Unpaid']],
    body: [[
      formatRs(totalSales),
      formatRs(totalPayments),
      formatRs(totalPaidOnSales),
      formatRs(totalUnpaidOnSales),
    ]],
    styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, halign: 'center' },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 4;

  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(
    'Paid/Unpaid on sales include later B2B direct payments applied oldest-first. Payment rows are cash-in only (not added to Sales Total).',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  doc.setTextColor(0);
  y += 6;

  const columnTotal = revenueRows.reduce(
    (acc, a) => {
      acc.total += a.totalAmount || 0;
      acc.paid += a.paidAmount || 0;
      acc.unpaid += a.unpaidAmount || 0;
      return acc;
    },
    { total: 0, paid: 0, unpaid: 0 }
  );

  autoTable(doc, {
    startY: y,
    tableWidth: pageWidth - 28,
    head: [[
      'Type',
      'Customer',
      'Bill',
      'Total',
      'Paid',
      'Unpaid',
      'Status',
      'By',
      'When',
      'Details',
    ]],
    body:
      input.activities.length > 0
        ? input.activities.map((a) => [
            a.title,
            a.customerName,
            a.billSno || '—',
            formatRs(a.totalAmount),
            formatRs(a.paidAmount),
            formatRs(a.unpaidAmount),
            statusLabel(a.paymentStatus),
            a.recordedBy || '—',
            formatWhen(a.time),
            (a.description || '—').slice(0, 60),
          ])
        : [['—', '—', '—', '—', '—', '—', '—', '—', '—', 'No activities']],
    foot:
      input.activities.length > 0
        ? [[
            'Sales total',
            '',
            '',
            formatRs(columnTotal.total),
            formatRs(columnTotal.paid),
            formatRs(columnTotal.unpaid),
            '',
            '',
            '',
            '',
          ]]
        : undefined,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      halign: 'center',
      valign: 'middle',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7,
    },
    showFoot: 'lastPage',
    columnStyles: {
      0: { cellWidth: 28, halign: 'left' },
      1: { cellWidth: 32, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' }, // Bill
      3: { cellWidth: 22, halign: 'center' }, // Total
      4: { cellWidth: 22, halign: 'center' }, // Paid
      5: { cellWidth: 22, halign: 'center' }, // Unpaid
      6: { cellWidth: 20, halign: 'center' }, // Status
      7: { cellWidth: 28, halign: 'left' },
      8: { cellWidth: 34, halign: 'left' },
      9: { cellWidth: 45, halign: 'left' },
    },
    // Keep footer number columns centered to match body
    didParseCell: (data) => {
      if (data.section === 'foot' && [2, 3, 4, 5].includes(data.column.index)) {
        data.cell.styles.halign = 'center';
      }
      if (data.section === 'head') {
        data.cell.styles.halign = 'center';
      }
    },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

export function salesActivitiesPdfFileName(periodLabel: string): string {
  const safe = periodLabel
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'period';
  return `sales-activities-${safe}.pdf`;
}
