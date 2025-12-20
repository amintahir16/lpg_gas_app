"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, DocumentArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface VendorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  vendorId: string;
  purchaseEntries: any[];
  paymentHistory: any[];
}

export default function VendorExportModal({
  isOpen,
  onClose,
  vendorName,
  vendorId,
  purchaseEntries,
  paymentHistory
}: VendorExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportType, setExportType] = useState<'purchases' | 'payments' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [vendorCategorySlug, setVendorCategorySlug] = useState<string | null>(null);

  // Fetch all data when modal opens
  const fetchAllData = async () => {
    try {
      // Fetch all payments
      const paymentsResponse = await fetch(`/api/vendors/${vendorId}/direct-payments?t=${Date.now()}`);
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        console.log('Fetched payments for export:', paymentsData.payments?.length || 0, 'payments');
        setAllPayments(paymentsData.payments || []);
      }

      // Fetch all purchases and vendor category
      const purchasesResponse = await fetch(`/api/vendors/${vendorId}?t=${Date.now()}`);
      if (purchasesResponse.ok) {
        const vendorData = await purchasesResponse.json();
        console.log('Fetched purchases for export:', vendorData.purchase_entries?.length || 0, 'purchases');
        setAllPurchases(vendorData.purchase_entries || []);
        // Store vendor category slug to determine if we need to show category column
        setVendorCategorySlug(vendorData.vendor?.category?.slug || null);
      }
    } catch (error) {
      console.error('Error fetching data for export:', error);
    }
  };

  // Fetch data when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen, vendorId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format currency for PDF tables (without currency symbol to prevent line breaks)
  const formatCurrencyForPDF = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filterDataByDateRange = (data: any[]) => {
    if (!startDate || !endDate) {
      console.log('No date range specified, returning all data:', data.length, 'items');
      return data;
    }
    
    // Set start date to beginning of day (00:00:00.000)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Set end date to end of day (23:59:59.999)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filtered = data.filter(item => {
      const itemDateStr = item.purchaseDate || item.paymentDate || item.createdAt;
      if (!itemDateStr) return false;
      
      // Create date and normalize to start of day for comparison
      const itemDate = new Date(itemDateStr);
      // Compare dates by normalizing to start of day
      const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return itemDateOnly >= startDateOnly && itemDateOnly <= endDateOnly;
    });
    
    console.log('Date filtering:', {
      startDate,
      endDate,
      start: start.toISOString(),
      end: end.toISOString(),
      originalCount: data.length,
      filteredCount: filtered.length,
      sampleItemDates: data.slice(0, 3).map(item => ({
        date: item.purchaseDate || item.paymentDate || item.createdAt,
        included: filtered.includes(item)
      }))
    });
    
    return filtered;
  };

  // Get data to use for export
  const getExportData = () => {
    // Always use freshly fetched data if available, otherwise use props
    const purchases = allPurchases.length > 0 ? allPurchases : purchaseEntries;
    const payments = allPayments.length > 0 ? allPayments : paymentHistory;
    
    console.log('Export data sources:', {
      usingAllPurchases: allPurchases.length > 0,
      usingAllPayments: allPayments.length > 0,
      purchasesCount: purchases.length,
      paymentsCount: payments.length
    });
    
    return {
      purchases: filterDataByDateRange(purchases),
      payments: filterDataByDateRange(payments)
    };
  };

  const generatePDF = async () => {
    setLoading(true);
    
    try {
      const { purchases, payments } = getExportData();
      
      console.log('PDF Export Data:', {
        exportType,
        purchasesCount: purchases.length,
        paymentsCount: payments.length,
        allPurchasesCount: allPurchases.length,
        allPaymentsCount: allPayments.length
      });
      
      // Check if we have data to export
      const hasPurchases = exportType === 'purchases' || exportType === 'both';
      const hasPayments = exportType === 'payments' || exportType === 'both';
      
      if (hasPurchases && purchases.length === 0) {
        alert('No purchase entries found for the selected date range.');
        setLoading(false);
        return;
      }
      
      if (hasPayments && payments.length === 0) {
        alert('No payment history found for the selected date range.');
        setLoading(false);
        return;
      }
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
      doc.text('VENDOR FINANCIAL REPORT', pageWidth / 2, 22, { align: 'center' });
      
      // Report Details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Vendor: ${vendorName}`, pageWidth / 2, 30, { align: 'center' });
      
      if (startDate && endDate) {
        doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 35, { align: 'center' });
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
      // Calculate total records based on export type
      let totalRecords = 0;
      if (exportType === 'purchases' || exportType === 'both') {
        totalRecords += purchases.length;
      }
      if (exportType === 'payments' || exportType === 'both') {
        totalRecords += payments.length;
      }
      doc.text(`Total Records: ${totalRecords}`, pageWidth - 50, 55);
      
      let yPosition = 80;
      
      // Purchase Entries Section
      if (exportType === 'purchases' || exportType === 'both') {
        if (purchases.length > 0) {
          // Section Header
          doc.setFillColor(52, 73, 94);
          doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('PURCHASE ENTRIES', 20, yPosition + 6);
          
          yPosition += 15;
          
          // Check if this is an accessories purchase vendor
          const isAccessoriesPurchase = vendorCategorySlug === 'accessories_purchase';
          
          // Build purchase data with conditional category column
          const purchaseData = purchases.map((purchase, index) => {
            const baseRow = [
              index + 1,
              purchase.invoiceNumber || 'N/A',
              formatDate(purchase.purchaseDate),
              purchase.itemName || 'N/A',
              purchase.quantity || 0,
              formatCurrencyForPDF(Number(purchase.unitPrice)),
              formatCurrencyForPDF(Number(purchase.totalPrice)),
              purchase.status || 'PENDING'
            ];
            
            // For accessories purchases, insert category column before Item (index 3)
            if (isAccessoriesPurchase) {
              const category = purchase.itemDescription || '-';
              baseRow.splice(3, 0, category); // Insert category at index 3, before Item
            }
            
            return baseRow;
          });
          
          // Add total row
          const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalPrice), 0);
          const totalRow: any[] = [
            '',
            '',
            '',
            '',
            '',
            'TOTAL:',
            formatCurrencyForPDF(totalPurchases),
            ''
          ];
          
          // For accessories purchases, add empty cell for category column
          if (isAccessoriesPurchase) {
            totalRow.splice(3, 0, ''); // Insert empty category cell at index 3
          }
          
          purchaseData.push(totalRow);
          
          // Build header row with conditional category column
          const headerRow = ['#', 'Invoice', 'Date', 'Item', 'Qty', 'Unit Price (Rs)', 'Total (Rs)', 'Status'];
          if (isAccessoriesPurchase) {
            headerRow.splice(3, 0, 'Category'); // Insert Category at index 3, before Item
          }
          
          // Build column styles with conditional category column
          // Column indices: 0=#, 1=Invoice, 2=Date, 3=Category(if accessories)/Item, 4=Item(if accessories)/Qty, etc.
          const columnStyles: any = {};
          
          if (isAccessoriesPurchase) {
            // With Category column: #, Invoice, Date, Category, Item, Qty, Unit Price, Total, Status
            // Balanced widths to maintain professional alignment - total ~180 (same as non-accessories)
            columnStyles[0] = { halign: 'center', cellWidth: 12 }; // #
            columnStyles[1] = { cellWidth: 24 }; // Invoice
            columnStyles[2] = { cellWidth: 20 }; // Date
            columnStyles[3] = { cellWidth: 20 }; // Category
            columnStyles[4] = { cellWidth: 28 }; // Item
            columnStyles[5] = { halign: 'center', cellWidth: 12 }; // Qty
            columnStyles[6] = { halign: 'right', cellWidth: 24, overflow: 'linebreak' }; // Unit Price
            columnStyles[7] = { halign: 'right', cellWidth: 24, overflow: 'linebreak' }; // Total
            columnStyles[8] = { halign: 'center', cellWidth: 16 }; // Status
          } else {
            // Without Category column: #, Invoice, Date, Item, Qty, Unit Price, Total, Status
            columnStyles[0] = { halign: 'center', cellWidth: 15 }; // #
            columnStyles[1] = { cellWidth: 25 }; // Invoice
            columnStyles[2] = { cellWidth: 20 }; // Date
            columnStyles[3] = { cellWidth: 35 }; // Item
            columnStyles[4] = { halign: 'center', cellWidth: 15 }; // Qty
            columnStyles[5] = { halign: 'right', cellWidth: 25, overflow: 'linebreak' }; // Unit Price
            columnStyles[6] = { halign: 'right', cellWidth: 25, overflow: 'linebreak' }; // Total
            columnStyles[7] = { halign: 'center', cellWidth: 20 }; // Status
          }
          
          autoTable(doc, {
            head: [headerRow],
            body: purchaseData,
            startY: yPosition,
            styles: { 
              fontSize: 9,
              cellPadding: 4,
              lineColor: [200, 200, 200],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [41, 128, 185],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [248, 249, 250] 
            },
            columnStyles: columnStyles,
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 25;
        }
      }
      
      // Payment History Section
      if (exportType === 'payments' || exportType === 'both') {
        if (payments.length > 0) {
          if (yPosition > pageHeight - 100) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Section Header
          doc.setFillColor(39, 174, 96);
          doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('PAYMENT HISTORY', 20, yPosition + 6);
          
          yPosition += 15;
          
          const paymentData = payments.map((payment, index) => [
            index + 1,
            formatDate(payment.paymentDate),
            payment.method || 'CASH',
            formatCurrencyForPDF(Number(payment.amount)),
            payment.reference || 'N/A',
            payment.status || 'COMPLETED',
            payment.description || 'N/A'
          ]);
          
          // Add total row
          const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          paymentData.push([
            '',
            '',
            'TOTAL:',
            formatCurrencyForPDF(totalPayments),
            '',
            '',
            ''
          ]);
          
          autoTable(doc, {
            head: [['#', 'Date', 'Method', 'Amount (Rs)', 'Reference', 'Status', 'Description']],
            body: paymentData,
            startY: yPosition,
            styles: { 
              fontSize: 9,
              cellPadding: 4,
              lineColor: [200, 200, 200],
              lineWidth: 0.5
            },
            headStyles: { 
              fillColor: [39, 174, 96],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10
            },
            alternateRowStyles: { 
              fillColor: [248, 249, 250] 
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 15 },
              1: { cellWidth: 25 },
              2: { halign: 'center', cellWidth: 20 },
              3: { halign: 'right', cellWidth: 30, overflow: 'linebreak' },
              4: { cellWidth: 30 },
              5: { halign: 'center', cellWidth: 20 },
              6: { cellWidth: 40 }
            },
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 25;
        }
      }
      
      // Footer
      yPosition += 20;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('This report was generated automatically by Flamora Gas Management System', pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Page 1 of 1 | Confidential Document`, pageWidth / 2, yPosition + 5, { align: 'center' });
      
      // Save PDF
      const fileName = `${vendorName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleExport = async () => {
    await generatePDF();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <div className="p-3 bg-blue-100 rounded-full">
              <DocumentArrowDownIcon className="h-7 w-7 text-blue-600" />
            </div>
            Generate PDF Report
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base mt-2">
            Generate professional PDF reports for <span className="font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded-md">{vendorName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-6 space-y-6">
          {/* Date Range Selection */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave empty to export all data
            </p>
          </div>

          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportType('purchases')}
                className={`h-12 border-2 font-semibold transition-all duration-200 ${
                  exportType === 'purchases'
                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                    : 'border-blue-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                Purchase Entries
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportType('payments')}
                className={`h-12 border-2 font-semibold transition-all duration-200 ${
                  exportType === 'payments'
                    ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                    : 'border-green-300 text-green-700 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                Payment History
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportType('both')}
                className={`h-12 border-2 font-semibold transition-all duration-200 ${
                  exportType === 'both'
                    ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:border-purple-700'
                    : 'border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50'
                }`}
              >
                Both Reports
              </Button>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Generate PDF Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
