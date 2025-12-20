"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { generateCylinderTypeFromCapacity } from '@/lib/cylinder-utils';

interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: {
    id: string;
    name: string;
    slug?: string;
  };
  items: VendorItem[];
  purchases: Purchase[];
  purchase_entries?: any[];
  payments?: any[];
  inventories?: any[];
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
  status?: string;
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
  createdAt?: string;
  method: string;
  reference?: string;
  description?: string;
  status: string;
}

// Utility function to normalize category names for case sensitivity
const normalizeCategoryName = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  
  // Handle common variations
  if (normalized === 'stove' || normalized === 'stoves') {
    return 'Stoves';
  } else if (normalized === 'regulator' || normalized === 'regulators') {
    return 'Regulators';
  } else if (normalized === 'valve' || normalized === 'valves') {
    return 'Valves';
  } else if (normalized === 'pipe' || normalized === 'pipes' || normalized === 'gas pipe' || normalized === 'gas pipes') {
    return 'Gas Pipes';
  } else {
    // Capitalize first letter for other categories
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }
};

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string | null>(null);
  const [selectedEntryTotal, setSelectedEntryTotal] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [directPayments, setDirectPayments] = useState<DirectPayment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  
  // Edit vendor state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // Edit vendor item state
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editItemFormData, setEditItemFormData] = useState({
    name: '',
    description: '',
    category: ''
  });

  // Purchase form state
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  
  // Gas purchase state
  // Dynamic cylinder types - handles any cylinder type from the database
  const [emptyCylinders, setEmptyCylinders] = useState<Record<string, Array<{id: string, code: string, cylinderType: string}>>>({});
  const [selectedCylinders, setSelectedCylinders] = useState<{
    domestic: string[];
    standard: string[];
    commercial: string[];
  }>({
    domestic: [],
    standard: [],
    commercial: []
  });
  
  // Smart category detection for cylinder purchase
  const isCylinderPurchaseCategory = (categorySlug: string, categoryName: string) => {
    // Normalize both slug and name for comparison
    const normalizedSlug = categorySlug?.toLowerCase().replace(/[_-]/g, '') || '';
    const normalizedName = categoryName?.toLowerCase().replace(/[_-]/g, '') || '';
    
    // Check for various cylinder purchase patterns
    const cylinderPatterns = [
      'cylinderpurchase',
      'cylinderspurchase', 
      'cylinderpurchases',
      'cylinderspurchases'
    ];
    
    return cylinderPatterns.some(pattern => 
      normalizedSlug.includes(pattern) || 
      normalizedName.includes(pattern)
    );
  };

  // Smart category detection for gas purchase
  const isGasPurchaseCategory = (categorySlug: string, categoryName: string) => {
    // Normalize both slug and name for comparison
    const normalizedSlug = categorySlug?.toLowerCase().replace(/[_-]/g, '') || '';
    const normalizedName = categoryName?.toLowerCase().replace(/[_-]/g, '') || '';
    
    // Check for various gas purchase patterns
    const gasPatterns = [
      'gaspurchase',
      'gasfilling',
      'gasrefill',
      'gasrefilling'
    ];
    
    return gasPatterns.some(pattern => 
      normalizedSlug.includes(pattern) || 
      normalizedName.includes(pattern)
    );
  };
  // Default cylinder purchase items for Cylinder Purchase category
  const defaultCylinderItems = [
    { itemName: 'Domestic (11.8kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, status: 'EMPTY' },
    { itemName: 'Standard (15kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, status: 'EMPTY' },
    { itemName: 'Commercial (45.4kg) Cylinder', quantity: 0, unitPrice: 0, totalPrice: 0, status: 'EMPTY' }
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
  

  // Helper function to get items for display
  const getDisplayItems = () => {
    // Use purchaseItems if it has items (FIRST PRIORITY)
    if (purchaseItems.length > 0) {
      return purchaseItems;
    }
    
    // For accessories purchase, use empty items (don't use vendor inventory)
    if (vendor?.category?.slug === 'accessories_purchase') {
      return [{ itemName: '', category: '', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }];
    }
    
    // For gas purchase, always start with one empty item row
    if (vendor?.category?.slug === 'gas_purchase') {
      return [{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }];
    }
    
    // For cylinder purchase, always start with one empty item row (matching gas purchase behavior)
    if (isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
      return [{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '', status: 'EMPTY' }];
    }
    
    // For vaporizer purchase, start with one empty item row (matching cylinder purchase behavior)
    if (vendor?.category?.slug === 'vaporizer_purchase') {
      return [{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }];
    }
    
    // For other categories (valves, etc.), start with one empty item row
    // Users can add items via the "Add Item" button or select from dropdown
    // Final fallback - one empty item row for generic form
    return [{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }];
  };
  
  const [vendorItems, setVendorItems] = useState<Array<{id: string, name: string, category: string, description?: string}>>([]);
  const [purchaseFormData, setPurchaseFormData] = useState({
    invoiceNumber: '',
    notes: '',
    paidAmount: 0,
    paymentMethod: 'CASH' as string
  });
  // Price per 11.8kg for gas purchase - used to calculate unit prices for all cylinder types
  const [pricePer11_8kg, setPricePer11_8kg] = useState<number>(0);

  // Calculate unit price based on price per 11.8kg and cylinder capacity
  const calculateUnitPriceFromBase = (itemName: string, basePrice: number): number => {
    if (!itemName || !basePrice || basePrice <= 0) return 0;
    
    const name = itemName.toLowerCase();
    // Extract capacity from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg", etc.)
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (weightMatch) {
      const capacity = parseFloat(weightMatch[1]);
      if (!isNaN(capacity) && capacity > 0) {
        // Calculate proportional price: (capacity / 11.8) * basePrice
        const calculatedPrice = (capacity / 11.8) * basePrice;
        // Round off decimals to whole number
        return Math.round(calculatedPrice);
      }
    }
    
    return 0;
  };

  // Update unit prices for all items when base price changes
  const updateUnitPricesFromBase = (basePrice: number) => {
    if (!isGasPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
      return;
    }
    
    const updatedItems = purchaseItems.map(item => {
      if (item.itemName && item.itemName.trim()) {
        const calculatedPrice = calculateUnitPriceFromBase(item.itemName, basePrice);
        return {
          ...item,
          unitPrice: calculatedPrice,
          totalPrice: Number(item.quantity) * calculatedPrice
        };
      }
      return item;
    });
    
    setPurchaseItems(updatedItems);
  };
  const [usedCodes, setUsedCodes] = useState<Set<string>>(new Set());

  // Auto-populate purchase items when vendor items are loaded

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

  // Auto-update paid amount to match grand total when purchase items change
  useEffect(() => {
    const grandTotal = purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    setPurchaseFormData(prev => ({
      ...prev,
      paidAmount: grandTotal
    }));
  }, [purchaseItems]);

  // Initialize purchase items based on vendor category
  useEffect(() => {
    // Only run if vendor is loaded
    if (!vendor) {
      return;
    }
    
    // For gas purchase, always start with one empty row
    // This allows users to select from vendor items dynamically
    if (vendor?.category?.slug === 'gas_purchase') {
      // Always start with one empty item row
      setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }]);
      // Fetch empty cylinders when form is initialized for gas purchase
      fetchEmptyCylinders();
    } else if (isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
      // For cylinder purchase, always start with one empty item row (matching gas purchase behavior)
      setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '', status: 'EMPTY' }]);
    } else if (vendor?.category?.slug === 'accessories_purchase') {
      // For accessories, start with empty item
      setPurchaseItems([{ itemName: '', category: '', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }]);
    } else if (vendorItems.length > 0) {
      // For other categories, use vendor items if available
      const mappedItems = vendorItems.map(item => ({
        itemName: item.name,
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        status: 'EMPTY',
        category: item.category || '',
        cylinderCodes: ''
      }));
      setPurchaseItems(mappedItems);
    } else {
      // Fallback to hardcoded items if no vendor items
      if (vendor?.category?.slug === 'vaporizer_purchase') {
        // Start with one empty item row (matching cylinder purchase behavior)
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      } else {
        // Generic form (valves, etc.) - start with one empty item row
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      }
    }
  }, [vendor, vendorItems]);

  // Force re-render when vendor changes
  useEffect(() => {
    if (vendor && purchaseItems.length === 0) {
      if (isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '', status: 'EMPTY' }]);
                        } else if (vendor?.category?.slug === 'gas_purchase') {
                          setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }]);
                          // Reset price per 11.8kg
                          setPricePer11_8kg(0);
                        } else if (vendor?.category?.slug === 'vaporizer_purchase') {
        // Start with one empty item row (matching cylinder purchase behavior)
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      } else if (vendor?.category?.slug === 'accessories_purchase') {
        setPurchaseItems([...defaultAccessoriesItems]);
      }
    }
  }, [vendor, purchaseItems.length]);

  // Refetch empty cylinders when gas purchase items change (itemName selected)
  useEffect(() => {
    if (isGasPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '') && showPurchaseForm) {
      const hasItemSelected = purchaseItems.some(item => item.itemName && item.itemName.trim());
      if (hasItemSelected) {
        // Debounce the fetch to avoid too many calls
        const timeoutId = setTimeout(() => {
          fetchEmptyCylinders();
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [purchaseItems.map(item => item.itemName).join(','), showPurchaseForm, vendor?.category?.slug]);

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

  const fetchEmptyCylinders = async () => {
    try {
      const response = await fetch('/api/inventory/empty-cylinders');
      if (!response.ok) throw new Error('Failed to fetch empty cylinders');
      const data = await response.json();
      console.log('📦 Fetched empty cylinders:', data.cylinders);
      console.log('📦 Available types:', Object.keys(data.cylinders || {}));
      setEmptyCylinders(data.cylinders || {});
      return data.cylinders || {}; // Return the data for validation
    } catch (error) {
      console.error('Error fetching empty cylinders:', error);
      setEmptyCylinders({});
      return {};
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

  // Group purchase entries by invoice number
  const getGroupedPurchaseEntries = () => {
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
    
    // Group entries by invoice number
    const grouped = filtered.reduce((acc, entry) => {
      const invoiceNumber = entry.invoiceNumber || `no-invoice-${entry.id}`;
      if (!acc[invoiceNumber]) {
        acc[invoiceNumber] = {
          id: entry.id, // Use first entry's ID as the group ID
          invoiceNumber: entry.invoiceNumber,
          purchaseDate: entry.purchaseDate,
          status: entry.status,
          notes: entry.notes,
          items: [],
          totalPrice: 0
        };
      }
      acc[invoiceNumber].items.push(entry);
      acc[invoiceNumber].totalPrice += Number(entry.totalPrice);
      // Use the earliest date if multiple dates exist
      if (new Date(entry.purchaseDate) < new Date(acc[invoiceNumber].purchaseDate)) {
        acc[invoiceNumber].purchaseDate = entry.purchaseDate;
      }
      // If any entry is PAID, mark group as PAID; if any is PARTIAL, mark as PARTIAL
      if (entry.status === 'PAID') {
        acc[invoiceNumber].status = 'PAID';
      } else if (entry.status === 'PARTIAL' && acc[invoiceNumber].status !== 'PAID') {
        acc[invoiceNumber].status = 'PARTIAL';
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  };
  
  // Keep the old function name for backward compatibility
  const getFilteredPurchaseEntries = getGroupedPurchaseEntries;

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
    setSelectedInvoiceNumber(null);
    setSelectedEntryTotal(null);
    fetchVendor();
    fetchFinancialReport();
    fetchDirectPayments();
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          contactPerson: editFormData.contactPerson,
          phone: editFormData.phone,
          email: editFormData.email,
          address: editFormData.address
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update vendor');
      }

      // Refresh vendor data
      await fetchVendor();
      
      // Close modal
      setShowEditModal(false);
      
      alert('Vendor updated successfully!');
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async () => {
    // Get the vendor name to match
    const vendorName = vendor?.name || vendor?.companyName || '';
    
    // Validate that the confirmation name matches
    if (deleteConfirmationName.trim() !== vendorName.trim()) {
      alert('Vendor name does not match. Please type the exact vendor name to confirm deletion.');
      return;
    }

    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete vendor');
        return;
      }

      // Reset confirmation state
      setDeleteConfirmationName('');
      setShowDeleteConfirm(false);

      // Redirect back to the category page
      router.push(`/vendors/category/${vendor?.category.id}`);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setEditItemFormData({
      name: item.name || '',
      description: item.description || '',
      category: item.category || ''
    });
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/vendors/${vendorId}/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItemFormData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update item');
      }

      // Refresh vendor data
      await fetchVendor();
      
      // Close modal
      setShowEditItemModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/vendors/${vendorId}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete item');
      }

      // Refresh vendor data
      await fetchVendor();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
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
      paidAmount: 0,
      paymentMethod: 'CASH'
    });
    setUsedCodes(new Set()); // Reset used codes for new form
    
    // Initialize with one empty item for gas purchase, or reset to trigger auto-population for others
    if (vendor?.category?.slug === 'gas_purchase') {
      setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }]);
      // Reset price per 11.8kg when opening form
      setPricePer11_8kg(0);
      // Fetch empty cylinders when opening gas purchase form
      fetchEmptyCylinders();
    } else if (vendor?.category?.slug === 'accessories_purchase') {
      setPurchaseItems([{ itemName: '', category: '', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }]);
    } else {
      // Reset purchase items to trigger auto-population
      setPurchaseItems([]);
    }
    
    setShowPurchaseForm(true);
  };

  const handleAddPurchaseItem = () => {
    // Allow adding items to all vendor categories
    if (vendor?.category?.slug === 'gas_purchase') {
      setPurchaseItems([
        ...purchaseItems,
        { itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }
      ]);
    } else {
      setPurchaseItems([
        ...purchaseItems,
        { itemName: '', category: '', quantity: 1, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }
      ]);
    }
  };

  const handleRemovePurchaseItem = (index: number) => {
    // Allow removing items, but keep at least one item
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };


  const handlePurchaseItemChange = (index: number, field: string, value: any) => {
    const newItems = [...purchaseItems];
    
    // Note: Quantity validation for gas purchases is handled after fetchEmptyCylinders()
    
    // Normalize category name for case sensitivity (only for accessories purchase)
    if (field === 'category' && vendor?.category?.slug === 'accessories_purchase') {
      value = normalizeCategoryName(value);
    }
    
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // Reset itemName when category changes
    if (field === 'category') {
      newItems[index].itemName = '';
    }
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = 
        Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
    }

      // For gas purchase, fetch empty cylinders when item is selected or quantity changes
      if (isGasPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
        if (field === 'itemName' && value) {
          // Fetch empty cylinders when item is selected and wait for it to complete
          fetchEmptyCylinders().then((cylinders) => {
            if (cylinders) {
              // Auto-calculate unit price if base price is set
              if (pricePer11_8kg > 0) {
                const calculatedPrice = calculateUnitPriceFromBase(value, pricePer11_8kg);
                newItems[index].unitPrice = calculatedPrice;
                newItems[index].totalPrice = Number(newItems[index].quantity) * calculatedPrice;
              }
              // Update items to trigger re-render and show max quantity
              setPurchaseItems([...newItems]);
            }
          });
        } else if (field === 'quantity' && value > 0 && newItems[index].itemName) {
        // Fetch empty cylinders first, then validate quantity
        fetchEmptyCylinders().then((cylinders) => {
          if (cylinders) {
            const itemName = newItems[index].itemName;
            const cylinderType = getCylinderTypeFromItemName(itemName);
            let maxQuantity = 0;
            
            // Dynamically get count for any cylinder type
            if (cylinderType && cylinders[cylinderType]) {
              maxQuantity = cylinders[cylinderType].length;
            }
            
            console.log(`🔍 Validation: ${itemName}, Cylinder Type: ${cylinderType}, Requested: ${value}, Available: ${maxQuantity}`);
            console.log(`🔍 Available cylinder types:`, Object.keys(cylinders));
            
            // If quantity exceeds available, automatically clamp to max (no alert, just enforce)
            if (maxQuantity > 0 && Number(value) > maxQuantity) {
              newItems[index].quantity = maxQuantity;
              newItems[index].totalPrice = maxQuantity * Number(newItems[index].unitPrice);
              setPurchaseItems([...newItems]);
            }
          }
        });
      }
    }
    
    setPurchaseItems(newItems);
  };

  // Helper function to extract cylinder type enum from item name
  // Uses the same logic as backend (generateCylinderTypeFromCapacity) for consistency
  // Dynamically matches any weight pattern (6kg, 11.8kg, 15kg, 30kg, 45.4kg, etc.)
  const getCylinderTypeFromItemName = (itemName: string): string | null => {
    if (!itemName) return null;
    
    const name = itemName.toLowerCase();
    
    // Extract weight/capacity from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg", etc.)
    // Also handles formats like "Commercial (45.4kg) Gas", "commercial 45.4kg", etc.
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (weightMatch) {
      const capacity = parseFloat(weightMatch[1]);
      
      // Validate capacity
      if (isNaN(capacity) || capacity <= 0) {
        console.log(`⚠️ Invalid capacity extracted from item name: ${itemName} (capacity: ${capacity})`);
        return null;
      }
      
      // Use the same utility function as backend for consistency
      // This generates enum like: CYLINDER_45_4KG, CYLINDER_11_8KG, etc.
      const generatedType = generateCylinderTypeFromCapacity(capacity);
      
      console.log(`🔍 Extracted capacity: ${capacity}kg from "${itemName}" -> Generated type: "${generatedType}"`);
      
      // Check if this generated type exists in emptyCylinders
      if (emptyCylinders[generatedType]) {
        return generatedType;
      }
      
      // Also check for legacy enum formats (DOMESTIC_11_8KG, STANDARD_15KG, COMMERCIAL_45_4KG)
      // Map common weights to legacy types for backward compatibility
      if (Math.abs(capacity - 11.8) < 0.1 || name.includes('domestic')) {
        const legacyType = 'DOMESTIC_11_8KG';
        if (emptyCylinders[legacyType]) {
          return legacyType;
        }
        return generatedType; // Return generated type even if not in emptyCylinders yet
      } else if (Math.abs(capacity - 15) < 0.1 || name.includes('standard')) {
        const legacyType = 'STANDARD_15KG';
        if (emptyCylinders[legacyType]) {
          return legacyType;
        }
        return generatedType;
      } else if (Math.abs(capacity - 45.4) < 0.1 || name.includes('commercial')) {
        const legacyType = 'COMMERCIAL_45_4KG';
        if (emptyCylinders[legacyType]) {
          return legacyType;
        }
        return generatedType;
      } else {
        // For new cylinder types, try to find matching type in available cylinders
        const availableTypes = Object.keys(emptyCylinders);
        for (const type of availableTypes) {
          // Extract weight from cylinder type enum
          const typeWeightMatch = type.match(/(\d+)(?:_(\d+))?/);
          if (typeWeightMatch) {
            const wholePart = parseFloat(typeWeightMatch[1]);
            const decimalPart = typeWeightMatch[2] ? parseFloat(typeWeightMatch[2]) / 10 : 0;
            const typeWeight = wholePart + decimalPart;
            
            if (Math.abs(typeWeight - capacity) < 0.1) {
              console.log(`✅ Found matching type in inventory: "${type}" (weight: ${typeWeight})`);
              return type;
            }
          }
        }
        
        // Return generated type even if not found (will be used by backend)
        return generatedType;
      }
    }
    
    // Fallback to keyword matching if no weight found
    if (name.includes('domestic') || name.includes('11.8')) {
      return 'DOMESTIC_11_8KG';
    } else if (name.includes('commercial') || name.includes('45.4')) {
      return 'COMMERCIAL_45_4KG';
    } else if (name.includes('standard') || name.includes('15kg') || name.includes('15 kg')) {
      return 'STANDARD_15KG';
    } else if (name.includes('6kg') || name.includes('6 kg')) {
      return 'CYLINDER_6KG';
    } else if (name.includes('30kg') || name.includes('30 kg')) {
      return 'CYLINDER_30KG';
    }
    
    console.log(`⚠️ Could not extract cylinder type from item name: ${itemName}`);
    return null;
  };

  const getMaxQuantity = (itemName: string) => {
    if (!isGasPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
      return null;
    }
    
    if (!itemName || !itemName.trim()) {
      return null;
    }
    
    const cylinderType = getCylinderTypeFromItemName(itemName);
    
    if (!cylinderType) {
      console.log(`⚠️ Could not determine cylinder type for: ${itemName}`);
      return null;
    }
    
    // Debug logging
    console.log(`🔍 getMaxQuantity - Item: "${itemName}", Extracted Type: "${cylinderType}"`);
    console.log(`🔍 Available types in emptyCylinders:`, Object.keys(emptyCylinders));
    console.log(`🔍 emptyCylinders object:`, emptyCylinders);
    
    // Dynamically get count for any cylinder type
    // Try exact match first
    let cylinders = emptyCylinders[cylinderType];
    
    // If not found, try case-insensitive match
    if (!cylinders && Object.keys(emptyCylinders).length > 0) {
      const matchingKey = Object.keys(emptyCylinders).find(
        key => key.toUpperCase() === cylinderType.toUpperCase()
      );
      if (matchingKey) {
        cylinders = emptyCylinders[matchingKey];
        console.log(`✅ Found case-insensitive match: "${matchingKey}" for "${cylinderType}"`);
      }
    }
    
    // If still not found, try to match by extracting weight from both
    if (!cylinders && Object.keys(emptyCylinders).length > 0) {
      const itemWeightMatch = itemName.match(/(\d+\.?\d*)\s*kg/i);
      if (itemWeightMatch) {
        const itemWeight = parseFloat(itemWeightMatch[1]);
        for (const key of Object.keys(emptyCylinders)) {
          const keyWeightMatch = key.match(/(\d+\.?\d*)/);
          if (keyWeightMatch) {
            const keyWeight = parseFloat(keyWeightMatch[1]);
            if (Math.abs(keyWeight - itemWeight) < 0.1) {
              cylinders = emptyCylinders[key];
              console.log(`✅ Found weight-based match: "${key}" (weight: ${keyWeight}) for item "${itemName}" (weight: ${itemWeight})`);
              break;
            }
          }
        }
      }
    }
    
    const count = cylinders ? cylinders.length : 0;
    console.log(`🔍 Max quantity for "${itemName}" (type: "${cylinderType}"): ${count}`);
    
    return count;
  };


  const handleCylinderSelection = (cylinderType: string, cylinderId: string, isSelected: boolean) => {
    setSelectedCylinders(prev => {
      const currentSelection = prev[cylinderType as keyof typeof prev];
      if (isSelected) {
        return {
          ...prev,
          [cylinderType]: [...currentSelection, cylinderId]
        };
      } else {
        return {
          ...prev,
          [cylinderType]: currentSelection.filter(id => id !== cylinderId)
        };
      }
    });
  };

  const calculatePurchaseTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    // For gas purchase, validate quantity doesn't exceed available cylinders
    if (isGasPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
      for (const item of purchaseItems) {
        if (item.itemName.trim() && item.quantity > 0) {
          const maxQty = getMaxQuantity(item.itemName);
          if (maxQty !== null && maxQty !== undefined && item.quantity > maxQty) {
            alert(`Quantity for "${item.itemName}" exceeds available empty cylinders. Maximum available: ${maxQty}`);
            return;
          }
          
          // Check if cylinder type exists in inventory
          const cylinderType = getCylinderTypeFromItemName(item.itemName);
          if (cylinderType && (!emptyCylinders[cylinderType] || emptyCylinders[cylinderType].length === 0)) {
            alert(`No empty cylinders available for "${item.itemName}". Please ensure cylinders of this type exist in inventory.`);
            return;
          }
        }
      }
    }

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
          paidAmount: purchaseFormData.paidAmount,
          paymentMethod: purchaseFormData.paymentMethod
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
      
      // Reset to initial state based on category
      if (vendor?.category?.slug === 'gas_purchase') {
        // Start with one empty item for gas purchase
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }]);
        // Reset price per 11.8kg
        setPricePer11_8kg(0);
      } else if (vendor?.category?.slug === 'accessories_purchase') {
        // Start with one empty item for accessories
        setPurchaseItems([{ itemName: '', category: '', quantity: 0, unitPrice: 0, totalPrice: 0, cylinderCodes: '' }]);
      } else if (isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
        // Start with one empty item for cylinder purchase (matching gas purchase behavior)
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '', status: 'EMPTY' }]);
      } else if (vendor?.category?.slug === 'vaporizer_purchase') {
        // Start with one empty item row (matching cylinder purchase behavior)
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      } else {
        // Generic form (valves, etc.) - start with one empty item row
        setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      }
      
      setPurchaseFormData({ invoiceNumber: '', notes: '', paidAmount: 0, paymentMethod: 'CASH' });
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
              onClick={() => {
                setEditFormData({
                  name: vendor.name || vendor.companyName || '',
                  contactPerson: vendor.contactPerson || '',
                  phone: vendor.phone || '',
                  email: vendor.email || '',
                  address: vendor.address || ''
                });
                setShowEditModal(true);
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Edit Vendor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteConfirmationName('');
                setShowDeleteConfirm(true);
              }}
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
                  {formatCurrency(Math.round(vendor.financialSummary.cashOut))}
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
                  {formatCurrency(Math.round(vendor.financialSummary.cashIn))}
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
                  {formatCurrency(Math.round(vendor.financialSummary.netBalance))}
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
                onClick={() => {
                  setSelectedInvoiceNumber(null);
                  setSelectedEntryTotal(null);
                  setShowPaymentModal(true);
                }}
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
              Entries
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Items ({vendor.inventories?.length || 0})
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
              Entries (Total {getFilteredPurchaseEntries().length})
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
                onClick={showPurchaseForm ? () => {
                  setShowPurchaseForm(false);
                  // Reset price per 11.8kg when canceling
                  if (vendor?.category?.slug === 'gas_purchase') {
                    setPricePer11_8kg(0);
                  }
                } : handleOpenPurchaseForm}
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

                  {/* Price Per 11.8kg - Only for gas purchase */}
                  {vendor?.category?.slug === 'gas_purchase' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Per 11.8kg
                      </label>
                      <Input
                        type="number"
                        value={pricePer11_8kg}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setPricePer11_8kg(value);
                          // Auto-update unit prices for all items
                          updateUnitPricesFromBase(value);
                        }}
                        placeholder="Enter price per 11.8kg"
                        min="0"
                        step="0.5"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unit prices for all cylinder types will be calculated based on this base price
                      </p>
                    </div>
                  )}

                  <div>
                    {vendor?.category?.slug === 'accessories_purchase' ? (
                      // Professional accessories purchase form
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor.category.name}
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
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '23%' }} />
                              <col style={{ width: '23%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '15%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                                  Category
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                                  Item Type
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Quantity
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price Per Unit
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price Per Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getDisplayItems().map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.category || ''}
                                      onChange={(e) => handlePurchaseItemChange(index, 'category', e.target.value)}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                    >
                                      <option value="">Select Category</option>
                                      {[...new Set(vendorItems.map(item => normalizeCategoryName(item.category)))].map((category) => (
                                        <option key={category} value={category}>
                                          {category}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.itemName}
                                      onChange={(e) => handlePurchaseItemChange(index, 'itemName', e.target.value)}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                      disabled={!item.category}
                                    >
                                      <option value="">Select Item Type</option>
                                      {vendorItems
                                        .filter(vi => normalizeCategoryName(vi.category) === item.category)
                                        .map((vendorItem) => (
                                          <option key={vendorItem.id} value={vendorItem.name}>
                                            {vendorItem.name}
                                          </option>
                                        ))}
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handlePurchaseItemChange(index, 'quantity', e.target.value)}
                                      placeholder="0"
                                      min="0"
                                      step="1"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => handlePurchaseItemChange(index, 'unitPrice', e.target.value)}
                                      placeholder="0"
                                      min="0"
                                      step="0.01"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium text-gray-900">
                                    Rs {item.totalPrice || 0}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemovePurchaseItem(index)}
                                      disabled={getDisplayItems().length <= 1}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                  Grand Total:
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">
                                  Rs {purchaseItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)}
                                </td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : vendor?.category?.slug === 'gas_purchase' ? (
                      // Gas purchase form with dropdown for vendor items
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor.category.name}
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
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '30%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '15%' }} />
                            </colgroup>
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
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getDisplayItems().map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.itemName}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'itemName',
                                        e.target.value
                                      )}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                    >
                                      <option value="">Select Item</option>
                                      {vendorItems.length > 0 ? (
                                        vendorItems.map((vendorItem) => (
                                          <option key={vendorItem.id} value={vendorItem.name}>
                                            {vendorItem.name}
                                          </option>
                                        ))
                                      ) : (
                                        defaultGasItems.map((defaultItem, idx) => (
                                          <option key={idx} value={defaultItem.itemName}>
                                            {defaultItem.itemName}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <div className="space-y-1">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        const parsedValue = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                        let inputValue: number = parsedValue;
                                        
                                        // Enforce max quantity if available (prevent exceeding max)
                                        if (maxQty !== null && maxQty !== undefined && maxQty > 0 && inputValue > maxQty) {
                                          inputValue = maxQty;
                                        }
                                        
                                        // Don't allow negative values
                                        if (inputValue < 0) {
                                          inputValue = 0;
                                        }
                                        
                                        handlePurchaseItemChange(index, 'quantity', inputValue);
                                      }}
                                      onBlur={(e) => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        const currentValue = parseInt(e.target.value) || 0;
                                        
                                        // Clamp to max on blur if exceeded
                                        if (maxQty !== null && maxQty !== undefined && maxQty > 0 && currentValue > maxQty) {
                                          handlePurchaseItemChange(index, 'quantity', maxQty);
                                        }
                                      }}
                                      placeholder="Enter quantity"
                                      min="0"
                                      step="1"
                                      max={getMaxQuantity(item.itemName) || undefined}
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                      {(() => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        return maxQty !== null && maxQty !== undefined && maxQty > 0 && (
                                          <p className="text-xs text-gray-500 text-center">
                                            Max: {maxQty} available
                                          </p>
                                        );
                                      })()}
                                      {(() => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        return maxQty === 0 && item.itemName && (
                                          <p className="text-xs text-red-500 text-center">
                                            No empty cylinders available
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        // If price per 11.8kg is set, don't allow manual editing
                                        // Otherwise allow manual entry
                                        if (pricePer11_8kg > 0) {
                                          // Recalculate from base price
                                          const calculatedPrice = calculateUnitPriceFromBase(item.itemName, pricePer11_8kg);
                                          handlePurchaseItemChange(index, 'unitPrice', calculatedPrice);
                                        } else {
                                          handlePurchaseItemChange(index, 'unitPrice', e.target.value);
                                        }
                                      }}
                                      placeholder="Enter price per unit"
                                      min="0"
                                      step="0.01"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                      readOnly={pricePer11_8kg > 0 && item.itemName ? true : false}
                                    />
                                    {pricePer11_8kg > 0 && item.itemName && (
                                      <p className="text-xs text-gray-500 text-center mt-1">
                                        Auto-calculated
                                      </p>
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemovePurchaseItem(index)}
                                      disabled={getDisplayItems().length <= 1}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                  Grand Total:
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">
                                  {formatCurrency(calculatePurchaseTotal())}
                                </td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '') ? (
                      // Cylinder purchase form with dropdown for vendor items (matching gas purchase UI)
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor.category.name}
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
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '30%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '15%' }} />
                            </colgroup>
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
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getDisplayItems().map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.itemName}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'itemName',
                                        e.target.value
                                      )}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                    >
                                      <option value="">Select Item</option>
                                      {vendorItems.length > 0 ? (
                                        vendorItems.map((vendorItem) => (
                                          <option key={vendorItem.id} value={vendorItem.name}>
                                            {vendorItem.name}
                                          </option>
                                        ))
                                      ) : (
                                        defaultCylinderItems.map((defaultItem, idx) => (
                                          <option key={idx} value={defaultItem.itemName}>
                                            {defaultItem.itemName}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <div className="space-y-1">
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
                                      max={getMaxQuantity(item.itemName) || undefined}
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                      {(() => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        return maxQty !== null && maxQty !== undefined && maxQty > 0 && (
                                          <p className="text-xs text-gray-500 text-center">
                                            Max: {maxQty} available
                                          </p>
                                        );
                                      })()}
                                      {(() => {
                                        const maxQty = getMaxQuantity(item.itemName);
                                        return maxQty === 0 && item.itemName && (
                                          <p className="text-xs text-red-500 text-center">
                                            No items available
                                          </p>
                                        );
                                      })()}
                                    </div>
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
                                      step="1"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemovePurchaseItem(index)}
                                      disabled={getDisplayItems().length <= 1}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                  Grand Total:
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">
                                  {formatCurrency(calculatePurchaseTotal())}
                                </td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : vendor?.category?.slug === 'vaporizer_purchase' ? (
                      // Vaporizer purchase form with dropdown for vendor items (matching cylinder purchase UI)
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor.category.name}
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
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '30%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '15%' }} />
                            </colgroup>
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
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getDisplayItems().map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.itemName}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'itemName',
                                        e.target.value
                                      )}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                    >
                                      <option value="">Select Item</option>
                                      {vendorItems.length > 0 ? (
                                        vendorItems.map((vendorItem) => (
                                          <option key={vendorItem.id} value={vendorItem.name}>
                                            {vendorItem.name}
                                          </option>
                                        ))
                                      ) : (
                                        defaultVaporizerItems.map((defaultItem, idx) => (
                                          <option key={idx} value={defaultItem.itemName}>
                                            {defaultItem.itemName}
                                          </option>
                                        ))
                                      )}
                                    </select>
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
                                      step="1"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemovePurchaseItem(index)}
                                      disabled={getDisplayItems().length <= 1}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                  Grand Total:
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">
                                  {formatCurrency(calculatePurchaseTotal())}
                                </td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      // Generic form for other categories (valves, etc.) - matching cylinder purchase UI
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-lg font-semibold text-gray-900">
                            {vendor?.category?.name || 'Items'}
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

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '30%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '15%' }} />
                            </colgroup>
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
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Price per Item
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getDisplayItems().map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <select
                                      value={item.itemName}
                                      onChange={(e) => handlePurchaseItemChange(
                                        index,
                                        'itemName',
                                        e.target.value
                                      )}
                                      className="w-full border-0 focus:ring-1 bg-transparent text-sm font-medium text-gray-900"
                                    >
                                      <option value="">Select Item</option>
                                      {vendorItems.length > 0 ? (
                                        vendorItems.map((vendorItem) => (
                                          <option key={vendorItem.id} value={vendorItem.name}>
                                            {vendorItem.name}
                                          </option>
                                        ))
                                      ) : (
                                        <option value={item.itemName}>{item.itemName}</option>
                                      )}
                                    </select>
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
                                      step="1"
                                      className="text-center border-0 focus:ring-1 bg-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                    {formatCurrency(Number(item.totalPrice) || 0)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemovePurchaseItem(index)}
                                      disabled={getDisplayItems().length <= 1}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold text-gray-700">
                                  Grand Total:
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-900">
                                  {formatCurrency(calculatePurchaseTotal() || 0)}
                                </td>
                                <td className="border border-gray-300 px-4 py-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={purchaseFormData.paymentMethod}
                        onChange={(e) => setPurchaseFormData({
                          ...purchaseFormData,
                          paymentMethod: e.target.value
                        })}
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200"
                        required
                      >
                        <option value="CASH">💵 Cash</option>
                        <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                        <option value="CHECK">📄 Check</option>
                        <option value="CREDIT_CARD">💳 Credit Card</option>
                        <option value="DEBIT_CARD">💳 Debit Card</option>
                        <option value="WIRE_TRANSFER">🔗 Wire Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">Create Purchase Entry</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPurchaseForm(false);
                        
                        // Reset to default items based on vendor category
                        if (isCylinderPurchaseCategory(vendor?.category?.slug || '', vendor?.category?.name || '')) {
                          // Reset to one empty item for cylinder purchase (matching gas purchase behavior)
                          setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '', status: 'EMPTY' }]);
                        } else if (vendor?.category?.slug === 'gas_purchase') {
                          setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, category: '', cylinderCodes: '' }]);
                          // Reset price per 11.8kg
                          setPricePer11_8kg(0);
                        } else if (vendor?.category?.slug === 'vaporizer_purchase') {
                          // Start with one empty item row (matching cylinder purchase behavior)
                          setPurchaseItems([{ itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
                        } else if (vendor?.category?.slug === 'accessories_purchase') {
                          setPurchaseItems(defaultAccessoriesItems);
                        } else {
                          setPurchaseItems([{ itemName: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
                        }
                        
                        setPurchaseFormData({ invoiceNumber: '', notes: '', paidAmount: 0, paymentMethod: 'CASH' });
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
          {(!vendor.purchase_entries || vendor.purchase_entries.length === 0) ? (
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
              {getFilteredPurchaseEntries().map((purchase: any, index: number) => (
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
                      <div className="flex items-center gap-2">
                        {/* Make Payment Button for Unpaid/Partial Entries */}
                        {(purchase.status === 'PENDING' || purchase.status === 'PARTIAL') && (
                          <Button
                            onClick={() => {
                              const entryTotal = Number(purchase.totalPrice || purchase.items?.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0) || 0);
                              setSelectedInvoiceNumber(purchase.invoiceNumber || null);
                              setSelectedEntryTotal(entryTotal);
                              setShowPaymentModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <BanknotesIcon className="h-4 w-4 mr-1.5" />
                            Make Payment
                          </Button>
                        )}
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
                    </div>

                    {/* Items Table */}
                    <div className="mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {vendor?.category?.slug === 'accessories_purchase' && (
                              <th className="px-4 py-2 text-left font-medium text-gray-700">
                                Category
                              </th>
                            )}
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
                          {(purchase.items || [purchase]).map((item: any, itemIndex: number) => {
                            // For accessories purchases, get category from itemDescription
                            // itemDescription stores the category name for accessories purchases (just like itemName stores the item name)
                            // This ensures category is always available even if vendor item is deleted
                            let categoryDisplay = '-';
                            if (vendor?.category?.slug === 'accessories_purchase') {
                              // itemDescription contains the category for accessories purchases
                              // This is stored when the purchase is created, so it persists even if vendor item is deleted
                              if (item.itemDescription && item.itemDescription.trim()) {
                                categoryDisplay = item.itemDescription;
                              }
                            }
                            
                            return (
                              <tr key={itemIndex} className="border-t border-gray-200">
                                {vendor?.category?.slug === 'accessories_purchase' && (
                                  <td className="px-4 py-2 text-gray-600 font-medium">
                                    {categoryDisplay}
                                  </td>
                                )}
                                <td className="px-4 py-2">{item.itemName}</td>
                                <td className="px-4 py-2 text-right">{item.quantity}</td>
                                <td className="px-4 py-2 text-right">
                                  {formatCurrency(Math.round(Number(item.unitPrice)))}
                                </td>
                                {vendor?.category?.slug === 'cylinder_purchase' && (
                                  <td className="px-4 py-2 text-left text-xs text-gray-600">
                                    {item.cylinderCodes || '-'}
                                  </td>
                                )}
                                <td className="px-4 py-2 text-right font-medium">
                                  {formatCurrency(Math.round(Number(item.totalPrice)))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Purchase Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(Math.round(Number(purchase.totalPrice || purchase.items?.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0) || 0)))}
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
                            return formatCurrency(Math.round(totalPaid));
                          })()}
                        </div>
                      </div>
                      
                      {/* Net Running Balance */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Net Running Balance</div>
                        <div className={`text-lg font-semibold ${
                          (() => {
                            // Calculate running balance up to this transaction
                            // Find the index of the first entry with this invoice number
                            const firstEntryId = purchase.items?.[0]?.id || purchase.id;
                            const currentIndex = vendor.purchase_entries?.findIndex(p => p.id === firstEntryId) || 0;
                            const transactionsUpToThis = vendor.purchase_entries?.slice(currentIndex) || [];
                            
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
                            
                            return runningBalance < 0 ? 'text-red-600' : 'text-green-600';
                          })()
                        }`}>
                          {(() => {
                            // Calculate running balance up to this transaction
                            // Find the index of the first entry with this invoice number
                            const firstEntryId = purchase.items?.[0]?.id || purchase.id;
                            const currentIndex = vendor.purchase_entries?.findIndex(p => p.id === firstEntryId) || 0;
                            const transactionsUpToThis = vendor.purchase_entries?.slice(currentIndex) || [];
                            
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
                            
                            return formatCurrency(Math.round(runningBalance));
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
                                  {formatCurrency(Math.round(Number(payment.amount)))}
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
          {(!vendor.inventories || vendor.inventories.length === 0) ? (
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
              {vendor.inventories?.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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
                      {formatCurrency(Math.round(financialReport.cashOut))}
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
                      {formatCurrency(Math.round(financialReport.cashIn))}
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
                      financialReport.netBalance > 0 ? 'text-green-600' : financialReport.netBalance < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(Math.round(financialReport.netBalance))}
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
                        {formatCurrency(Math.round(financialReport.totalPayments))}
                      </span>
                    </div>
                    {financialReport.directPayments > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200 pl-4">
                        <span className="text-sm text-gray-600">• Direct Payments:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(Math.round(financialReport.directPayments))}
                        </span>
                      </div>
                    )}
                    {financialReport.purchasePayments > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200 pl-4">
                        <span className="text-sm text-gray-600">• Purchase Payments:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(Math.round(financialReport.purchasePayments))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700 font-semibold">Outstanding Balance:</span>
                      <span className={`font-bold text-lg ${
                        financialReport.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(Math.round(financialReport.outstandingBalance))}
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
                                    {formatCurrency(Math.round(Number(payment.amount)))}
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
                                {payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString() : 'N/A'}
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
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoiceNumber(null);
            setSelectedEntryTotal(null);
          }}
          vendorId={vendorId}
          vendorName={vendor.companyName || vendor.name || 'Unknown Vendor'}
          outstandingBalance={vendor.financialSummary.outstandingBalance}
          onPaymentSuccess={handlePaymentSuccess}
          invoiceNumber={selectedInvoiceNumber || undefined}
          purchaseEntryTotal={selectedEntryTotal || undefined}
        />
      )}

      {/* Edit Vendor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Vendor Details
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleEditVendor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name *
                    </label>
                    <Input
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      placeholder="e.g., Khattak Plant, Ali Dealer"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <Input
                      value={editFormData.contactPerson}
                      onChange={(e) => setEditFormData({...editFormData, contactPerson: e.target.value})}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <Input
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <Input
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    placeholder="Full address"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit">Update Vendor</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Item
                </h3>
                <button
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <Input
                    value={editItemFormData.name}
                    onChange={(e) => setEditItemFormData({...editItemFormData, name: e.target.value})}
                    placeholder="Enter item name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Input
                    value={editItemFormData.category}
                    onChange={(e) => setEditItemFormData({...editItemFormData, category: e.target.value})}
                    placeholder="Enter category"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={editItemFormData.description}
                    onChange={(e) => setEditItemFormData({...editItemFormData, description: e.target.value})}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button type="submit">Update Item</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditItemModal(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {vendor && (
        <VendorExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          vendorName={vendor.companyName || vendor.name || 'Unknown Vendor'}
          vendorId={vendorId}
          purchaseEntries={vendor.purchase_entries || []}
          paymentHistory={directPayments}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && vendor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Vendor
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This action cannot be undone. This will permanently delete the vendor and all associated data.
                </p>
                <div className="mb-4 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    To confirm, please type <span className="font-bold text-gray-900">"{vendor.name || vendor.companyName || 'Unnamed Vendor'}"</span> to proceed:
                  </p>
                  <Input
                    type="text"
                    value={deleteConfirmationName}
                    onChange={(e) => setDeleteConfirmationName(e.target.value)}
                    placeholder="Enter vendor name"
                    className="w-full"
                    autoFocus
                  />
                  {deleteConfirmationName.trim() !== '' && 
                   deleteConfirmationName.trim() !== (vendor.name || vendor.companyName || '').trim() && (
                    <p className="mt-2 text-sm text-red-600">
                      The name does not match. Please type the exact vendor name.
                    </p>
                  )}
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteVendor}
                    disabled={
                      deleteConfirmationName.trim() !== (vendor.name || vendor.companyName || '').trim()
                    }
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
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

