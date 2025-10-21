"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  ArrowLeftIcon,
  PlusIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  TrashIcon,
  PencilIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import VendorPaymentModal from '@/components/VendorPaymentModal';
import VendorExportModal from '@/components/VendorExportModal';

interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: {
    id: string;
    name: string;
  };
  items: VendorItem[];
  purchases: Purchase[];
  financialSummary: {
    totalPurchases: number;
    totalPaid: number;
    outstandingBalance: number;
    cashIn: number;
    cashOut: number;
    netBalance: number;
  };
  creditBalance?: number;
}

interface VendorItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  defaultUnit: string;
}

interface Purchase {
  id: string;
  purchaseDate: string;
  invoiceNumber?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  items: PurchaseItem[];
  payments: Payment[];
}

interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cylinderCodes?: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface DirectPayment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
  description?: string;
  status: string;
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params?.id as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'items' | 'financial'>('purchases');

  // Financial report state
  const [reportPeriod, setReportPeriod] = useState('all');
  const [financialReport, setFinancialReport] = useState<any>(null);
  
  // Purchase entries filter state
  const [purchaseFilter, setPurchaseFilter] = useState('all');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [directPayments, setDirectPayments] = useState<DirectPayment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Purchase form state
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  // Default cylinder purchase items for Cylinder Purchase category
  const defaultCylinderItems = [
    { itemName: 'Domestic (11.8kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' },
    { itemName: 'Standard (15kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' },
    { itemName: 'Commercial (45.4kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }
  ];

  // Default gas purchase items for Gas Purchase category
  const defaultGasItems = [
    { itemName: 'Domestic (11.8kg) Gas', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: 'Standard (15kg) Gas', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: 'Commercial (45.4kg) Gas', quantity: 0, unitPrice: 0, totalPrice: 0 }
  ];

  // Default vaporizer purchase items for Vaporizer Purchase category
  const defaultVaporizerItems = [
    { itemName: '20kg Vaporiser', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: '30kg Vaporiser', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: '40kg Vaporiser', quantity: 0, unitPrice: 0, totalPrice: 0 }
  ];

  // Default accessories purchase items for Accessories Purchase category
  const defaultAccessoriesItems = [
    { itemName: 'Regulator', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: 'Stove', quantity: 0, unitPrice: 0, totalPrice: 0 },
    { itemName: 'Pipe', quantity: 0, unitPrice: 0, totalPrice: 0 }
  ];

  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
  const [purchaseFormData, setPurchaseFormData] = useState({
    invoiceNumber: '',
    notes: '',
    paidAmount: 0
  });
  const [usedCodes, setUsedCodes] = useState<Set<string>>(new Set());
  const [vendorItems, setVendorItems] = useState<Array<{id: string, name: string, description?: string}>>([]);

  // Item form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    category: ''
  });

  useEffect(() => {
    fetchVendor();
    fetchVendorItems();
  }, [vendorId]);

  useEffect(() => {
    if (activeTab === 'financial') {
      fetchFinancialReport();
      fetchDirectPayments();
    }
  }, [activeTab, reportPeriod]);

  // Initialize purchase items based on vendor category
  useEffect(() => {
    if (vendor?.category?.slug === 'cylinder_purchase') {
      setPurchaseItems(defaultCylinderItems);
    } else if (vendor?.category?.slug === 'gas_purchase') {
      setPurchaseItems(defaultGasItems);
    } else if (vendor?.category?.slug === 'vaporizer_purchase') {
      setPurchaseItems(defaultVaporizerItems);
    } else if (vendor?.category?.slug === 'accessories_purchase') {
      setPurchaseItems(defaultAccessoriesItems);
    } else {
      setPurchaseItems([{ itemName: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    }
  }, [vendor?.category?.slug]);

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor');
      const data = await response.json();
      setVendor(data.vendor);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorItems = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/items`);
      if (!response.ok) throw new Error('Failed to fetch vendor items');
      const data = await response.json();
      setVendorItems(data.items || []);
    } catch (error) {
      console.error('Error fetching vendor items:', error);
    }
  };

  const fetchFinancialReport = async () => {
    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/financial-report?period=${reportPeriod}`
      );
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setFinancialReport(data.report);
    } catch (error) {
      console.error('Error fetching financial report:', error);
    }
  };

  const fetchDirectPayments = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/direct-payments?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setDirectPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching direct payments:', error);
    }
  };

  // Filter purchase entries based on selected period
  const getFilteredPurchaseEntries = () => {
    if (!vendor?.purchase_entries) return [];
    
    const now = new Date();
    const filtered = vendor.purchase_entries.filter(entry => {
      const entryDate = new Date(entry.purchaseDate);
      
      switch (purchaseFilter) {
        case 'today':
          return entryDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return entryDate >= weekAgo;
        case 'twoWeeks':
          const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          return entryDate >= twoWeeksAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return entryDate >= monthAgo;
        case 'twoMonths':
          const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          return entryDate >= twoMonthsAgo;
        case 'sixMonths':
          const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          return entryDate >= sixMonthsAgo;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return entryDate >= yearAgo;
        default:
          return true;
      }
    });
    
    return filtered;
  };

  // Filter payment history based on selected report period
  const getFilteredPaymentHistory = () => {
    if (!directPayments) return [];
    
    const now = new Date();
    const filtered = directPayments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      
      switch (reportPeriod) {
        case 'daily':
          return paymentDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return paymentDate >= weekAgo;
        case 'twoWeeks':
          const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          return paymentDate >= twoWeeksAgo;
        case 'monthly':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return paymentDate >= monthAgo;
        case 'twoMonths':
          const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          return paymentDate >= twoMonthsAgo;
        case 'sixMonths':
          const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          return paymentDate >= sixMonthsAgo;
        case 'yearly':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return paymentDate >= yearAgo;
        default:
          return true;
      }
    });
    
    return filtered;
  };

  const handlePaymentSuccess = () => {
    fetchVendor();
    fetchFinancialReport();
    fetchDirectPayments();
  };

  const handleDeleteVendor = async () => {
    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete vendor');
        return;
      }

      // Redirect back to the category page
      router.push(`/vendors/category/${vendor?.category.id}`);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const response = await fetch('/api/vendors/invoice-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          vendorId: vendorId,
          categorySlug: vendor?.category?.slug
        })
      });

      if (!response.ok) {
        console.error('Invoice generation failed:', response.status, response.statusText);
        throw new Error('Failed to generate invoice number');
      }
      
      const data = await response.json();
      console.log('Generated invoice number:', data.invoiceNumber);
      return data.invoiceNumber;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to timestamp-based generation
      const timestamp = Date.now().toString().slice(-8);
      const prefix = vendor?.category?.slug === 'cylinder_purchase' ? 'CYL' :
                    vendor?.category?.slug === 'gas_purchase' ? 'GAS' :
                    vendor?.category?.slug === 'vaporizer_purchase' ? 'VAP' :
                    vendor?.category?.slug === 'accessories_purchase' ? 'ACC' :
                    vendor?.category?.slug === 'valves_purchase' ? 'VAL' : 'VEN';
      const fallbackInvoice = `${prefix}-${timestamp}`;
      console.log('Using fallback invoice number:', fallbackInvoice);
      return fallbackInvoice;
    }
  };

  const handleOpenPurchaseForm = async () => {
    const invoiceNumber = await generateInvoiceNumber();
    setPurchaseFormData({
      invoiceNumber: invoiceNumber,
      notes: '',
      paidAmount: 0
    });
    setUsedCodes(new Set()); // Reset used codes for new form
    setShowPurchaseForm(true);
  };

  const handleAddPurchaseItem = () => {
    // Only allow adding custom items for accessories and generic categories
    if (vendor?.category?.slug === 'accessories_purchase' || 
        !['cylinder_purchase', 'gas_purchase', 'vaporizer_purchase'].includes(vendor?.category?.slug || '')) {
      setPurchaseItems([
        ...purchaseItems,
        { itemName: '', quantity: 1, unitPrice: 0, totalPrice: 0 }
      ]);
    }
  };

  const handleRemovePurchaseItem = (index: number) => {
    // Don't allow removing fixed items for specific categories
    if (['cylinder_purchase', 'gas_purchase', 'vaporizer_purchase'].includes(vendor?.category?.slug || '')) {
      return;
    }
    
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const generateCylinderCodes = (itemName: string, quantity: number, currentUsedCodes: Set<string>) => {
    if (!quantity || quantity <= 0) return '';
    
    // Generate prefix based on cylinder type
    const prefix = itemName.includes('Domestic') ? 'D' :
                  itemName.includes('Standard') ? 'S' : 'C';
    
    const codes = [];
    let codeNumber = 1;
    
    // Find available codes that aren't already used in this form
    while (codes.length < quantity) {
      const code = `${prefix}${codeNumber.toString().padStart(2, '0')}`;
      if (!currentUsedCodes.has(code)) {
        codes.push(code);
      }
      codeNumber++;
    }
    
    return codes.join(', ');
  };

  const handlePurchaseItemChange = (index: number, field: string, value: any) => {
    const newItems = [...purchaseItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = 
        Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
    }

    // Auto-generate cylinder codes when quantity changes for cylinder purchases
    if (field === 'quantity' && 
        vendor?.category?.slug === 'cylinder_purchase' && 
        value > 0) {
      
      // Collect all currently used codes from other items
      const currentUsedCodes = new Set<string>();
      newItems.forEach((item, i) => {
        if (i !== index && item.cylinderCodes) {
          const codes = item.cylinderCodes.split(',').map(code => code.trim());
          codes.forEach(code => currentUsedCodes.add(code));
        }
      });
      
      // Generate codes locally - much faster!
      const generatedCodes = generateCylinderCodes(
        newItems[index].itemName,
        Number(value),
        currentUsedCodes
      );
      newItems[index].cylinderCodes = generatedCodes;
    }
    
    setPurchaseItems(newItems);
  };

  const calculatePurchaseTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter items that have quantity > 0
    const validItems = purchaseItems.filter(item => 
      item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one item with quantity and price');
      return;
    }

    console.log('Submitting purchase with invoice number:', purchaseFormData.invoiceNumber);
    console.log('Purchase data:', {
      items: validItems,
      invoiceNumber: purchaseFormData.invoiceNumber,
      notes: purchaseFormData.notes,
      paidAmount: purchaseFormData.paidAmount
    });

    try {
      const response = await fetch(`/api/vendors/${vendorId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
          invoiceNumber: purchaseFormData.invoiceNumber,
          notes: purchaseFormData.notes,
          paidAmount: purchaseFormData.paidAmount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Purchase creation failed:', error);
        alert(error.error || 'Failed to create purchase');
        return;
      }

      const result = await response.json();
      console.log('Purchase created successfully:', result);

      // Reset form
      setShowPurchaseForm(false);
      
      // Reset to default items based on category
      if (vendor?.category?.slug === 'cylinder_purchase') {
        setPurchaseItems(defaultCylinderItems);
      } else if (vendor?.category?.slug === 'gas_purchase') {
        setPurchaseItems(defaultGasItems);
      } else if (vendor?.category?.slug === 'vaporizer_purchase') {
        setPurchaseItems(defaultVaporizerItems);
      } else if (vendor?.category?.slug === 'accessories_purchase') {
        setPurchaseItems(defaultAccessoriesItems);
      } else {
        setPurchaseItems([{ itemName: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
      }
      
      setPurchaseFormData({ invoiceNumber: '', notes: '', paidAmount: 0 });
      fetchVendor();
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert('Failed to create purchase');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim()) return;

    try {
      const response = await fetch(`/api/vendors/${vendorId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormData)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to add item');
        return;
      }

      setShowItemForm(false);
      setItemFormData({ name: '', description: '', category: '' });
      fetchVendor();
      fetchVendorItems();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading vendor details...</div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Vendor not found
            </h3>
            <Link href="/vendors">
              <Button>Back to Vendors</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/vendors/category/${vendor.category.id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to {vendor.category.name}
          </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {vendor.name || vendor.companyName || 'Unnamed Vendor'}
            </h1>
            <p className="text-gray-600">{vendor.vendorCode}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete Vendor
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {(vendor.contactPerson || vendor.phone || vendor.email || vendor.address) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {vendor.contactPerson && (
                <div>
                  <span className="text-gray-500">Contact:</span>
                  <span className="ml-2 font-medium">{vendor.contactPerson}</span>
                </div>
              )}
              {vendor.phone && (
              <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{vendor.phone}</span>
              </div>
              )}
              {vendor.email && (
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium">{vendor.email}</span>
            </div>
              )}
              {vendor.address && (
                <div>
                  <span className="text-gray-500">Address:</span>
                  <span className="ml-2 font-medium">{vendor.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Cash Out (Purchases)</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(vendor.financialSummary.cashOut)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ShoppingCartIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Cash In (Payments)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(vendor.financialSummary.cashIn)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BanknotesIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Net Balance (Outstanding)</p>
                <p className={`text-2xl font-bold ${
                  vendor.financialSummary.netBalance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(vendor.financialSummary.netBalance)}
                </p>
                {vendor.financialSummary.netBalance > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    You owe this amount to the vendor
                  </p>
                )}
                {vendor.financialSummary.netBalance < 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Vendor owes you this amount
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${
                vendor.financialSummary.netBalance > 0 ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                <CurrencyDollarIcon className={`w-8 h-8 ${
                  vendor.financialSummary.netBalance > 0 ? 'text-yellow-600' : 'text-gray-600'
                }`} />
              </div>
            </div>
            {vendor.financialSummary.outstandingBalance < 0 && (
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <BanknotesIcon className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
            )}
          </CardContent>
        </Card>

        {vendor.creditBalance !== undefined && vendor.creditBalance !== 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Credit Balance</p>
                  <p className={`text-2xl font-bold ${
                    vendor.creditBalance > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {vendor.creditBalance > 0 ? '+' : ''}{formatCurrency(Math.abs(vendor.creditBalance))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {vendor.creditBalance > 0 
                      ? 'Vendor owes you money' 
                      : 'You owe vendor money'
                    }
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${
                  vendor.creditBalance > 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <CurrencyDollarIcon className={`w-8 h-8 ${
                    vendor.creditBalance > 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'purchases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Purchase Entries
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Items ({vendor.inventories.length})
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'financial'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Financial Report
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'purchases' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Purchase Entries (Total {getFilteredPurchaseEntries().length})
            </h2>
            <div className="flex items-center gap-4">
              <select
                value={purchaseFilter}
                onChange={(e) => setPurchaseFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="twoWeeks">Two Weeks</option>
                <option value="month">This Month</option>
                <option value="twoMonths">Two Months</option>
                <option value="sixMonths">Six Months</option>
                <option value="year">This Year</option>
              </select>
              <Button
                onClick={showPurchaseForm ? () => setShowPurchaseForm(false) : handleOpenPurchaseForm}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                {showPurchaseForm ? 'Cancel' : 'Add Purchase Entry'}
              </Button>
            </div>
          </div>

          {/* Purchase Form */}
          {showPurchaseForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Purchase Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPurchase} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Number
                      </label>
                      <Input
                        value={purchaseFormData.invoiceNumber}
                        readOnly
                        className="bg-gray-50 text-gray-900 cursor-not-allowed"
                        placeholder="Auto-generated"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Invoice number is automatically generated
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Input
                        value={purchaseFormData.notes}
                        onChange={(e) => setPurchaseFormData({
                          ...purchaseFormData,
                          notes: e.target.value
                        })}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>

                  <div>
                    {['cylinder_purchase', 'gas_purchase', 'vaporizer_purchase', 'accessories_purchase'].includes(vendor?.category?.slug || '') ? (
                      // Category-specific table format
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor.category.name}
                          </label>
                          {/* Show Add Item button only for accessories */}
                          {vendor?.category?.slug === 'accessories_purchase' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddPurchaseItem}
                            >
                              <PlusIcon className="w-4 h-4 mr-1" />
                              Add Custom Item
                            </Button>
                          )}
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                                  Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Quantity
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Unit
                                </th>
                                {vendor?.category?.slug === 'cylinder_purchase' && (
                                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                    Cylinder Codes
                                  </th>
                                )}
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Item
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchaseItems.map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                                    {/* Show item name for fixed items, input for custom items */}
                                    {vendor?.category?.slug === 'accessories_purchase' && 
                                     index >= defaultAccessoriesItems.length ? (
                                      <Input
                                        value={item.itemName}
                                        onChange={(e) => handlePurchaseItemChange(
                                          index,
                                          'itemName',
                                          e.target.value
                                        )}
                                        placeholder="Enter item name"
                                        className="border-0 focus:ring-1 bg-transparent font-medium"
                                      />
                                    ) : (
                                      item.itemName
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'quantity',
                                        e.target.value
                                      )}
                                      placeholder="Enter quantity"
                                      min="0"
                                      step="1"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'unitPrice',
                                        e.target.value
                                      )}
                                      placeholder="Enter price per unit"
                                      min="0"
                                      step="0.01"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  {vendor?.category?.slug === 'cylinder_purchase' && (
                                    <td className="border border-gray-300 px-4 py-2">
                                      <div className="space-y-1">
                                        <Input
                                          type="text"
                                          value={item.cylinderCodes || ''}
                                          onChange={(e) => handlePurchaseItemChange(
                                            index,
                                            'cylinderCodes',
                                            e.target.value
                                          )}
                                          placeholder="Auto-generated when quantity is entered"
                                          className="text-center border-0 focus:ring-1 bg-transparent text-sm"
                                        />
                                        <p className="text-xs text-gray-500 text-center">
                                          {item.cylinderCodes ? '✓ Auto-generated' : 'Enter quantity to auto-generate'}
                                        </p>
                                      </div>
                                    </td>
                                  )}
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-bold">
                                <td colSpan={vendor?.category?.slug === 'cylinder_purchase' ? 4 : 3} className="border border-gray-300 px-4 py-2 text-right">
                                  Total =
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                  {formatCurrency(calculatePurchaseTotal())}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      // Generic form for other categories
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-gray-700">
                            Items
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddPurchaseItem}
                          >
                            <PlusIcon className="w-4 h-4 mr-1" />
                            Add Item
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {purchaseItems.map((item, index) => (
                            <div key={index} className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Item name
                                </label>
                                <Select
                                  value={item.itemName}
                                  onChange={(e) => handlePurchaseItemChange(
                                    index,
                                    'itemName',
                                    e.target.value
                                  )}
                                >
                                  <option value="">Select item</option>
                                  {vendorItems.map((vendorItem) => (
                                    <option key={vendorItem.id} value={vendorItem.name}>
                                      {vendorItem.name}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="w-24">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Quantity
                                </label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handlePurchaseItemChange(
                                    index,
                                    'quantity',
                                    e.target.value
                                  )}
                                  placeholder="Qty"
                                  min="0"
                                  step="1"
                                  required
                                />
                              </div>
                              <div className="w-32">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Price per Unit
                                </label>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handlePurchaseItemChange(
                                    index,
                                    'unitPrice',
                                    e.target.value
                                  )}
                                  placeholder="Price/Unit"
                                  min="0"
                                  step="0.01"
                                  required
                                />
                              </div>
                              <div className="w-32">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Price per item
                                </label>
                                <Input
                                  type="number"
                                  value={item.totalPrice}
                                  readOnly
                                  placeholder="Total"
                                  className="bg-gray-50"
                                />
                              </div>
                              {purchaseItems.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemovePurchaseItem(index)}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-semibold text-gray-900">
                            Total Amount:
                          </span>
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(calculatePurchaseTotal())}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Amount (Optional)
                    </label>
                    <Input
                      type="number"
                      value={purchaseFormData.paidAmount}
                      onChange={(e) => setPurchaseFormData({
                        ...purchaseFormData,
                        paidAmount: Number(e.target.value)
                      })}
                      placeholder="Amount paid now"
                      min="0"
                      step="1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave as 0 if payment will be made later
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">Create Purchase Entry</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPurchaseForm(false);
                        
                        // Reset to default items based on vendor category
                        if (vendor?.category?.slug === 'cylinder_purchase') {
                          setPurchaseItems(defaultCylinderItems);
                        } else if (vendor?.category?.slug === 'gas_purchase') {
                          setPurchaseItems(defaultGasItems);
                        } else if (vendor?.category?.slug === 'vaporizer_purchase') {
                          setPurchaseItems(defaultVaporizerItems);
                        } else if (vendor?.category?.slug === 'accessories_purchase') {
                          setPurchaseItems(defaultAccessoriesItems);
                        } else {
                          setPurchaseItems([{ itemName: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
                        }
                        
                        setPurchaseFormData({ invoiceNumber: '', notes: '', paidAmount: 0 });
                        setUsedCodes(new Set()); // Reset used codes
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Purchases List */}
          {vendor.purchase_entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No purchase entries yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start by adding your first purchase entry
                </p>
                <Button onClick={handleOpenPurchaseForm}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add First Purchase
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getFilteredPurchaseEntries().map((purchase, index) => (
                <Card key={purchase.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {purchase.invoiceNumber || 'No Invoice Number'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(purchase.purchaseDate)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          purchase.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : purchase.status === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>

                    {/* Items Table */}
                    <div className="mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">
                              Item
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-gray-700">
                              Qty
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-gray-700">
                              Unit Price
                            </th>
                            {vendor?.category?.slug === 'cylinder_purchase' && (
                              <th className="px-4 py-2 text-left font-medium text-gray-700">
                                Cylinder Codes
                              </th>
                            )}
                            <th className="px-4 py-2 text-right font-medium text-gray-700">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-gray-200">
                            <td className="px-4 py-2">{purchase.itemName}</td>
                            <td className="px-4 py-2 text-right">{purchase.quantity}</td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(Number(purchase.unitPrice))}
                            </td>
                            {vendor?.category?.slug === 'cylinder_purchase' && (
                              <td className="px-4 py-2 text-left text-xs text-gray-600">
                                -
                              </td>
                            )}
                            <td className="px-4 py-2 text-right font-medium">
                              {formatCurrency(Number(purchase.totalPrice))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Purchase Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(Number(purchase.totalPrice))}
                        </div>
                      </div>
                      
                      {/* Recent Payment Total */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Recent Payment Total</div>
                        <div className="text-lg font-semibold text-green-600">
                          {(() => {
                            // Calculate total payments for this specific purchase
                            const purchasePayments = vendor.payments?.filter(payment => 
                              payment.description?.includes(purchase.invoiceNumber || '')
                            ) || [];
                            
                            // Debug logging
                            console.log('Purchase invoice:', purchase.invoiceNumber);
                            console.log('All payments:', vendor.payments);
                            console.log('Filtered payments:', purchasePayments);
                            
                            const totalPaid = purchasePayments.reduce((sum, payment) => 
                              sum + Number(payment.amount), 0
                            );
                            return formatCurrency(totalPaid);
                          })()}
                        </div>
                      </div>
                      
                      {/* Net Affected Balance */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Net Affected Balance</div>
                        <div className={`text-lg font-semibold ${
                          (() => {
                            // Calculate running balance up to this transaction
                            const currentIndex = vendor.purchase_entries.findIndex(p => p.id === purchase.id);
                            const transactionsUpToThis = vendor.purchase_entries.slice(currentIndex);
                            
                            // Calculate total purchases up to this point
                            const totalPurchasesUpToThis = transactionsUpToThis.reduce(
                              (sum, p) => sum + Number(p.totalPrice), 0
                            );
                            
                            // Calculate total payments up to this point
                            const totalPaymentsUpToThis = vendor.payments?.reduce(
                              (sum, payment) => sum + Number(payment.amount), 0
                            ) || 0;
                            
                            // Running balance = payments - purchases
                            const runningBalance = totalPaymentsUpToThis - totalPurchasesUpToThis;
                            
                            return runningBalance > 0 ? 'text-red-600' : 'text-green-600';
                          })()
                        }`}>
                          {(() => {
                            // Calculate running balance up to this transaction
                            const currentIndex = vendor.purchase_entries.findIndex(p => p.id === purchase.id);
                            const transactionsUpToThis = vendor.purchase_entries.slice(currentIndex);
                            
                            // Calculate total purchases up to this point
                            const totalPurchasesUpToThis = transactionsUpToThis.reduce(
                              (sum, p) => sum + Number(p.totalPrice), 0
                            );
                            
                            // Calculate total payments up to this point
                            const totalPaymentsUpToThis = vendor.payments?.reduce(
                              (sum, payment) => sum + Number(payment.amount), 0
                            ) || 0;
                            
                            // Running balance = payments - purchases
                            const runningBalance = totalPaymentsUpToThis - totalPurchasesUpToThis;
                            
                            return formatCurrency(runningBalance);
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {purchase.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </h4>
                        <p className="text-sm text-gray-600">{purchase.notes}</p>
                      </div>
                    )}

                    {/* Payments - Show payments specific to this purchase entry */}
                    {(() => {
                      const purchasePayments = vendor.payments?.filter(payment => 
                        payment.description?.includes(purchase.invoiceNumber || '')
                      ) || [];
                      
                      return purchasePayments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Recent Payments
                          </h4>
                          <div className="space-y-2">
                            {purchasePayments.slice(0, 3).map((payment) => (
                              <div
                                key={payment.id}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-gray-600">
                                  {formatDate(payment.paymentDate)} - {payment.method}
                                </span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(Number(payment.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Vendor Items
            </h2>
            <Button
              onClick={() => setShowItemForm(!showItemForm)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Item
            </Button>
          </div>

          {/* Item Form */}
          {showItemForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Item</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <Input
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({
                        ...itemFormData,
                        name: e.target.value
                      })}
                      placeholder="e.g., Domestic (11.8kg) Cylinder"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <Input
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData({
                        ...itemFormData,
                        category: e.target.value
                      })}
                      placeholder="e.g., Cylinder, Gas, Vaporizer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({
                        ...itemFormData,
                        description: e.target.value
                      })}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit">Add Item</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowItemForm(false);
                        setItemFormData({ name: '', description: '', category: '' });
                      }}
                    >
                      Cancel
                    </Button>
                </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Items List */}
          {vendor.inventories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No items added yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Add items to quickly select them when creating purchase entries
                </p>
                <Button onClick={() => setShowItemForm(true)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendor.inventories.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.name}
                    </h3>
                    {item.category && (
                      <p className="text-sm text-gray-500 mb-2">
                        {item.category}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'financial' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Financial Report
            </h2>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowExportModal(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export Report
              </Button>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="twoWeeks">Two Weeks</option>
                <option value="monthly">This Month</option>
                <option value="twoMonths">Two Months</option>
                <option value="sixMonths">Six Months</option>
                <option value="yearly">This Year</option>
              </select>
            </div>
          </div>

          {financialReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500 mb-1">Cash Out</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialReport.cashOut)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total Purchases
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500 mb-1">Cash In</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialReport.cashIn)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total Payments
                    </p>
                  </CardContent>
        </Card>

                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500 mb-1">Net Balance</p>
                    <p className={`text-2xl font-bold ${
                      financialReport.netBalance > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(financialReport.netBalance)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Outstanding
                    </p>
                  </CardContent>
                </Card>

              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Period Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Period:</span>
                      <span className="font-medium">
                        {reportPeriod === 'all' && 'All Time'}
                        {reportPeriod === 'daily' && formatDate(financialReport.startDate)}
                        {reportPeriod === 'monthly' && 
                          `${formatDate(financialReport.startDate)} - ${formatDate(financialReport.endDate)}`}
                        {reportPeriod === 'yearly' &&
                          new Date(financialReport.startDate).getFullYear()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Total Purchases:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(financialReport.totalPurchases)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Total Payments:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(financialReport.totalPayments)}
                      </span>
                    </div>
                    {financialReport.directPayments > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200 pl-4">
                        <span className="text-sm text-gray-600">• Direct Payments:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(financialReport.directPayments)}
                        </span>
                      </div>
                    )}
                    {financialReport.purchasePayments > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200 pl-4">
                        <span className="text-sm text-gray-600">• Purchase Payments:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(financialReport.purchasePayments)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700 font-semibold">Outstanding Balance:</span>
                      <span className={`font-bold text-lg ${
                        financialReport.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(financialReport.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              {getFilteredPaymentHistory().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BanknotesIcon className="h-5 w-5 text-green-600" />
                      Payment History ({getFilteredPaymentHistory().length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getFilteredPaymentHistory().map((payment, index) => (
                        <div key={payment.id} className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                  <BanknotesIcon className="h-6 w-6 text-white" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-xl font-bold text-gray-900">
                                    {formatCurrency(Number(payment.amount))}
                                  </h4>
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    payment.status === 'COMPLETED' 
                                      ? 'bg-green-100 text-green-800 border border-green-200' 
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-medium">Date:</span>
                                    <span className="text-gray-700 font-semibold">{formatDate(payment.paymentDate)}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-medium">Method:</span>
                                    <span className="text-gray-700 font-semibold">{payment.method}</span>
                                  </div>
                                  
                                  {payment.reference && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">Reference:</span>
                                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded text-xs">
                                        {payment.reference}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-medium">Transaction ID:</span>
                                    <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                      {payment.id.slice(-8).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                
                                {payment.description && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium text-gray-700">Description:</span> {payment.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs text-gray-400 font-medium">
                                #{index + 1}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(payment.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-lg">Loading financial report...</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {vendor && (
        <VendorPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          vendorId={vendorId}
          vendorName={vendor.companyName}
          outstandingBalance={vendor.financialSummary.outstandingBalance}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Export Modal */}
      {vendor && (
        <VendorExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          vendorName={vendor.companyName}
          vendorId={vendorId}
          purchaseEntries={vendor.purchase_entries || []}
          paymentHistory={directPayments}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Vendor
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete this vendor? This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteVendor}
                  >
                    Delete Vendor
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

