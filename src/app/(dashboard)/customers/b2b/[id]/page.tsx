'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useInventoryValidation } from '@/hooks/useInventoryValidation';
import { useCylinderStock } from '@/hooks/useCylinderStock';
import { ProfessionalAccessorySelector } from '@/components/ui/ProfessionalAccessorySelector';
import { getCylinderTypeDisplayName, getCapacityFromTypeString } from '@/lib/cylinder-utils';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalculatorIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface B2BCustomer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  address: string | null;
  creditLimit: number | null;
  paymentTermsDays: number;
  ledgerBalance: number;
  domestic118kgDue: number;
  standard15kgDue: number;
  commercial454kgDue: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  marginCategory?: {
    id: string;
    name: string;
    marginPerKg: number;
  };
}

interface B2BTransaction {
  id: string;
  transactionType: string;
  billSno: string;
  date: string;
  time: string;
  totalAmount: number;
  paidAmount?: number | null;
  unpaidAmount?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'FULLY_PAID' | null;
  paymentReference: string | null;
  notes: string | null;
  voided: boolean;
  voidedBy?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  items: B2BTransactionItem[];
  runningBalance?: number;
  balanceImpact?: number;
  createdAt?: string;
}

interface B2BTransactionItem {
  id: string;
  productName: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  cylinderType: string | null;
  returnedCondition: string | null;
  remainingKg: number | null;
  originalSoldPrice: number | null;
  buybackRate: number | null;
  buybackPricePerItem: number | null;
  buybackTotal: number | null;
}

interface CustomerLedgerResponse {
  customer: B2BCustomer;
  transactions: B2BTransaction[];
  summary?: {
    netBalance: number; // Negative when customer owes, positive when customer has credit
    totalIn: number; // Payments received
    totalOut: number; // Sales made
    ledgerBalance: number; // Original for internal calculations
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function B2BCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<B2BCustomer | null>(null);
  const [transactions, setTransactions] = useState<B2BTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    netBalance: number;
    totalIn: number;
    totalOut: number;
  } | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Date filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Report states
  const [reportDateFilter, setReportDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showReportDateFilter, setShowReportDateFilter] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Transaction form states
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'SALE' | 'PAYMENT' | 'BUYBACK' | 'RETURN_EMPTY' | 'UNIFIED'>('UNIFIED');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));

  // Unified form section collapse states
  const [deliveryExpanded, setDeliveryExpanded] = useState(true);
  const [returnsExpanded, setReturnsExpanded] = useState(false);
  const [accessoriesExpanded, setAccessoriesExpanded] = useState(false);
  const [paymentExpanded, setPaymentExpanded] = useState(false);

  // Return items for unified form (separate from delivery gasItems concept)
  const [returnItems, setReturnItems] = useState([
    { cylinderType: '', emptyReturned: 0, buybackQuantity: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackCredit: 0 }
  ]);

  // Transaction detail modal states
  const [selectedTransaction, setSelectedTransaction] = useState<B2BTransaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [undoingTransaction, setUndoingTransaction] = useState(false);

  // Payment form states (for separate PAYMENT transactions)
  const [paymentAgainst, setPaymentAgainst] = useState('');
  const [paymentQuantity, setPaymentQuantity] = useState(0);

  // Payment states for SALE form (payment on sale)
  const [salePaymentAmount, setSalePaymentAmount] = useState(0);
  const [salePaymentMethod, setSalePaymentMethod] = useState('CASH');
  const [salePaymentReference, setSalePaymentReference] = useState('');

  // Gas transaction form data - now supports dynamic rows
  const [gasItems, setGasItems] = useState([
    { cylinderType: '', delivered: 0, pricePerItem: 0, emptyReturned: 0, remainingDue: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackPricePerItem: 0, buybackTotal: 0 }
  ]);

  // Available cylinder types from inventory
  const [availableCylinderTypes, setAvailableCylinderTypes] = useState<Array<{
    type: string;
    typeEnum: string;
    full: number;
    empty: number;
    total: number;
  }>>([]);
  const [loadingCylinderTypes, setLoadingCylinderTypes] = useState(true);

  // Pricing information
  const [pricingInfo, setPricingInfo] = useState<any>(null);

  // Cylinder dues (dynamic)
  const [cylinderDues, setCylinderDues] = useState<Array<{
    cylinderType: string;
    displayName: string;
    count: number;
  }>>([]);
  const [loadingCylinderDues, setLoadingCylinderDues] = useState(false);

  // Inventory validation
  const { validateInventory, isFieldValid, hasAnyErrors, clearValidationError, clearAllValidationErrors } = useInventoryValidation();

  // Cylinder stock information
  const { cylinders: cylinderStock, loading: stockLoading, getCylinderStock } = useCylinderStock();

  // Accessory validation state
  const [hasAccessoryErrors, setHasAccessoryErrors] = useState(false);

  // Enhanced validation state for auto-scroll
  const [hasInventoryErrors, setHasInventoryErrors] = useState(false);
  const [firstInvalidInventoryItem, setFirstInvalidInventoryItem] = useState<{ category: string, index: number } | null>(null);
  const [firstInvalidCylinderIndex, setFirstInvalidCylinderIndex] = useState<number | null>(null);

  // Margin category editing
  const [showCategoryEdit, setShowCategoryEdit] = useState(false);
  const [marginCategories, setMarginCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Accessories transaction form data - now with professional structure
  const [accessoryItems, setAccessoryItems] = useState<Array<{
    id: string;
    category: string;
    itemType: string;
    quantity: number;
    costPerPiece: number;
    pricePerItem: number;
    totalPrice: number;
    availableStock: number;
    // Vaporizer-specific fields
    isVaporizer: boolean;
    usagePrice: number; // Cost Price - for charging usage (not deducted from inventory)
    sellingPrice: number; // Selling Price - for selling vaporizer (deducted from inventory)
  }>>([]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerLedger();
    }
  }, [customerId, pagination.page, dateFilter.startDate, dateFilter.endDate]);

  // Close date filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDateFilter && !target.closest('.date-filter-container')) {
        setShowDateFilter(false);
      }
      if (showReportDateFilter && !target.closest('.report-date-filter-container')) {
        setShowReportDateFilter(false);
      }
    };

    if (showDateFilter || showReportDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDateFilter, showReportDateFilter]);

  // Fetch margin categories for B2B customers
  useEffect(() => {
    const fetchMarginCategories = async () => {
      try {
        const response = await fetch('/api/admin/margin-categories?customerType=B2B&activeOnly=true');
        if (response.ok) {
          const data = await response.json();
          setMarginCategories(data);
        }
      } catch (error) {
        console.error('Error fetching margin categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchMarginCategories();
  }, []);

  // Fetch available cylinder types from inventory
  useEffect(() => {
    const fetchAvailableCylinderTypes = async () => {
      try {
        setLoadingCylinderTypes(true);
        const response = await fetch('/api/inventory/cylinders/stats');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            // Show all cylinder types from inventory (including those with 0 stock)
            // This allows selection of any cylinder type that exists in the inventory
            setAvailableCylinderTypes(data.stats);
          }
        }
      } catch (error) {
        console.error('Error fetching available cylinder types:', error);
      } finally {
        setLoadingCylinderTypes(false);
      }
    };

    fetchAvailableCylinderTypes();
  }, []);

  // Fetch cylinder dues dynamically
  useEffect(() => {
    const fetchCylinderDues = async () => {
      if (!customerId) return;

      try {
        setLoadingCylinderDues(true);
        const response = await fetch(`/api/customers/b2b/${customerId}/cylinder-dues`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.cylinderDues) {
            setCylinderDues(data.cylinderDues);
          }
        }
      } catch (error) {
        console.error('Error fetching cylinder dues:', error);
      } finally {
        setLoadingCylinderDues(false);
      }
    };

    if (customer) {
      fetchCylinderDues();
    }
  }, [customerId, customer]);


  // Update gas items with current cylinder dues when customer data loads
  useEffect(() => {
    if (customer) {
      setGasItems(prevItems =>
        prevItems.map(item => ({
          ...item,
          remainingDue: getCurrentCylinderDue(item.cylinderType)
        }))
      );
    }
  }, [customer]);

  // Auto-populate original prices from pricing system when pricing info is available (for BUYBACK)
  // This is now handled in updateGasItem when cylinderType is selected

  // Update remaining due calculation when transaction type changes
  useEffect(() => {
    if (customer) {
      setGasItems(prevItems =>
        prevItems.map(item => {
          const currentDue = getCurrentCylinderDue(item.cylinderType);
          let newRemainingDue = currentDue;

          if (transactionType === 'SALE') {
            // For sales: add delivered cylinders to current due
            newRemainingDue = currentDue + (item.delivered || 0);
          } else if (transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') {
            // For returns: subtract returned cylinders from current due
            newRemainingDue = Math.max(0, currentDue - (item.emptyReturned || 0));
          }

          return {
            ...item,
            remainingDue: newRemainingDue
          };
        })
      );
    }
  }, [transactionType, customer]);

  // Check for cylinder validation errors when gasItems or validation state changes
  useEffect(() => {
    checkCylinderValidationErrors();
  }, [gasItems, cylinderStock, transactionType]);


  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      console.log('Fetching customer ledger for customer:', customerId);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (dateFilter.startDate) {
        params.append('startDate', dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        params.append('endDate', dateFilter.endDate);
      }

      const response = await fetch(`/api/customers/b2b/${customerId}/ledger?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customer ledger');
      }

      const data: CustomerLedgerResponse = await response.json();
      console.log('Customer ledger data:', data);
      console.log('Customer ledger balance:', data.customer.ledgerBalance);
      console.log('Transactions count:', data.transactions.length);
      setCustomer(data.customer);
      setTransactions(data.transactions);
      setPagination(data.pagination);

      // Set summary if available, otherwise calculate from customer balance
      if (data.summary) {
        setSummary(data.summary);
      } else {
        // Fallback: calculate from customer balance (negative when customer owes)
        const netBalance = -(data.customer.ledgerBalance);
        setSummary({
          netBalance,
          totalIn: 0,
          totalOut: 0
        });
      }

      // Fetch calculated prices for this customer
      await fetchCalculatedPrices();
    } catch (err) {
      console.error('Error fetching customer ledger:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalculatedPrices = async () => {
    try {
      const response = await fetch(`/api/pricing/calculate?customerId=${customerId}&customerType=B2B`);

      if (response.ok) {
        const pricingData = await response.json();
        setPricingInfo(pricingData);
      }
    } catch (error) {
      console.error('Error fetching calculated prices:', error);
    }
  };

  const handleDownloadReport = async () => {
    if (!customer) return;

    setDownloadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportDateFilter.startDate) {
        params.append('startDate', reportDateFilter.startDate);
      }
      if (reportDateFilter.endDate) {
        params.append('endDate', reportDateFilter.endDate);
      }

      const response = await fetch(`/api/customers/b2b/${customerId}/report?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `B2B-Transaction-Report-${customer.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowReportDateFilter(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download transaction report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const updateCustomerCategory = async () => {
    if (!selectedCategoryId) {
      alert('Please select a category first');
      return;
    }

    try {
      setUpdatingCategory(true);

      const response = await fetch(`/api/customers/b2b/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marginCategoryId: selectedCategoryId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to update customer category: ${errorData.error || 'Unknown error'}`);
      }

      // Refresh customer data and pricing
      await Promise.all([
        fetchCustomerLedger(),
        fetchCalculatedPrices()
      ]);

      setShowCategoryEdit(false);
      setSelectedCategoryId('');
      alert('Customer margin category updated successfully!');
    } catch (error) {
      console.error('Error updating customer category:', error);
      alert(`Failed to update customer category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleModalOpen = () => {
    setSelectedCategoryId(customer?.marginCategory?.id || '');
    setShowCategoryEdit(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK');
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCylinderTypeDisplay = (type: string | null) => {
    if (!type) return 'N/A';
    return getCylinderTypeDisplayName(type);
  };

  // Get full stock count for a cylinder type (FULL status only)
  // Aggregates full count for the selected cylinder type from inventory
  const getFullStockCount = (cylinderType: string): number => {
    if (!cylinderType) return 0;
    // Find the selected cylinder stat - match by typeEnum
    const cylinderStat = availableCylinderTypes.find(stat => stat.typeEnum === cylinderType);
    // Return the full count (cylinders with FULL status) for the selected type
    return cylinderStat ? cylinderStat.full : 0;
  };

  // Get display name for cylinder type from available types
  const getCylinderDisplayName = (cylinderType: string): string => {
    if (!cylinderType) return 'Select cylinder type';
    const cylinderStat = availableCylinderTypes.find(stat => stat.typeEnum === cylinderType);
    return cylinderStat ? cylinderStat.type : getCylinderTypeDisplayName(cylinderType);
  };

  // Get display name for transaction item (for ledger display)
  const getTransactionItemDisplayName = (item: B2BTransactionItem): string => {
    if (item.cylinderType) {
      // Try to get from availableCylinderTypes first (has proper typeName)
      const cylinderStat = availableCylinderTypes.find(stat => stat.typeEnum === item.cylinderType);
      if (cylinderStat) {
        return cylinderStat.type;
      }
      // Fallback to utility function
      return getCylinderTypeDisplayName(item.cylinderType);
    }
    // For non-cylinder items, use productName
    return item.productName;
  };

  // Add a new gas item row
  const addGasItemRow = () => {
    setGasItems([...gasItems, {
      cylinderType: '',
      delivered: 0,
      pricePerItem: 0,
      emptyReturned: 0,
      remainingDue: 0,
      remainingKg: 0,
      originalSoldPrice: 0,
      buybackRate: 0.6,
      buybackPricePerItem: 0,
      buybackTotal: 0
    }]);
  };

  // Remove a gas item row
  const removeGasItemRow = (index: number) => {
    if (gasItems.length > 1) {
      const newItems = gasItems.filter((_, i) => i !== index);
      setGasItems(newItems);
    }
  };

  const calculateBuybackAmount = (originalPrice: number, remainingKg: number, totalKg: number, buybackRate: number) => {
    const remainingPercentage = remainingKg / totalKg;
    return originalPrice * remainingPercentage * buybackRate;
  };

  const updateGasItem = (index: number, field: string, value: any) => {
    const newItems = [...gasItems];
    const oldItem = newItems[index];
    newItems[index] = { ...newItems[index], [field]: value };

    // Reset delivered quantity when cylinder type changes
    if (field === 'cylinderType' && value !== oldItem.cylinderType && oldItem.cylinderType !== '') {
      newItems[index].delivered = 0;
    }

    // Auto-calculate price when cylinder type is selected (based on customer's margin category)
    if (field === 'cylinderType' && value && pricingInfo && pricingInfo.calculation?.endPricePerKg) {
      const cylinderCapacity = getCapacityFromTypeString(value);
      if (cylinderCapacity > 0) {
        // Calculate price: (costPerKg + marginPerKg) × cylinderCapacity
        const calculatedPrice = Math.round(pricingInfo.calculation.endPricePerKg * cylinderCapacity);
        if (transactionType === 'SALE') {
          newItems[index].pricePerItem = calculatedPrice;
        } else if (transactionType === 'BUYBACK') {
          // For buyback, set originalSoldPrice (the price the cylinder was originally sold at)
          newItems[index].originalSoldPrice = calculatedPrice;
        }
      }
    }

    // Auto-apply calculated price when delivered quantity is set (fallback for old logic)
    if (field === 'delivered' && value > 0 && pricingInfo && !newItems[index].pricePerItem) {
      const cylinderType = newItems[index].cylinderType;
      if (cylinderType) {
        const cylinderCapacity = getCapacityFromTypeString(cylinderType);
        if (cylinderCapacity > 0 && pricingInfo.calculation?.endPricePerKg) {
          const calculatedPrice = Math.round(pricingInfo.calculation.endPricePerKg * cylinderCapacity);
          newItems[index].pricePerItem = calculatedPrice;
        }
      }
    }

    // Calculate buyback if it's a buyback transaction
    if (transactionType === 'BUYBACK') {
      const buybackRate = newItems[index].buybackRate || 0.6; // Default to 60% if not set
      if (newItems[index].remainingKg > 0 && newItems[index].originalSoldPrice > 0 && newItems[index].cylinderType) {
        // Get total capacity dynamically from cylinder type
        const totalKg = getCapacityFromTypeString(newItems[index].cylinderType);
        if (totalKg > 0) {
          const buybackAmount = calculateBuybackAmount(newItems[index].originalSoldPrice, newItems[index].remainingKg, totalKg, buybackRate);
          newItems[index].buybackPricePerItem = buybackAmount;
          newItems[index].buybackTotal = buybackAmount * (newItems[index].emptyReturned || 0);
        } else {
          newItems[index].buybackPricePerItem = 0;
          newItems[index].buybackTotal = 0;
        }
      } else {
        // Reset buyback amounts if conditions not met
        newItems[index].buybackPricePerItem = 0;
        newItems[index].buybackTotal = 0;
      }
    }

    // Calculate remaining cylinders due based on transaction type
    if (customer) {
      const currentDue = getCurrentCylinderDue(newItems[index].cylinderType);
      let newRemainingDue = currentDue;

      if (transactionType === 'SALE') {
        // For sales: add delivered cylinders to current due
        newRemainingDue = currentDue + (newItems[index].delivered || 0);
      } else if (transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') {
        // For returns: subtract returned cylinders from current due
        newRemainingDue = Math.max(0, currentDue - (newItems[index].emptyReturned || 0));
      }

      newItems[index].remainingDue = newRemainingDue;
    }

    setGasItems(newItems);

    // Validate inventory when quantity changes
    if (field === 'delivered' && transactionType === 'SALE') {
      const cylinders = newItems
        .filter(item => item.delivered > 0)
        .map(item => ({
          cylinderType: item.cylinderType,
          requested: item.delivered
        }));

      const accessories = accessoryItems
        .filter(item => item.quantity > 0)
        .map(item => ({
          itemName: item.category,
          itemType: item.category === 'Stove' ? 'stove' :
            item.category.includes('Regulator') ? 'regulator' :
              item.category.includes('Pipe') ? 'gasPipe' : 'product',
          quality: item.itemType || '',
          requested: item.quantity
        }));

      validateInventory(cylinders, accessories);
    }

    // Check if we need to clear validation errors for reduced quantities
    if (field === 'delivered') {
      // Trigger validation to check if the new quantity is valid
      setTimeout(() => {
        const cylinders = newItems
          .filter(item => item.delivered > 0)
          .map(item => ({
            cylinderType: item.cylinderType,
            requested: item.delivered
          }));

        const accessories = accessoryItems
          .filter(item => item.quantity > 0)
          .map(item => ({
            itemName: item.category,
            itemType: item.category === 'Stove' ? 'stove' :
              item.category.includes('Regulator') ? 'regulator' :
                item.category.includes('Pipe') ? 'gasPipe' : 'product',
            quality: item.itemType || '',
            requested: item.quantity
          }));

        validateInventory(cylinders, accessories);
      }, 100);
    }
  };

  // Handle inventory validation changes from CategoryAccessorySelector
  const handleInventoryValidationChange = (hasErrors: boolean, firstInvalidItem?: { category: string, index: number }) => {
    setHasInventoryErrors(hasErrors);
    setFirstInvalidInventoryItem(firstInvalidItem || null);
  };

  // Check for cylinder validation errors
  const checkCylinderValidationErrors = () => {
    if (transactionType !== 'SALE') {
      setFirstInvalidCylinderIndex(null);
      return;
    }

    let firstInvalidIndex: number | null = null;
    const hasErrors = gasItems.some((item, index) => {
      if (item.delivered > 0) {
        const stockInfo = getCylinderStock(item.cylinderType);
        const isExceedingStock = stockInfo && item.delivered > stockInfo.available;
        if (isExceedingStock) {
          if (firstInvalidIndex === null) {
            firstInvalidIndex = index;
          }
          return true;
        }
      }
      return false;
    });

    setFirstInvalidCylinderIndex(firstInvalidIndex);
  };

  // Scroll to and focus on the first invalid cylinder item
  const scrollToInvalidCylinderItem = () => {
    if (firstInvalidCylinderIndex !== null) {
      const elementId = `cylinder-item-${firstInvalidCylinderIndex}`;
      const element = document.getElementById(elementId);

      if (element) {
        // Smooth scroll to the element
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Add a temporary highlight effect
        element.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');

        // Focus on the quantity input within that cylinder item
        const quantityInput = element.querySelector('input[type="number"]') as HTMLInputElement;
        if (quantityInput) {
          setTimeout(() => {
            quantityInput.focus();
            quantityInput.select(); // Select the text for easy editing
          }, 500); // Wait for scroll to complete
        }

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
        }, 3000);
      }
    }
  };

  // Scroll to and focus on the first invalid inventory item
  const scrollToInvalidInventoryItem = () => {
    if (firstInvalidInventoryItem) {
      const { category, index } = firstInvalidInventoryItem;
      const elementId = `inventory-item-${category}-${index}`;
      const element = document.getElementById(elementId);

      if (element) {
        // Smooth scroll to the element
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Add a temporary highlight effect
        element.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');

        // Focus on the quantity input within that inventory item
        const quantityInput = element.querySelector('input[type="number"]') as HTMLInputElement;
        if (quantityInput) {
          setTimeout(() => {
            quantityInput.focus();
            quantityInput.select(); // Select the text for easy editing
          }, 500); // Wait for scroll to complete
        }

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
        }, 3000);
      }
    }
  };

  const applyCalculatedPrices = () => {
    if (!pricingInfo) return;

    const updatedItems = gasItems.map(item => {
      let calculatedPrice = 0;

      switch (item.cylinderType) {
        case 'DOMESTIC_11_8KG':
          calculatedPrice = pricingInfo.finalPrices.domestic118kg;
          break;
        case 'STANDARD_15KG':
          calculatedPrice = pricingInfo.finalPrices.standard15kg;
          break;
        case 'COMMERCIAL_45_4KG':
          calculatedPrice = pricingInfo.finalPrices.commercial454kg;
          break;
      }

      return {
        ...item,
        pricePerItem: calculatedPrice > 0 ? calculatedPrice : item.pricePerItem
      };
    });

    setGasItems(updatedItems);
  };

  const getCurrentCylinderDue = (cylinderType: string) => {
    if (!cylinderType) return 0;

    // Use dynamic cylinder dues from API
    const due = cylinderDues.find(d => d.cylinderType === cylinderType);
    return due ? due.count : 0;
  };

  // ========== UNIFIED TRANSACTION HELPERS ==========

  // Add a new return item row
  const addReturnItemRow = () => {
    setReturnItems([...returnItems, {
      cylinderType: '',
      emptyReturned: 0,
      buybackQuantity: 0,
      remainingKg: 0,
      originalSoldPrice: 0,
      buybackRate: 0.6,
      buybackCredit: 0
    }]);
  };

  // Remove a return item row
  const removeReturnItemRow = (index: number) => {
    if (returnItems.length > 1) {
      const newItems = returnItems.filter((_, i) => i !== index);
      setReturnItems(newItems);
    }
  };

  // Update return item
  const updateReturnItem = (index: number, field: string, value: any) => {
    const newItems = [...returnItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-set original price when cylinder type is selected
    if (field === 'cylinderType' && value && pricingInfo && pricingInfo.calculation?.endPricePerKg) {
      const cylinderCapacity = getCapacityFromTypeString(value);
      if (cylinderCapacity > 0) {
        const calculatedPrice = Math.round(pricingInfo.calculation.endPricePerKg * cylinderCapacity);
        newItems[index].originalSoldPrice = calculatedPrice;
      }
    }

    // Calculate buyback credit
    const item = newItems[index];
    if (item.buybackQuantity > 0 && item.remainingKg > 0 && item.originalSoldPrice > 0 && item.cylinderType) {
      const totalKg = getCapacityFromTypeString(item.cylinderType);
      if (totalKg > 0) {
        const remainingPercentage = item.remainingKg / totalKg;
        const buybackRate = item.buybackRate || 0.6;
        const creditPerUnit = item.originalSoldPrice * remainingPercentage * buybackRate;
        newItems[index].buybackCredit = creditPerUnit * item.buybackQuantity;
      }
    } else {
      newItems[index].buybackCredit = 0;
    }

    setReturnItems(newItems);
  };

  // Calculate unified transaction summary
  const getUnifiedTransactionSummary = () => {
    // Delivery totals
    const deliveryTotal = gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0);
    const accessoryTotal = accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Return totals
    const totalEmptyReturned = returnItems.reduce((sum, item) => sum + item.emptyReturned, 0);
    const totalBuybackQuantity = returnItems.reduce((sum, item) => sum + item.buybackQuantity, 0);
    const totalBuybackCredit = returnItems.reduce((sum, item) => sum + item.buybackCredit, 0);

    // Cylinder counts
    const totalDelivered = gasItems.reduce((sum, item) => sum + item.delivered, 0);
    const totalReturned = totalEmptyReturned + totalBuybackQuantity;

    // Net calculations
    const grossSaleAmount = deliveryTotal + accessoryTotal;
    const netAmount = grossSaleAmount - totalBuybackCredit;
    const balanceImpact = netAmount - salePaymentAmount; // Positive = customer owes, negative = overpaid

    // Check what sections have data
    const hasDelivery = gasItems.some(item => item.delivered > 0);
    const hasAccessories = accessoryItems.some(item => item.quantity > 0);
    const hasReturns = returnItems.some(item => item.emptyReturned > 0 || item.buybackQuantity > 0);
    const hasPayment = salePaymentAmount > 0;

    return {
      deliveryTotal,
      accessoryTotal,
      grossSaleAmount,
      totalEmptyReturned,
      totalBuybackQuantity,
      totalBuybackCredit,
      totalDelivered,
      totalReturned,
      netAmount,
      paymentReceived: salePaymentAmount,
      balanceImpact,
      hasDelivery,
      hasAccessories,
      hasReturns,
      hasPayment
    };
  };

  // Reset unified form
  const resetUnifiedForm = () => {
    setGasItems([{ cylinderType: '', delivered: 0, pricePerItem: 0, emptyReturned: 0, remainingDue: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackPricePerItem: 0, buybackTotal: 0 }]);
    setReturnItems([{ cylinderType: '', emptyReturned: 0, buybackQuantity: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackCredit: 0 }]);
    setAccessoryItems([]);
    setSalePaymentAmount(0);
    setSalePaymentMethod('CASH');
    setSalePaymentReference('');
    setDeliveryExpanded(true);
    setReturnsExpanded(false);
    setAccessoriesExpanded(false);
    setPaymentExpanded(false);
    setError(null);
    setHasAccessoryErrors(false);
    clearAllValidationErrors();
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Check for cylinder validation errors and scroll to first invalid item
      if (firstInvalidCylinderIndex !== null) {
        scrollToInvalidCylinderItem();
        return;
      }

      // Check for inventory validation errors and scroll to first invalid item
      if (hasInventoryErrors) {
        scrollToInvalidInventoryItem();
        return;
      }

      // Get the unified transaction summary
      const summary = getUnifiedTransactionSummary();

      // Validate that there is at least something in the transaction
      const hasAnyData = summary.hasDelivery || summary.hasAccessories || summary.hasReturns || summary.hasPayment;

      if (!hasAnyData) {
        setError('Please add at least one item or action before creating a transaction.');
        return;
      }

      // Prepare gas items for delivery (sales)
      const deliveryGasItems = gasItems.filter(item => item.delivered > 0).map(item => ({
        cylinderType: item.cylinderType,
        delivered: item.delivered,
        pricePerItem: item.pricePerItem,
        emptyReturned: 0, // Delivery only
      }));

      // Prepare return items - SEPARATE items for empty returns and buyback
      // This ensures proper tracking: empty returns have no credit, buyback has credit
      const returnGasItems: any[] = [];

      // Validate return items have cylinder type selected
      for (let index = 0; index < returnItems.length; index++) {
        const item = returnItems[index];

        // Check for empty return without cylinder type
        if (item.emptyReturned > 0 && (!item.cylinderType || item.cylinderType.trim() === '')) {
          setError(`Please select a cylinder type for return item ${index + 1} in the Cylinders Returned section.`);
          // Expand the returns section so user can see the issue
          setReturnsExpanded(true);
          // Scroll to error message after a brief delay
          setTimeout(() => {
            const errorElement = document.querySelector('.bg-red-50.border-l-4');
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          return;
        }

        // Check for buyback without cylinder type
        if (item.buybackQuantity > 0 && (!item.cylinderType || item.cylinderType.trim() === '')) {
          setError(`Please select a cylinder type for buyback item ${index + 1} in the Cylinders buyback section.`);
          // Expand the returns section so user can see the issue
          setReturnsExpanded(true);
          // Scroll to error message after a brief delay
          setTimeout(() => {
            const errorElement = document.querySelector('.bg-red-50.border-l-4');
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          return;
        }

        // Skip items without cylinder type or quantity
        if (!item.cylinderType || item.cylinderType.trim() === '') {
          continue;
        }

        // Add EMPTY RETURN item (no remaining gas, no credit)
        if (item.emptyReturned > 0) {
          returnGasItems.push({
            cylinderType: item.cylinderType,
            delivered: 0,
            emptyReturned: item.emptyReturned,
            pricePerItem: 0,
            // No buyback fields for empty returns
            remainingKg: 0,
            originalSoldPrice: 0,
            buybackRate: 0,
            buybackTotal: 0,
            isBuyback: false,
          });
        }

        // Add BUYBACK item (has remaining gas and credit)
        if (item.buybackQuantity > 0) {
          returnGasItems.push({
            cylinderType: item.cylinderType,
            delivered: 0,
            emptyReturned: item.buybackQuantity, // Backend uses emptyReturned for cylinder dues
            pricePerItem: 0,
            // Buyback-specific fields
            remainingKg: item.remainingKg,
            originalSoldPrice: item.originalSoldPrice,
            buybackRate: item.buybackRate,
            buybackTotal: item.buybackCredit,
            isBuyback: true,
          });
        }
      }

      // Combine all gas items
      const allGasItems = [...deliveryGasItems, ...returnGasItems];

      console.log(`Processing unified transaction: ${deliveryGasItems.length} delivery items, ${returnGasItems.length} return items`);

      // Determine effective transaction type for backend
      // Priority: If has delivery → SALE (backend handles everything in SALE)
      // If only payment → PAYMENT
      // If only returns → RETURN_EMPTY or BUYBACK
      let effectiveTransactionType: string = 'SALE';
      if (!summary.hasDelivery && !summary.hasAccessories) {
        if (summary.hasPayment && !summary.hasReturns) {
          effectiveTransactionType = 'PAYMENT';
        } else if (summary.hasReturns && summary.totalBuybackCredit > 0) {
          effectiveTransactionType = 'BUYBACK';
        } else if (summary.hasReturns) {
          effectiveTransactionType = 'RETURN_EMPTY';
        } else if (summary.hasPayment) {
          effectiveTransactionType = 'PAYMENT';
        }
      }

      // Calculate total amount based on what's in the transaction
      const totalAmount = effectiveTransactionType === 'PAYMENT'
        ? salePaymentAmount
        : effectiveTransactionType === 'BUYBACK'
          ? summary.totalBuybackCredit
          : summary.netAmount;

      // Check if this is a fully paid transaction
      const isFullyPaid = salePaymentAmount > 0 && Math.abs(salePaymentAmount - summary.netAmount) < 0.01;

      // Build notes based on what's in the transaction
      let notes = '';
      const noteParts = [];
      if (summary.hasDelivery) noteParts.push(`${summary.totalDelivered} cylinders delivered`);
      if (summary.totalEmptyReturned > 0) noteParts.push(`${summary.totalEmptyReturned} empty returned`);
      if (summary.totalBuybackQuantity > 0) noteParts.push(`${summary.totalBuybackQuantity} buyback (${formatCurrency(summary.totalBuybackCredit)} credit)`);
      if (summary.hasAccessories) noteParts.push(`accessories sold`);
      if (summary.hasPayment) noteParts.push(`${formatCurrency(salePaymentAmount)} payment received via ${salePaymentMethod}`);
      notes = noteParts.join(' • ');

      const transactionData = {
        transactionType: effectiveTransactionType,
        customerId,
        date: transactionDate,
        time: transactionTime,
        totalAmount,
        // Payment info
        paidAmount: salePaymentAmount > 0 ? salePaymentAmount : undefined,
        paymentMethod: salePaymentAmount > 0 ? salePaymentMethod : undefined,
        paymentReference: salePaymentAmount > 0 ? (salePaymentReference || 'Payment') : null,
        notes,
        // Combined gas items (delivery + returns)
        gasItems: effectiveTransactionType === 'PAYMENT' ? [] : allGasItems,
        // Accessories
        accessoryItems: effectiveTransactionType === 'PAYMENT' ? [] : accessoryItems.filter(item => item.quantity > 0).map(item => ({
          productName: `${item.category} - ${item.itemType}`,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          totalPrice: item.totalPrice,
          cylinderType: null,
          isVaporizer: item.isVaporizer,
          usagePrice: item.usagePrice,
          sellingPrice: item.sellingPrice,
          costPerPiece: item.costPerPiece
        })),
        // Unified transaction metadata
        isUnifiedTransaction: true,
        unifiedSummary: {
          deliveryTotal: summary.deliveryTotal,
          accessoryTotal: summary.accessoryTotal,
          buybackCredit: summary.totalBuybackCredit,
          netAmount: summary.netAmount,
          paymentReceived: summary.paymentReceived,
          balanceImpact: summary.balanceImpact,
          totalDelivered: summary.totalDelivered,
          totalReturned: summary.totalReturned,
        }
      };

      console.log('Submitting unified transaction:', transactionData);

      const response = await fetch('/api/customers/b2b/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      const result = await response.json();
      console.log('Transaction created successfully:', result);

      // Reset form and refresh data
      setShowTransactionForm(false);
      resetUnifiedForm();

      // Refresh customer data
      await fetchCustomerLedger();

      // Refresh cylinder dues after transaction
      const duesResponse = await fetch(`/api/customers/b2b/${customerId}/cylinder-dues`);
      if (duesResponse.ok) {
        const duesData = await duesResponse.json();
        if (duesData.success && duesData.cylinderDues) {
          setCylinderDues(duesData.cylinderDues);
        }
      }

      // Force refresh after short delay
      setTimeout(async () => {
        console.log('Force refreshing customer data...');
        await fetchCustomerLedger();
      }, 1000);

      alert('Transaction created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  if (loading && !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Customer not found</p>
          <Button
            onClick={() => router.push('/customers/b2b')}
            className="mt-4"
          >
            Back to B2B Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push('/customers/b2b')}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to B2B Customers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-blue-600" />
            {customer.name}
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Net Balance & Transaction History
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-0 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-700 font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Info & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card className="lg:col-span-2 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleModalOpen}
                className="text-xs font-medium"
              >
                Edit Margin Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contact Person</p>
                <p className="text-lg font-semibold text-gray-900">{customer.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-lg font-semibold text-gray-900">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="text-lg font-semibold text-gray-900">{customer.paymentTermsDays} days</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Margin Category</p>
                <p className="text-lg font-semibold text-gray-900">
                  {customer.marginCategory ?
                    `${customer.marginCategory.name} (Rs ${customer.marginCategory.marginPerKg}/kg)` :
                    'Not assigned'
                  }
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-lg font-semibold text-gray-900">{customer.address || '-'}</p>
              </div>
              {customer.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Summary & Quick Actions */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Net Balance */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Net Balance</p>
              {customer && (
                <>
                  {(() => {
                    // Calculate net balance: negative when customer owes
                    const netBalance = summary ? summary.netBalance : -(customer.ledgerBalance || 0);
                    return (
                      <>
                        <p className={`text-3xl font-bold flex items-center justify-center ${netBalance < 0 ? 'text-red-600' :
                          netBalance > 0 ? 'text-green-600' : 'text-gray-900'
                          }`}>
                          <CurrencyDollarIcon className="w-6 h-6 mr-2" />
                          {formatCurrency(netBalance)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {netBalance < 0 ? 'Customer owes you' :
                            netBalance > 0 ? 'Customer has credit' :
                              'Balance settled'}
                        </p>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Total In & Total Out */}
            {summary && summary.totalIn !== undefined && summary.totalOut !== undefined && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total In (+)</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(summary.totalIn)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Out (-)</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(summary.totalOut)}
                  </span>
                </div>
              </div>
            )}

            {/* Cylinders Due */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Remaining Cylinders Due</p>
              {loadingCylinderDues ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : cylinderDues.length > 0 ? (
                <div className="space-y-2">
                  {cylinderDues.map((due) => (
                    <div key={due.cylinderType} className="flex justify-between">
                      <span className="text-sm">{due.displayName}</span>
                      <Badge variant={due.count > 0 ? 'destructive' : 'secondary'}>
                        {due.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No cylinders due</div>
              )}
            </div>

            {/* Quick Actions - Unified Transaction */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => {
                  setTransactionType('UNIFIED');
                  resetUnifiedForm();
                  setShowTransactionForm(true);
                }}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Sale, Payment, Buyback & Returns in one transaction
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-6 mx-auto p-6 border-0 w-11/12 max-w-5xl shadow-2xl rounded-xl bg-white mb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 text-white" />
                  </div>
                  New Transaction
                </h3>
                <p className="text-sm text-gray-500 mt-1">Fill in the sections that apply to this transaction</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransactionForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Error Display in Form */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="inline-flex text-red-400 hover:text-red-600 focus:outline-none"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              {/* Date and Time Row */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <Input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <Input
                    type="time"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              {/* ========== SECTION 1: CYLINDERS DELIVERED ========== */}
              <div className={`border rounded-xl overflow-hidden transition-all ${deliveryExpanded ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setDeliveryExpanded(!deliveryExpanded)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${deliveryExpanded ? 'bg-green-100/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${deliveryExpanded ? 'bg-green-600' : 'bg-gray-300'}`}>
                      <CubeIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Cylinders Delivered</span>
                      {gasItems.some(item => item.delivered > 0) && (
                        <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
                          {gasItems.reduce((sum, item) => sum + item.delivered, 0)} cylinders
                        </Badge>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${deliveryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {deliveryExpanded && (
                  <div className="p-4 border-t border-green-200">
                    {/* Pricing Info Banner */}
                    {pricingInfo && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium text-blue-900">Auto-Pricing: </span>
                            <span className="text-blue-700">
                              {pricingInfo.category?.name} | Margin: Rs {pricingInfo.category?.marginPerKg}/kg
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={applyCalculatedPrices}
                            variant="outline"
                            size="sm"
                            className="bg-white text-blue-700 border-blue-200 text-xs"
                          >
                            <CalculatorIcon className="w-3 h-3 mr-1" />
                            Apply Prices
                          </Button>
                        </div>
                      </div>
                    )}

                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="text-left py-2 px-2 font-medium w-[35%]">Cylinder Type</th>
                          <th className="text-left py-2 px-2 font-medium w-[15%]">Quantity</th>
                          <th className="text-left py-2 px-2 font-medium w-[20%]">Price/Unit</th>
                          <th className="text-left py-2 px-2 font-medium w-[20%]">Total</th>
                          <th className="text-center py-2 px-2 font-medium w-[10%]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {gasItems.map((item, index) => {
                          const fullStockCount = getFullStockCount(item.cylinderType);
                          const isExceedingStock = item.delivered > 0 && fullStockCount > 0 && item.delivered > fullStockCount;

                          return (
                            <tr key={index} id={`cylinder-item-${index}`} className="border-b border-gray-100">
                              <td className="py-2 px-2 align-top">
                                <div className="relative">
                                  <select
                                    value={item.cylinderType || ''}
                                    onChange={(e) => updateGasItem(index, 'cylinderType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  >
                                    <option value="">Select type...</option>
                                    {availableCylinderTypes.map((stat, i) => (
                                      <option key={`${stat.typeEnum}-${i}`} value={stat.typeEnum}>{stat.type}</option>
                                    ))}
                                  </select>
                                </div>
                                {item.cylinderType && (
                                  <div className="text-xs text-gray-500 mt-1">Stock: {fullStockCount} units</div>
                                )}
                              </td>
                              <td className="py-2 px-2 align-top">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.delivered || ''}
                                  onChange={(e) => updateGasItem(index, 'delivered', parseInt(e.target.value) || 0)}
                                  disabled={!item.cylinderType}
                                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md ${isExceedingStock ? 'border-red-500 bg-red-50' : 'bg-white'} ${!item.cylinderType ? 'bg-gray-100' : ''} focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                                  placeholder="0"
                                />
                                {isExceedingStock && <div className="text-xs text-red-600 mt-1">Exceeds stock!</div>}
                              </td>
                              <td className="py-2 px-2 align-top">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.pricePerItem || ''}
                                  onChange={(e) => updateGasItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                                  disabled={!item.cylinderType}
                                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white ${!item.cylinderType ? 'bg-gray-100' : ''} focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-2 px-2 align-top">
                                <div className="w-full px-3 py-2 text-sm font-semibold text-gray-900 flex items-center">
                                  {formatCurrency(item.delivered * item.pricePerItem)}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center align-top">
                                {gasItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeGasItemRow(index)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded mt-2"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Button
                      type="button"
                      onClick={addGasItemRow}
                      variant="outline"
                      size="sm"
                      className="mt-3 text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Add Cylinder
                    </Button>
                  </div>
                )}
              </div>

              {/* ========== SECTION 2: CYLINDERS RETURNED ========== */}
              <div className={`border rounded-xl overflow-hidden transition-all ${returnsExpanded ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setReturnsExpanded(!returnsExpanded)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${returnsExpanded ? 'bg-orange-100/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnsExpanded ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <ArrowPathIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Cylinders Returned</span>
                      <span className="text-xs text-gray-500 ml-2">(Empty & Buyback)</span>
                      {returnItems.some(item => item.emptyReturned > 0 || item.buybackQuantity > 0) && (
                        <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                          {returnItems.reduce((sum, item) => sum + item.emptyReturned + item.buybackQuantity, 0)} cylinders
                        </Badge>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${returnsExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {returnsExpanded && (
                  <div className="p-4 border-t border-orange-200">
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                      <strong>Empty Return:</strong> No credit • <strong>Buyback:</strong> Customer gets credit for remaining gas
                    </div>

                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="text-left py-2 px-2 font-medium">Cylinder Type</th>
                          <th className="text-left py-2 px-2 font-medium">Empty Qty</th>
                          <th className="text-left py-2 px-2 font-medium">Buyback Qty</th>
                          <th className="text-left py-2 px-2 font-medium">Remaining Kg</th>
                          <th className="text-left py-2 px-2 font-medium">Rate %</th>
                          <th className="text-left py-2 px-2 font-medium">Credit</th>
                          <th className="text-center py-2 px-2 font-medium w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnItems.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 px-2 align-top">
                              <div className="relative">
                                <select
                                  value={item.cylinderType || ''}
                                  onChange={(e) => updateReturnItem(index, 'cylinderType', e.target.value)}
                                  className="w-full px-3 py-2 text-sm cursor-pointer border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                  <option value="">Select type...</option>
                                  {availableCylinderTypes
                                    .filter(stat => cylinderDues.some(due => due.cylinderType === stat.typeEnum && due.count > 0))
                                    .map((stat, i) => (
                                      <option key={`ret-${stat.typeEnum}-${i}`} value={stat.typeEnum}>{stat.type}</option>
                                    ))}
                                </select>
                              </div>
                              {item.cylinderType && (
                                <div className="text-xs text-gray-500 mt-1">Remaining Due: {getCurrentCylinderDue(item.cylinderType)} units</div>
                              )}
                            </td>
                            <td className="py-2 px-2 align-top">
                              <Input
                                type="number"
                                min="0"
                                value={item.emptyReturned || ''}
                                onChange={(e) => updateReturnItem(index, 'emptyReturned', parseInt(e.target.value) || 0)}
                                disabled={!item.cylinderType}
                                className={`w-16 px-3 py-2 text-sm border border-gray-300 rounded-md ${!item.cylinderType ? 'bg-gray-100' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-2 align-top">
                              <Input
                                type="number"
                                min="0"
                                value={item.buybackQuantity || ''}
                                onChange={(e) => updateReturnItem(index, 'buybackQuantity', parseInt(e.target.value) || 0)}
                                disabled={!item.cylinderType}
                                className={`w-16 px-3 py-2 text-sm border border-gray-300 rounded-md ${!item.cylinderType ? 'bg-gray-100' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-2 align-top">
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={item.remainingKg || ''}
                                onChange={(e) => updateReturnItem(index, 'remainingKg', parseFloat(e.target.value) || 0)}
                                disabled={!item.cylinderType || item.buybackQuantity === 0}
                                className={`w-20 px-3 py-2 text-sm border border-gray-300 rounded-md ${(!item.cylinderType || item.buybackQuantity === 0) ? 'bg-gray-100' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-2 align-top">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.buybackRate ? (item.buybackRate * 100) : 60}
                                  onChange={(e) => updateReturnItem(index, 'buybackRate', (parseFloat(e.target.value) || 60) / 100)}
                                  disabled={!item.cylinderType || item.buybackQuantity === 0}
                                  className={`w-16 px-3 py-2 text-sm text-center border border-gray-300 rounded-md ${(!item.cylinderType || item.buybackQuantity === 0) ? 'bg-gray-100' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 align-top">
                              <div className={`w-full px-3 py-2 text-sm font-semibold ${item.buybackCredit > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {formatCurrency(item.buybackCredit)}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center align-top">
                              {returnItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeReturnItemRow(index)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button
                      type="button"
                      onClick={addReturnItemRow}
                      variant="outline"
                      size="sm"
                      className="mt-3 text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Add Return
                    </Button>
                  </div>
                )}
              </div>

              {/* ========== SECTION 3: ACCESSORIES ========== */}
              <div className={`border rounded-xl overflow-hidden transition-all ${accessoriesExpanded ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${accessoriesExpanded ? 'bg-purple-100/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accessoriesExpanded ? 'bg-purple-600' : 'bg-gray-300'}`}>
                      <CubeIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Accessories</span>
                      {accessoryItems.some(item => item.quantity > 0) && (
                        <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200">
                          {accessoryItems.filter(i => i.quantity > 0).length} items
                        </Badge>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${accessoriesExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {accessoriesExpanded && (
                  <div className="p-4 border-t border-purple-200">
                    <ProfessionalAccessorySelector
                      accessoryItems={accessoryItems}
                      setAccessoryItems={setAccessoryItems}
                      onValidationChange={setHasAccessoryErrors}
                      onInventoryValidationChange={handleInventoryValidationChange}
                    />
                  </div>
                )}
              </div>

              {/* ========== SECTION 4: PAYMENT ========== */}
              <div className={`border rounded-xl overflow-hidden transition-all ${paymentExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setPaymentExpanded(!paymentExpanded)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${paymentExpanded ? 'bg-blue-100/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${paymentExpanded ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <CreditCardIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Payment Received</span>
                      {salePaymentAmount > 0 && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                          {formatCurrency(salePaymentAmount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${paymentExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {paymentExpanded && (
                  <div className="p-4 border-t border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={salePaymentAmount || ''}
                          onChange={(e) => setSalePaymentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                        <select
                          value={salePaymentMethod}
                          onChange={(e) => setSalePaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 text-sm cursor-pointer border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CHECK">Check</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="DEBIT_CARD">Debit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                        <Input
                          value={salePaymentReference}
                          onChange={(e) => setSalePaymentReference(e.target.value)}
                          placeholder="Check #, Trans ID..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Quick Pay Button */}
                    {(() => {
                      const summary = getUnifiedTransactionSummary();
                      return summary.netAmount > 0 && (
                        <Button
                          type="button"
                          onClick={() => setSalePaymentAmount(summary.netAmount)}
                          variant="outline"
                          size="sm"
                          className="mt-3 text-blue-700 border-blue-300 hover:bg-blue-50"
                        >
                          Pay Full Amount ({formatCurrency(summary.netAmount)})
                        </Button>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ========== TRANSACTION SUMMARY ========== */}
              {(() => {
                const summary = getUnifiedTransactionSummary();
                const hasAnyData = summary.hasDelivery || summary.hasAccessories || summary.hasReturns || summary.hasPayment;

                if (!hasAnyData) return null;

                return (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CalculatorIcon className="w-5 h-5 text-slate-600" />
                      Transaction Summary
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {summary.hasDelivery && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 uppercase tracking-wider">Sale</div>
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(summary.deliveryTotal)}</div>
                          <div className="text-xs text-gray-500">{summary.totalDelivered} cylinders</div>
                        </div>
                      )}
                      {summary.hasAccessories && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 uppercase tracking-wider">Accessories</div>
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(summary.accessoryTotal)}</div>
                        </div>
                      )}
                      {summary.totalBuybackCredit > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-green-200">
                          <div className="text-xs text-green-600 uppercase tracking-wider">Buyback Credit</div>
                          <div className="text-lg font-bold text-green-600">-{formatCurrency(summary.totalBuybackCredit)}</div>
                          <div className="text-xs text-gray-500">{summary.totalBuybackQuantity} cylinders</div>
                        </div>
                      )}
                      {summary.totalEmptyReturned > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 uppercase tracking-wider">Empty Returns</div>
                          <div className="text-lg font-bold text-gray-600">{summary.totalEmptyReturned}</div>
                          <div className="text-xs text-gray-500">No credit</div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-300 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gross Amount:</span>
                        <span className="font-medium">{formatCurrency(summary.grossSaleAmount)}</span>
                      </div>
                      {summary.totalBuybackCredit > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Less Buyback Credit:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(summary.totalBuybackCredit)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold border-t border-slate-200 pt-2">
                        <span>Net Amount:</span>
                        <span>{formatCurrency(summary.netAmount)}</span>
                      </div>
                      {summary.hasPayment && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment Received:</span>
                          <span className="font-medium text-blue-600">-{formatCurrency(summary.paymentReceived)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between text-lg font-bold border-t border-slate-300 pt-2 ${summary.balanceImpact > 0 ? 'text-red-600' : summary.balanceImpact < 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                        <span>Balance Impact:</span>
                        <span>
                          {summary.balanceImpact > 0 ? '+' : ''}{formatCurrency(summary.balanceImpact)}
                          <span className="text-xs font-normal ml-1">
                            ({summary.balanceImpact > 0 ? 'owes' : summary.balanceImpact < 0 ? 'overpaid' : 'settled'})
                          </span>
                        </span>
                      </div>

                      {/* Cylinder Summary */}
                      {(summary.totalDelivered > 0 || summary.totalReturned > 0) && (
                        <div className="text-sm text-gray-600 pt-2 border-t border-slate-200">
                          <span className="font-medium">Cylinder Dues: </span>
                          {summary.totalDelivered > 0 && <span className="text-red-600">+{summary.totalDelivered} delivered</span>}
                          {summary.totalDelivered > 0 && summary.totalReturned > 0 && <span>, </span>}
                          {summary.totalReturned > 0 && <span className="text-green-600">-{summary.totalReturned} returned</span>}
                          <span className="font-semibold ml-2">
                            (Net: {summary.totalDelivered - summary.totalReturned >= 0 ? '+' : ''}{summary.totalDelivered - summary.totalReturned})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTransactionForm(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Create Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Ledger */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Transaction Ledger</CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Complete transaction history with running balance
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Filter Button */}
              <div className="relative date-filter-container">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {(dateFilter.startDate || dateFilter.endDate) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {(dateFilter.startDate && dateFilter.endDate) ? '2' : '1'}
                    </span>
                  )}
                </Button>

                {/* Date Filter Dropdown */}
                {showDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Filter by Date Range
                      </h3>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={dateFilter.startDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                          className="w-full text-sm"
                          max={dateFilter.endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={dateFilter.endDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                          className="w-full text-sm"
                          min={dateFilter.startDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateFilter({ startDate: '', endDate: '' });
                            setPagination({ ...pagination, page: 1 });
                          }}
                          className="flex-1 text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowDateFilter(false);
                            setPagination({ ...pagination, page: 1 });
                          }}
                          className="flex-1 text-xs"
                        >
                          Apply Filter
                        </Button>
                      </div>

                      {(dateFilter.startDate || dateFilter.endDate) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            {(dateFilter.startDate && dateFilter.endDate) ? (
                              <>
                                Showing transactions from <strong>{new Date(dateFilter.startDate).toLocaleDateString()}</strong> to <strong>{new Date(dateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            ) : dateFilter.startDate ? (
                              <>
                                Showing transactions from <strong>{new Date(dateFilter.startDate).toLocaleDateString()}</strong> onwards
                              </>
                            ) : (
                              <>
                                Showing transactions up to <strong>{new Date(dateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Trans Report Button */}
              <div className="relative report-date-filter-container">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReportDateFilter(!showReportDateFilter)}
                  disabled={downloadingReport}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Trans Report</span>
                  {downloadingReport && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 ml-1"></div>
                  )}
                </Button>

                {/* Report Date Filter Dropdown */}
                {showReportDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 report-date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Select Date Range for Report
                      </h3>
                      <button
                        onClick={() => setShowReportDateFilter(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={reportDateFilter.startDate}
                          onChange={(e) => setReportDateFilter({ ...reportDateFilter, startDate: e.target.value })}
                          className="w-full text-sm"
                          max={reportDateFilter.endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={reportDateFilter.endDate}
                          onChange={(e) => setReportDateFilter({ ...reportDateFilter, endDate: e.target.value })}
                          className="w-full text-sm"
                          min={reportDateFilter.startDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReportDateFilter({ startDate: '', endDate: '' });
                          }}
                          className="flex-1 text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDownloadReport}
                          disabled={downloadingReport}
                          className="flex-1 text-xs"
                        >
                          {downloadingReport ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Generating...
                            </div>
                          ) : (
                            'Download Report'
                          )}
                        </Button>
                      </div>

                      {(reportDateFilter.startDate || reportDateFilter.endDate) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            {(reportDateFilter.startDate && reportDateFilter.endDate) ? (
                              <>
                                Report will include transactions from <strong>{new Date(reportDateFilter.startDate).toLocaleDateString()}</strong> to <strong>{new Date(reportDateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            ) : reportDateFilter.startDate ? (
                              <>
                                Report will include transactions from <strong>{new Date(reportDateFilter.startDate).toLocaleDateString()}</strong> onwards
                              </>
                            ) : (
                              <>
                                Report will include transactions up to <strong>{new Date(reportDateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Bill S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transaction Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className={transaction.voided ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" suppressHydrationWarning>
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" suppressHydrationWarning>
                      {formatTime(transaction.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.billSno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        // Categorize items to show appropriate badges
                        const saleItems = transaction.items.filter((item: any) =>
                          item.pricePerItem > 0 && !item.returnedCondition
                        );
                        const buybackItems = transaction.items.filter((item: any) =>
                          item.returnedCondition === 'EMPTY' && item.remainingKg && Number(item.remainingKg) > 0
                        );
                        const emptyReturnItems = transaction.items.filter((item: any) =>
                          item.returnedCondition === 'EMPTY' && (!item.remainingKg || Number(item.remainingKg) === 0)
                        );

                        const hasSales = saleItems.length > 0;
                        const hasBuyback = buybackItems.length > 0;
                        const hasEmptyReturns = emptyReturnItems.length > 0;

                        return (
                          <div className="flex flex-wrap gap-1">
                            {/* Primary transaction type badge */}
                            {transaction.transactionType === 'SALE' && hasSales && (
                              <Badge variant="success">SALE</Badge>
                            )}
                            {transaction.transactionType === 'PAYMENT' && (
                              <Badge variant="info">PAYMENT</Badge>
                            )}
                            {/* Show BUYBACK badge if there are buyback items */}
                            {(transaction.transactionType === 'BUYBACK' || hasBuyback) && hasBuyback && (
                              <Badge variant="warning">BUYBACK</Badge>
                            )}
                            {/* Show RETURN badge if there are empty return items */}
                            {(transaction.transactionType === 'RETURN_EMPTY' || hasEmptyReturns) && hasEmptyReturns && (
                              <Badge variant="secondary">RETURN</Badge>
                            )}
                            {/* Fallback for other transaction types */}
                            {!hasSales && !hasBuyback && !hasEmptyReturns && transaction.transactionType !== 'PAYMENT' && (
                              <Badge variant="secondary">{transaction.transactionType}</Badge>
                            )}
                            {transaction.voided && <Badge variant="destructive">VOIDED</Badge>}

                            {/* Payment status for SALE transactions */}
                            {transaction.transactionType === 'SALE' && transaction.paymentStatus && (
                              <Badge
                                variant={
                                  transaction.paymentStatus === 'FULLY_PAID' ? 'success' :
                                    transaction.paymentStatus === 'PARTIAL' ? 'warning' :
                                      'destructive'
                                }
                                className="text-xs"
                              >
                                {transaction.paymentStatus === 'FULLY_PAID' ? 'Paid' :
                                  transaction.paymentStatus === 'PARTIAL' ? 'Partial' :
                                    'Unpaid'}
                                {transaction.paidAmount && transaction.paymentStatus !== 'UNPAID' && (
                                  <span className="ml-1">
                                    ({formatCurrency(Number(transaction.paidAmount))})
                                  </span>
                                )}
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {(() => {
                        // Categorize items for grouped display
                        const saleItems = transaction.items.filter((item: any) =>
                          item.pricePerItem > 0 && !item.returnedCondition
                        );
                        const buybackItems = transaction.items.filter((item: any) =>
                          item.returnedCondition === 'EMPTY' && item.remainingKg && Number(item.remainingKg) > 0
                        );
                        const emptyReturnItems = transaction.items.filter((item: any) =>
                          item.returnedCondition === 'EMPTY' && (!item.remainingKg || Number(item.remainingKg) === 0)
                        );

                        return (
                          <div className="max-w-md space-y-1">
                            {/* SALE ITEMS */}
                            {saleItems.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-green-700 bg-green-50 px-1 rounded">Sold:</span>
                                {saleItems.map((item: any, index: number) => (
                                  <span key={`sale-${index}`} className="text-xs text-gray-700 ml-1">
                                    {getTransactionItemDisplayName(item)} x{item.quantity}
                                    {index < saleItems.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* BUYBACK ITEMS */}
                            {buybackItems.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-1 rounded">Buyback:</span>
                                {buybackItems.map((item: any, index: number) => (
                                  <span key={`buyback-${index}`} className="text-xs text-gray-700 ml-1">
                                    {getTransactionItemDisplayName(item)} x{item.quantity}
                                    <span className="text-gray-500">
                                      ({item.remainingKg}kg, {((item.buybackRate || 0) * 100).toFixed(0)}%)
                                    </span>
                                    {index < buybackItems.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* EMPTY RETURN ITEMS */}
                            {emptyReturnItems.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-1 rounded">Returned:</span>
                                {emptyReturnItems.map((item: any, index: number) => (
                                  <span key={`return-${index}`} className="text-xs text-gray-600 ml-1">
                                    {getTransactionItemDisplayName(item)} x{item.quantity}
                                    {index < emptyReturnItems.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* PAYMENT-ONLY transactions */}
                            {transaction.transactionType === 'PAYMENT' && transaction.items.length === 0 && (
                              <span className="text-xs text-gray-500 italic">Payment received</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {(() => {
                        if (transaction.transactionType === 'SALE') {
                          // Categorize items using the same logic as the report
                          const saleItems = transaction.items?.filter((item: B2BTransactionItem) => {
                            const hasRegularPrice = item.pricePerItem && Number(item.pricePerItem) > 0;
                            const hasBuybackRateSet = item.buybackRate !== null && item.buybackRate !== undefined;
                            return hasRegularPrice && !hasBuybackRateSet;
                          }) || [];

                          const buybackItems = transaction.items?.filter((item: B2BTransactionItem) => {
                            const hasBuybackRateSet = item.buybackRate !== null && item.buybackRate !== undefined;
                            return hasBuybackRateSet;
                          }) || [];

                          // Calculate sale total
                          const saleTotal = saleItems.reduce((sum: number, item: B2BTransactionItem) => {
                            return sum + (Number(item.totalPrice) || 0);
                          }, 0);

                          // Calculate buyback credit
                          const buybackCredit = buybackItems.reduce((sum: number, item: B2BTransactionItem) => {
                            return sum + (Number(item.totalPrice) || 0);
                          }, 0);

                          // Net Transaction Amount = Sale Total - Buyback Credit
                          const netTransactionAmount = saleTotal - buybackCredit;

                          if (netTransactionAmount > 0) {
                            return formatCurrency(netTransactionAmount);
                          } else if (saleTotal > 0) {
                            // Fallback to sale total if no buyback
                            return formatCurrency(saleTotal);
                          } else {
                            // Fallback to totalAmount if no items breakdown
                            return formatCurrency(transaction.totalAmount);
                          }
                        }
                        return '-';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {(() => {
                        // Show credit for payment transactions
                        if (['PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType)) {
                          return formatCurrency(transaction.totalAmount);
                        }

                        // For pure BUYBACK transactions
                        if (transaction.transactionType === 'BUYBACK') {
                          return formatCurrency(transaction.totalAmount);
                        }

                        // For SALE transactions, show only paid amount (buyback credit is already deducted from debit)
                        if (transaction.transactionType === 'SALE') {
                          const paidAmount = transaction.paidAmount ? Number(transaction.paidAmount) : 0;
                          return paidAmount > 0 ? formatCurrency(paidAmount) : '-';
                        }

                        return '-';
                      })()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(() => {
                      // runningBalance from API is positive when customer owes (Sales - Payments)
                      // We negate it for display, so negative = customer owes (red)
                      const netBalance = -(transaction.runningBalance || 0);
                      if (netBalance < 0) return 'text-red-600'; // Customer owes you
                      if (netBalance > 0) return 'text-green-600'; // Customer has credit
                      return 'text-gray-900'; // Balance settled (black)
                    })()
                      }`}>
                      {formatCurrency(-(transaction.runningBalance || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedTransaction(transaction);
                          setShowTransactionDetail(true);
                          // Fetch full transaction details with items
                          try {
                            setLoadingTransaction(true);
                            const response = await fetch(`/api/customers/b2b/transactions/${transaction.id}`);
                            if (response.ok) {
                              const data = await response.json();
                              setSelectedTransaction(data);
                            }
                          } catch (err) {
                            console.error('Error fetching transaction details:', err);
                          } finally {
                            setLoadingTransaction(false);
                          }
                        }}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} transactions
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Margin Category Edit Modal */}
      {showCategoryEdit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Margin Category</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a new margin category for <strong>{customer?.name}</strong>. This will affect pricing for all future transactions.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Category
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm font-medium text-gray-900">
                      {customer?.marginCategory ?
                        `${customer.marginCategory.name} (Rs ${customer.marginCategory.marginPerKg}/kg)` :
                        'Not assigned'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Category *
                  </label>
                  <Select
                    disabled={loadingCategories || updatingCategory}
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                    }}
                  >
                    <option value="">Select new margin category</option>
                    {marginCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} - Rs {category.marginPerKg}/kg
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    This will immediately affect pricing for new transactions
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCategoryEdit(false);
                    setSelectedCategoryId('');
                  }}
                  disabled={updatingCategory}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateCustomerCategory}
                  disabled={updatingCategory || !selectedCategoryId}
                >
                  {updatingCategory ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTransactionDetail && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header with buttons */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction Details - {selectedTransaction.billSno}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/customers/b2b/transactions/${selectedTransaction.id}/report`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Transaction-${selectedTransaction.billSno}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } else {
                          alert('Failed to download transaction report');
                        }
                      } catch (err) {
                        console.error('Error downloading report:', err);
                        alert('Failed to download transaction report');
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Download Transaction
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Are you sure you want to undo this transaction?\n\n` +
                        `This will:\n` +
                        `- Reverse all balance changes\n` +
                        `- Return inventory items\n` +
                        `- Update cylinder counts\n\n` +
                        `Transaction: ${selectedTransaction.billSno}\n` +
                        `Type: ${selectedTransaction.transactionType}\n` +
                        `Amount: ${formatCurrency(selectedTransaction.totalAmount)}\n\n` +
                        `This action cannot be undone.`
                      );

                      if (!confirmed) return;

                      const reason = prompt('Please provide a reason for undoing this transaction (optional):') || undefined;

                      try {
                        setUndoingTransaction(true);
                        const response = await fetch(`/api/customers/b2b/transactions/${selectedTransaction.id}/undo`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ reason })
                        });

                        if (response.ok) {
                          alert('Transaction successfully undone. All changes have been reversed.');
                          setShowTransactionDetail(false);
                          setSelectedTransaction(null);
                          // Refresh customer ledger
                          await fetchCustomerLedger();
                        } else {
                          const errorData = await response.json();
                          alert(`Failed to undo transaction: ${errorData.error || 'Unknown error'}`);
                        }
                      } catch (err) {
                        console.error('Error undoing transaction:', err);
                        alert('Failed to undo transaction. Please try again.');
                      } finally {
                        setUndoingTransaction(false);
                      }
                    }}
                    disabled={selectedTransaction.voided || undoingTransaction}
                    className={`flex items-center gap-2 ${selectedTransaction.voided ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                      }`}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {undoingTransaction ? 'Undoing...' : 'Undo Transaction'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTransactionDetail(false);
                      setSelectedTransaction(null);
                    }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {loadingTransaction ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading transaction details...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Transaction Info */}
                  <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Transaction Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Bill Number</p>
                        <p className="font-semibold text-gray-900">{selectedTransaction.billSno}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Transaction Type</p>
                        {(() => {
                          // Categorize items to show appropriate badges
                          const saleItems = selectedTransaction.items?.filter((item: any) =>
                            item.pricePerItem > 0 && !item.returnedCondition
                          ) || [];
                          const buybackItems = selectedTransaction.items?.filter((item: any) =>
                            item.returnedCondition === 'EMPTY' && item.remainingKg && Number(item.remainingKg) > 0
                          ) || [];
                          const emptyReturnItems = selectedTransaction.items?.filter((item: any) =>
                            item.returnedCondition === 'EMPTY' && (!item.remainingKg || Number(item.remainingKg) === 0)
                          ) || [];

                          const hasSales = saleItems.length > 0;
                          const hasBuyback = buybackItems.length > 0;
                          const hasEmptyReturns = emptyReturnItems.length > 0;

                          return (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedTransaction.transactionType === 'SALE' && hasSales && (
                                <Badge variant="success">SALE</Badge>
                              )}
                              {selectedTransaction.transactionType === 'PAYMENT' && (
                                <Badge variant="info">PAYMENT</Badge>
                              )}
                              {(selectedTransaction.transactionType === 'BUYBACK' || hasBuyback) && hasBuyback && (
                                <Badge variant="warning">BUYBACK</Badge>
                              )}
                              {(selectedTransaction.transactionType === 'RETURN_EMPTY' || hasEmptyReturns) && hasEmptyReturns && (
                                <Badge variant="secondary">RETURN</Badge>
                              )}
                              {!hasSales && !hasBuyback && !hasEmptyReturns && selectedTransaction.transactionType !== 'PAYMENT' && (
                                <Badge variant="secondary">{selectedTransaction.transactionType}</Badge>
                              )}
                              {selectedTransaction.voided && <Badge variant="destructive">VOIDED</Badge>}

                              {selectedTransaction.transactionType === 'SALE' && selectedTransaction.paymentStatus && (
                                <Badge
                                  variant={
                                    (selectedTransaction.paymentStatus === 'FULLY_PAID' ? 'success' :
                                      selectedTransaction.paymentStatus === 'PARTIAL' ? 'warning' :
                                        'destructive') as 'success' | 'warning' | 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {selectedTransaction.paymentStatus === 'FULLY_PAID' ? 'Paid' :
                                    selectedTransaction.paymentStatus === 'PARTIAL' ? 'Partial' :
                                      'Unpaid'}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-semibold text-gray-900" suppressHydrationWarning>
                          {formatDate(selectedTransaction.date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-semibold text-gray-900" suppressHydrationWarning>
                          {formatTime(selectedTransaction.time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(selectedTransaction.totalAmount)}</p>
                      </div>
                      {selectedTransaction.transactionType === 'SALE' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600">Paid Amount</p>
                            <p className="font-semibold text-green-600">{formatCurrency(Number(selectedTransaction.paidAmount || 0))}</p>
                          </div>
                          {(() => {
                            const paid = Number(selectedTransaction.paidAmount || 0);
                            const unpaid = selectedTransaction.unpaidAmount !== null && selectedTransaction.unpaidAmount !== undefined
                              ? Number(selectedTransaction.unpaidAmount)
                              : selectedTransaction.totalAmount - paid;

                            return unpaid > 0 && (
                              <div>
                                <p className="text-sm text-gray-600">Unpaid Amount</p>
                                <p className="font-semibold text-red-600">{formatCurrency(unpaid)}</p>
                              </div>
                            );
                          })()}
                          {selectedTransaction.paymentMethod && (
                            <div>
                              <p className="text-sm text-gray-600">Payment Method</p>
                              <p className="font-semibold text-gray-900">{selectedTransaction.paymentMethod.replace(/_/g, ' ')}</p>
                            </div>
                          )}
                        </>
                      )}
                      {selectedTransaction.paymentReference && (
                        <div>
                          <p className="text-sm text-gray-600">Payment Reference</p>
                          <p className="font-semibold text-gray-900">{selectedTransaction.paymentReference}</p>
                        </div>
                      )}
                      {selectedTransaction.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Notes</p>
                          <p className="font-semibold text-gray-900">{selectedTransaction.notes}</p>
                        </div>
                      )}
                      {selectedTransaction.voided && selectedTransaction.voidReason && (
                        <div className="col-span-2">
                          <p className="text-sm text-red-600">Void Reason</p>
                          <p className="font-semibold text-red-600">{selectedTransaction.voidReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Items Table - Grouped by Category */}
                  <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Transaction Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                        (() => {
                          // Categorize items
                          const saleItems = selectedTransaction.items.filter((item: any) =>
                            item.pricePerItem > 0 && !item.returnedCondition
                          );
                          const buybackItems = selectedTransaction.items.filter((item: any) =>
                            item.returnedCondition === 'EMPTY' && item.remainingKg && Number(item.remainingKg) > 0
                          );
                          const emptyReturnItems = selectedTransaction.items.filter((item: any) =>
                            item.returnedCondition === 'EMPTY' && (!item.remainingKg || Number(item.remainingKg) === 0)
                          );

                          const saleTotal = saleItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice || 0), 0);
                          const buybackTotal = buybackItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice || 0), 0);

                          return (
                            <div className="space-y-4">
                              {/* SALE ITEMS */}
                              {saleItems.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="success" className="text-xs">SOLD</Badge>
                                    <span className="text-sm font-medium text-gray-700">{saleItems.length} item(s)</span>
                                  </div>
                                  <div className="overflow-x-auto border border-green-200 rounded-lg">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="bg-green-50">
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Item</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Qty</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Price/Unit</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {saleItems.map((item: any, index: number) => (
                                          <tr key={`sale-${index}`} className="border-t border-green-100">
                                            <td className="px-4 py-2 text-sm text-gray-900">{getTransactionItemDisplayName(item)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{formatCurrency(Number(item.pricePerItem))}</td>
                                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-green-50 font-semibold">
                                          <td colSpan={3} className="px-4 py-2 text-right text-sm text-green-800">Subtotal:</td>
                                          <td className="px-4 py-2 text-sm text-green-800">{formatCurrency(saleTotal)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* BUYBACK ITEMS */}
                              {buybackItems.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="warning" className="text-xs">BUYBACK</Badge>
                                    <span className="text-sm font-medium text-gray-700">{buybackItems.length} cylinder(s)</span>
                                    <span className="text-sm text-orange-600">(Credit to customer)</span>
                                  </div>
                                  <div className="overflow-x-auto border border-orange-200 rounded-lg">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="bg-orange-50">
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Cylinder</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Qty</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Remaining Gas</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Rate</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Credit</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {buybackItems.map((item: any, index: number) => (
                                          <tr key={`buyback-${index}`} className="border-t border-orange-100">
                                            <td className="px-4 py-2 text-sm text-gray-900">{getTransactionItemDisplayName(item)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{Number(item.remainingKg)} kg</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{((item.buybackRate || 0) * 100).toFixed(0)}%</td>
                                            <td className="px-4 py-2 text-sm font-semibold text-orange-600">{formatCurrency(Number(item.totalPrice))}</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-orange-50 font-semibold">
                                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-orange-800">Total Credit:</td>
                                          <td className="px-4 py-2 text-sm text-orange-800">{formatCurrency(buybackTotal)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* EMPTY RETURN ITEMS */}
                              {emptyReturnItems.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-xs">RETURNED EMPTY</Badge>
                                    <span className="text-sm font-medium text-gray-700">{emptyReturnItems.length} cylinder(s)</span>
                                    <span className="text-sm text-gray-500">(No credit)</span>
                                  </div>
                                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cylinder</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Qty</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {emptyReturnItems.map((item: any, index: number) => (
                                          <tr key={`return-${index}`} className="border-t border-gray-100">
                                            <td className="px-4 py-2 text-sm text-gray-900">{getTransactionItemDisplayName(item)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500 italic">Empty - Returned to inventory</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* GRAND TOTAL */}
                              <div className="border-t-2 border-gray-300 pt-3 mt-4">
                                <div className="flex justify-between items-center text-lg font-bold">
                                  <span>Net Transaction Amount:</span>
                                  <span className={selectedTransaction.totalAmount >= 0 ? 'text-gray-900' : 'text-green-600'}>
                                    {formatCurrency(selectedTransaction.totalAmount)}
                                  </span>
                                </div>
                                {saleItems.length > 0 && buybackItems.length > 0 && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    Sale ({formatCurrency(saleTotal)}) - Buyback Credit ({formatCurrency(buybackTotal)}) = {formatCurrency(saleTotal - buybackTotal)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-gray-500 text-center py-4">No items in this transaction</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
