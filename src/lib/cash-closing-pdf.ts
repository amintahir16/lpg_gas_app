import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ClosingPdfWalletRow = {
  walletLabel: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
};

export type ClosingPdfSourceRow = {
  sourceLabel: string;
  direction: string;
  count: number;
  amount: number;
};

export type ClosingPdfEntryRow = {
  dateLabel: string;
  timeLabel: string;
  walletLabel: string;
  direction: string;
  amount: number;
  sourceLabel: string;
  partyName: string;
  details: string;
  recordedBy: string | null;
};

export type ClosingPdfInput = {
  branchName: string | null;
  periodLabel: string;
  generatedAt: string;
  totals: {
    totalIn: number;
    totalOut: number;
    netChange: number;
    openingTotal: number;
    closingTotal: number;
    recordCount: number;
  };
  byWallet: ClosingPdfWalletRow[];
  bySource: ClosingPdfSourceRow[];
  entries: ClosingPdfEntryRow[];
};

function formatRs(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatGeneratedAt(iso: string): string {
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

/** Build organized Cash Closing Report PDF. Returns a Blob. */
export function buildCashClosingPdf(input: ClosingPdfInput): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Cash Closing Report', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    [
      input.branchName ? `Branch: ${input.branchName}` : null,
      `Period: ${input.periodLabel}`,
      `Generated: ${formatGeneratedAt(input.generatedAt)}`,
    ]
      .filter(Boolean)
      .join('   |   '),
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Period Totals', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Opening', 'Total In', 'Total Out', 'Net Change', 'Closing', 'Records']],
    body: [[
      formatRs(input.totals.openingTotal),
      formatRs(input.totals.totalIn),
      formatRs(input.totals.totalOut),
      formatRs(input.totals.netChange),
      formatRs(input.totals.closingTotal),
      String(input.totals.recordCount),
    ]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Wallet Closing', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Wallet', 'Opening', 'In', 'Out', 'Closing']],
    body: input.byWallet.map((w) => [
      w.walletLabel,
      formatRs(w.opening),
      formatRs(w.totalIn),
      formatRs(w.totalOut),
      formatRs(w.closing),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    margin: { left: 14, right: 14 },
  });
  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

  if (input.bySource.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Breakdown by Source', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Source', 'Direction', 'Count', 'Amount (Rs)']],
      body: input.bySource.map((s) => [
        s.sourceLabel,
        s.direction,
        String(s.count),
        formatRs(s.amount),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Transaction Ledger', 14, y);
  y += 2;

  // Match full usable width of tables above (A4 landscape − 14mm side margins)
  const tableWidth = pageWidth - 28;

  autoTable(doc, {
    startY: y,
    tableWidth,
    head: [['Date', 'Time', 'Wallet', 'Dir', 'Amount', 'Source', 'Party', 'Details', 'By']],
    body:
      input.entries.length > 0
        ? input.entries.map((e) => [
            e.dateLabel,
            e.timeLabel,
            e.walletLabel,
            e.direction,
            formatRs(e.amount),
            e.sourceLabel,
            e.partyName,
            e.details || '—',
            e.recordedBy || '—',
          ])
        : [['—', '—', '—', '—', '—', '—', 'No transactions', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 40 },
      6: { cellWidth: 36 },
      7: { cellWidth: 45 },
      8: { cellWidth: 28 },
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

export function closingPdfFileName(periodLabel: string): string {
  const safe = periodLabel
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'period';
  return `cash-closing-${safe}.pdf`;
}
