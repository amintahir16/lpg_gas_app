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
  const [transactionType, setTransactionType] = useState<'SALE' | 'PAYMENT' | 'BUYBACK' | 'RETURN_EMPTY'>('SALE');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));
  
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
  const [firstInvalidInventoryItem, setFirstInvalidInventoryItem] = useState<{category: string, index: number} | null>(null);
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
  const handleInventoryValidationChange = (hasErrors: boolean, firstInvalidItem?: {category: string, index: number}) => {
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

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      
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

      // Validate gas items - ensure no empty delivered cylinders are sent
      const validGasItems = gasItems.filter(item => {
        if (item.delivered > 0 || item.emptyReturned > 0) {
          return true;
        }
        // Log skipped items for debugging
        console.log(`Skipping gas item: ${item.cylinderType} - delivered: ${item.delivered}, emptyReturned: ${item.emptyReturned}`);
        return false;
      });

      console.log(`Processing ${validGasItems.length} valid gas items out of ${gasItems.length} total items`);
      
      // Validate that there are items with quantity > 0
      if (transactionType === 'SALE') {
        const hasGasItems = gasItems.some(item => item.delivered > 0);
        const hasAccessoryItems = accessoryItems.some(item => item.quantity > 0);
        
        // Check if there are any items with monetary value
        const hasMonetaryGasItems = gasItems.some(item => item.delivered > 0);
        const hasMonetaryAccessoryItems = accessoryItems.some(item => 
          item.quantity > 0 && item.pricePerItem > 0
        );
        
        // Check if there are free vaporizers (quantity > 0 but both prices = 0)
        const hasFreeVaporizers = accessoryItems.some(item => 
          item.quantity > 0 && 
          item.isVaporizer && 
          item.usagePrice === 0 && 
          item.sellingPrice === 0
        );
        
        // Allow transaction if:
        // 1. There are gas items with monetary value, OR
        // 2. There are accessories with monetary value, OR  
        // 3. There are free vaporizers (special case)
        const isValidTransaction = hasMonetaryGasItems || hasMonetaryAccessoryItems || hasFreeVaporizers;
        
        if (!isValidTransaction) {
          setError('Please add at least one item with quantity greater than 0 before creating a transaction.');
          return;
        }
      } else if (transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') {
        const hasReturnItems = gasItems.some(item => item.emptyReturned > 0);
        
        if (!hasReturnItems) {
          setError('Please add at least one item to return before creating a transaction.');
          return;
        }
      }
      
      // Calculate total amount based on transaction type
      let totalAmount = 0;
      if (transactionType === 'SALE') {
        totalAmount = gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                     accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
      } else if (transactionType === 'BUYBACK') {
        totalAmount = gasItems.reduce((sum, item) => sum + item.buybackTotal, 0);
      } else if (transactionType === 'PAYMENT') {
        totalAmount = parseFloat(formData.get('paymentAmount') as string) || 0;
      }
      
      // Check if this is a fully paid sale (payment amount equals sale amount)
      const isFullyPaidSale = transactionType === 'SALE' && salePaymentAmount > 0 && 
                              Math.abs(salePaymentAmount - totalAmount) < 0.01; // Allow 0.01 tolerance for floating point

      const transactionData = {
        transactionType,
        customerId,
        date: transactionDate,
        time: transactionTime,
        totalAmount,
        // For SALE transactions, include payment info if provided
        paidAmount: transactionType === 'SALE' && salePaymentAmount > 0 ? salePaymentAmount : undefined,
        paymentMethod: transactionType === 'SALE' && salePaymentAmount > 0 ? salePaymentMethod : undefined,
        paymentReference: transactionType === 'PAYMENT' ? formData.get('paymentReference') : (transactionType === 'SALE' && salePaymentAmount > 0 ? (salePaymentReference || `Payment on Sale`) : null),
        notes: transactionType === 'SALE' && salePaymentAmount > 0 
          ? (isFullyPaidSale 
              ? `Fully paid sale - Payment of ${formatCurrency(salePaymentAmount)} received via ${salePaymentMethod}` 
              : `Partial payment of ${formatCurrency(salePaymentAmount)} received via ${salePaymentMethod}. Remaining: ${formatCurrency(totalAmount - salePaymentAmount)}`)
          : (transactionType === 'PAYMENT' ? formData.get('notes') : null),
        gasItems: transactionType === 'PAYMENT' ? [] : validGasItems,
        accessoryItems: transactionType === 'PAYMENT' ? [] : accessoryItems.filter(item => item.quantity > 0).map(item => ({
          productName: `${item.category} - ${item.itemType}`,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          totalPrice: item.totalPrice,
          cylinderType: null,
          // Vaporizer-specific fields
          isVaporizer: item.isVaporizer,
          usagePrice: item.usagePrice,
          sellingPrice: item.sellingPrice,
          costPerPiece: item.costPerPiece
        }))
      };

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
      setGasItems(gasItems.map(item => ({ ...item, delivered: 0, emptyReturned: 0 })));
      setAccessoryItems([]);
      
      // Reset payment form states
      setPaymentAgainst('');
      setPaymentQuantity(0);
      setSalePaymentAmount(0);
      setSalePaymentMethod('CASH');
      setSalePaymentReference('');
      
      // Refresh customer data multiple times to ensure it's updated
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
      
      // Another refresh after longer delay
      setTimeout(async () => {
        console.log('Final refresh of customer data...');
        await fetchCustomerLedger();
      }, 2000);
      
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
               <p className={`text-3xl font-bold flex items-center justify-center ${
                           netBalance < 0 ? 'text-red-600' : 
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

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => {
                  setTransactionType('SALE');
                  setShowTransactionForm(true);
                  setError(null); // Clear any previous errors
                  setHasAccessoryErrors(false); // Clear accessory validation errors
                  clearAllValidationErrors(); // Clear cylinder validation errors
                  // Reset sale payment states
                  setSalePaymentAmount(0);
                  setSalePaymentMethod('CASH');
                  setSalePaymentReference('');
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                New Sale
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setTransactionType('PAYMENT');
                  setShowTransactionForm(true);
                  setError(null); // Clear any previous errors
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <CreditCardIcon className="w-4 h-4 mr-2" />
                New Payment
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setTransactionType('BUYBACK');
                  setShowTransactionForm(true);
                  setError(null); // Clear any previous errors
                }}
                variant="outline"
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Gas Buyback
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setTransactionType('RETURN_EMPTY');
                  setShowTransactionForm(true);
                  setError(null); // Clear any previous errors
                }}
                variant="outline"
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Return Empty
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {transactionType === 'SALE' ? 'New Sale Transaction' :
                 transactionType === 'PAYMENT' ? 'New Payment' :
                 transactionType === 'BUYBACK' ? 'Gas Buyback' : 'Return Empty Cylinders'}
              </h3>
              
              <form onSubmit={handleTransactionSubmit} className="space-y-6">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <Input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                    <Input
                      type="time"
                      value={transactionTime}
                      onChange={(e) => setTransactionTime(e.target.value)}
                      required
                    />
                  </div>
                </div>


                {/* Gas Section */}
                {(transactionType === 'SALE' || transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {transactionType === 'SALE' ? 'Gas Delivery' :
                         transactionType === 'BUYBACK' ? 'Gas Buyback' :
                         'Empty Cylinder Return'}
                      </CardTitle>
                      {transactionType === 'SALE' && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                          <p><strong>Remaining Cylinders Due Logic:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• <strong>Sale:</strong> Current Due + Delivered Cylinders = New Due</li>
                            <li>• <strong>Return/Buyback:</strong> Current Due - Returned Cylinders = New Due</li>
                            <li>• <strong>Payment:</strong> No change to cylinder dues</li>
                          </ul>
                        </div>
                      )}
                      {transactionType === 'BUYBACK' && (
                        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-md">
                          <p><strong>Gas Buyback Logic:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• Enter remaining gas quantity (e.g., 5kg, 10kg)</li>
                            <li>• Original selling price is automatically calculated from pricing system</li>
                            <li>• Enter your desired buyback rate percentage (default: 60%)</li>
                            <li>• Buyback amount = Auto Price × (Remaining Gas / Total Gas) × Buyback Rate</li>
                          </ul>
                        </div>
                      )}
                      {transactionType === 'RETURN_EMPTY' && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          <p><strong>Empty Cylinder Return:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• Enter quantity of empty cylinders being returned</li>
                            <li>• This reduces the customer's cylinder dues</li>
                            <li>• No payment involved - just inventory adjustment</li>
                          </ul>
                        </div>
                      )}
                    </CardHeader>
                    
                    {/* Pricing Information Banner */}
                    {pricingInfo && transactionType === 'SALE' && (
                      <div className="px-6 pb-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-blue-900">Auto-Pricing Information</h4>
                              <p className="text-sm text-blue-700">
                                Category: <strong>{pricingInfo.category.name}</strong> | 
                                Plant Price: <strong>Rs {pricingInfo.plantPrice.price118kg}</strong> | 
                                Margin: <strong>Rs {pricingInfo.category.marginPerKg}/kg</strong>
                              </p>
                              <p className="text-sm text-blue-600 mt-1">
                                Calculated Prices: 11.8kg = Rs {pricingInfo.finalPrices.domestic118kg} | 
                                15kg = Rs {pricingInfo.finalPrices.standard15kg} | 
                                45.4kg = Rs {pricingInfo.finalPrices.commercial454kg}
                              </p>
                            </div>
                            <Button 
                              type="button" 
                              onClick={applyCalculatedPrices} 
                              variant="outline" 
                              size="sm"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <CalculatorIcon className="w-4 h-4 mr-2" />
                              Apply Auto-Pricing
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                                {transactionType === 'SALE' ? 'Gas Cylinder delivered' :
                                 transactionType === 'BUYBACK' ? 'Gas Cylinder Type' :
                                 'Gas Cylinder Type'}
                              </th>
                              {transactionType === 'SALE' && (
                                <>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Delivered Cylinders</th>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Price Per Item</th>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Total Price per Item</th>
                                </>
                              )}
                              {(transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Cylinders Returned</th>
                              )}
                              {transactionType === 'BUYBACK' && (
                                <>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Remaining Gas (kg)</th>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Original Price (Auto)</th>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Buyback Rate (%)</th>
                                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Buyback Amount</th>
                                </>
                              )}
                              <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gasItems.map((item, index) => {
                              const fullStockCount = getFullStockCount(item.cylinderType);
                              const isExceedingStock = item.delivered > 0 && fullStockCount > 0 && item.delivered > fullStockCount;
                              
                              return (
                                <tr key={index} id={`cylinder-item-${index}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3 px-4 align-top">
                                    <div className="space-y-2 min-w-[200px]">
                                      <div className="relative w-full">
                                        {loadingCylinderTypes ? (
                                          <div className="flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                                            Loading cylinder types...
                                          </div>
                                        ) : (
                                          <>
                                            <select
                                              value={item.cylinderType || ''}
                                              onChange={(e) => {
                                                updateGasItem(index, 'cylinderType', e.target.value);
                                              }}
                                              disabled={loadingCylinderTypes || availableCylinderTypes.length === 0}
                                              className="w-full pl-3 pr-8 text-sm border border-gray-300 rounded-md bg-white text-gray-900 appearance-none cursor-pointer focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
                                              style={{
                                                height: '2.75rem',
                                                paddingTop: '0.75rem',
                                                paddingBottom: '0.75rem',
                                                lineHeight: '1.25rem'
                                              }}
                                            >
                                              <option value="">Select cylinder type</option>
                                              {availableCylinderTypes.map((stat, statIndex) => (
                                                <option 
                                                  key={`${stat.typeEnum}-${statIndex}`} 
                                                  value={stat.typeEnum}
                                                >
                                                  {stat.type}
                                                </option>
                                              ))}
                                            </select>
                                            <svg className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </>
                                        )}
                                      </div>
                                      {item.cylinderType && (
                                        <div className="text-xs text-gray-500 font-medium">
                                          Stock: <span className="text-gray-700">{fullStockCount}</span> units (Full)
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                {transactionType === 'SALE' && (
                                  <>
                                    <td className="py-3 px-4 align-top">
                                      <div className="space-y-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          max={fullStockCount > 0 ? fullStockCount : undefined}
                                          value={item.delivered}
                                          onChange={(e) => updateGasItem(index, 'delivered', parseInt(e.target.value) || 0)}
                                          disabled={!item.cylinderType}
                                          className={`w-20 h-10 ${
                                            isExceedingStock
                                              ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500'
                                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                          } ${!item.cylinderType ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        />
                                        {isExceedingStock && (
                                          <div className="text-xs text-red-600 font-medium">
                                            Exceeds stock ({fullStockCount})
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 align-top">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.pricePerItem}
                                        onChange={(e) => updateGasItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                                        disabled={!item.cylinderType}
                                        className={`w-28 h-10 ${!item.cylinderType ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                      />
                                    </td>
                                    <td className="py-3 px-4 align-top">
                                      <div className="text-sm font-semibold text-gray-900 pt-2">
                                        {formatCurrency(item.delivered * item.pricePerItem)}
                                      </div>
                                    </td>
                                  </>
                                )}
                                {(transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                                  <td className="py-3 px-4 align-top">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.emptyReturned}
                                      onChange={(e) => updateGasItem(index, 'emptyReturned', parseInt(e.target.value) || 0)}
                                      className="w-20 h-10"
                                    />
                                  </td>
                                )}
                                {transactionType === 'BUYBACK' && (
                                  <>
                                    <td className="py-3 px-4 align-top">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={item.remainingKg}
                                        onChange={(e) => updateGasItem(index, 'remainingKg', parseFloat(e.target.value) || 0)}
                                        className="w-20 h-10"
                                        placeholder="5.0"
                                      />
                                    </td>
                                    <td className="py-3 px-4 align-top">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.originalSoldPrice}
                                        readOnly
                                        className="w-28 h-10 bg-gray-50 text-gray-700 cursor-not-allowed"
                                        placeholder="Auto-calculated"
                                      />
                                    </td>
                                    <td className="py-3 px-4 align-top">
                                      <div className="flex items-center space-x-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={item.buybackRate ? (item.buybackRate * 100) : 60}
                                          onChange={(e) => {
                                            const inputValue = e.target.value;
                                            // Allow empty input while typing
                                            if (inputValue === '' || inputValue === '.') {
                                              return;
                                            }
                                            const rateValue = parseFloat(inputValue);
                                            if (!isNaN(rateValue) && rateValue >= 0 && rateValue <= 100) {
                                              updateGasItem(index, 'buybackRate', rateValue / 100);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Ensure a valid value on blur, default to 60 if empty
                                            const inputValue = e.target.value;
                                            if (inputValue === '' || isNaN(parseFloat(inputValue))) {
                                              updateGasItem(index, 'buybackRate', 0.6);
                                            }
                                          }}
                                          className="w-20 h-10 text-sm text-center"
                                          placeholder="60"
                                        />
                                        <span className="text-sm text-gray-600">%</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 align-top">
                                      <div className="text-sm font-semibold text-green-600 pt-2">
                                        {formatCurrency(item.buybackTotal)}
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td className="py-3 px-4 align-top">
                                  <div className="flex items-center justify-center">
                                    {gasItems.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeGasItemRow(index)}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove item"
                                      >
                                        <XMarkIcon className="w-5 h-5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="mt-4 flex justify-start">
                          <Button
                            type="button"
                            onClick={addGasItemRow}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add Item
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Accessories Section */}
                {transactionType === 'SALE' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Accessories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProfessionalAccessorySelector
                        accessoryItems={accessoryItems}
                        setAccessoryItems={setAccessoryItems}
                        onValidationChange={setHasAccessoryErrors}
                        onInventoryValidationChange={handleInventoryValidationChange}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Payment Details - Only for PAYMENT type */}
                {transactionType === 'PAYMENT' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount (PKR)</label>
                      <Input 
                        name="paymentAmount" 
                        type="number"
                        placeholder="Enter payment amount"
                        step="0.01"
                        min="0.01"
                        required
                        className="text-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                      <select
                        name="paymentMethod"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHECK">Check</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="DEBIT_CARD">Debit Card</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Reference (Optional)</label>
                      <Input 
                        name="paymentReference" 
                        placeholder="e.g., Check #1234, Transaction ID, etc."
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                      <Input 
                        name="notes" 
                        placeholder="Additional notes about this payment"
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}


                {/* Payment Section for SALE */}
                {transactionType === 'SALE' && (
                  <Card className="border-2 border-blue-200 bg-blue-50/30">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Payment on Sale (Optional)
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        Accept payment immediately with this sale transaction
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Payment Amount (PKR)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salePaymentAmount || ''}
                            onChange={(e) => setSalePaymentAmount(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="text-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Payment Method
                          </label>
                          <select
                            value={salePaymentMethod}
                            onChange={(e) => setSalePaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="CASH">Cash</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CHECK">Check</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Total Amount */}
                <div className="text-right space-y-2">
                  {transactionType === 'SALE' && (
                    <>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-gray-900">
                          Total Sale Amount: {formatCurrency(
                            gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                            accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0)
                          )}
                        </p>
                        {salePaymentAmount > 0 && (
                          <>
                            <p className="text-md font-medium text-green-600">
                              Payment Received: {formatCurrency(salePaymentAmount)}
                            </p>
                            <p className={`text-lg font-semibold ${
                              (gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                               accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0)) - salePaymentAmount > 0
                                ? 'text-red-600' 
                                : (gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                                   accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0)) - salePaymentAmount < 0
                                ? 'text-green-600'
                                : 'text-gray-900'
                            }`}>
                              Remaining Balance: {formatCurrency(
                                (gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                                 accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0)) - salePaymentAmount
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {transactionType === 'BUYBACK' && (
                    <div>
                      <p className="text-lg font-semibold text-green-600">
                        Total Buyback Amount: {formatCurrency(
                          gasItems.reduce((sum, item) => sum + item.buybackTotal, 0)
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        (Based on buyback rate × original price for remaining gas)
                      </p>
                    </div>
                  )}
                  {transactionType === 'PAYMENT' && (
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        Payment Amount: Enter amount in form above
                      </p>
                    </div>
                  )}
                  {transactionType === 'RETURN_EMPTY' && (
                    <p className="text-lg font-semibold text-gray-600">
                      Empty Return - No Amount
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTransactionForm(false)}
                    className="font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="font-medium"
                  >
                    Create Transaction
                  </Button>
                </div>
              </form>
            </div>
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
                      <div className="flex flex-col gap-1">
                        <Badge variant={
                          transaction.transactionType === 'SALE' ? 'success' :
                          transaction.transactionType === 'PAYMENT' ? 'info' :
                          transaction.transactionType === 'BUYBACK' ? 'warning' : 'secondary'
                        }>
                          {transaction.transactionType}
                          {transaction.voided && ' (VOIDED)'}
                        </Badge>
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
                            {transaction.paidAmount && (
                              <span className="ml-1">
                                ({formatCurrency(Number(transaction.paidAmount))})
                              </span>
                            )}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-xs">
                        {transaction.items.map((item, index) => (
                          <div key={index} className="text-xs">
                            {getTransactionItemDisplayName(item)} x{item.quantity}
                            {transaction.transactionType === 'BUYBACK' && item.remainingKg && (
                              <span className="text-gray-500 ml-1">
                                ({item.remainingKg}kg remaining)
                              </span>
                            )}
                            {transaction.transactionType === 'BUYBACK' && item.buybackRate && (
                              <span className="text-gray-500 ml-1">
                                ({((item.buybackRate || 0) * 100).toFixed(1)}% buyback)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {transaction.transactionType === 'SALE' 
                        ? (() => {
                            // For fully paid SALE transactions, show dash (paid amount cancels out)
                            if (transaction.paymentStatus === 'FULLY_PAID') {
                              return '-';
                            }
                            // For SALE transactions, show unpaid amount (not total)
                            const unpaidAmount = transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined
                              ? Number(transaction.unpaidAmount)
                              : transaction.totalAmount;
                            return unpaidAmount > 0 ? formatCurrency(unpaidAmount) : '-';
                          })()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {(() => {
                        // Show credit for payment transactions
                        if (['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType)) {
                          return formatCurrency(transaction.totalAmount);
                        }
                        // For fully paid SALE transactions, show dash (paid amount cancels out)
                        if (transaction.transactionType === 'SALE' && transaction.paymentStatus === 'FULLY_PAID') {
                          return '-';
                        }
                        // For SALE transactions, show paid amount in credit column if partially paid
                        if (transaction.transactionType === 'SALE' && transaction.paidAmount) {
                          const paidAmount = Number(transaction.paidAmount);
                          return paidAmount > 0 ? formatCurrency(paidAmount) : '-';
                        }
                        return '-';
                      })()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      (() => {
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
                    className={`flex items-center gap-2 ${
                      selectedTransaction.voided ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 hover:border-red-300 hover:text-red-600'
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
                        <Badge variant={
                          selectedTransaction.transactionType === 'SALE' ? 'success' :
                          selectedTransaction.transactionType === 'PAYMENT' ? 'info' :
                          selectedTransaction.transactionType === 'BUYBACK' ? 'warning' : 'secondary'
                        }>
                          {selectedTransaction.transactionType}
                          {selectedTransaction.voided && ' (VOIDED)'}
                        </Badge>
                        {selectedTransaction.transactionType === 'SALE' && selectedTransaction.paymentStatus && (
                          <Badge 
                            variant={
                              (selectedTransaction.paymentStatus === 'FULLY_PAID' ? 'success' :
                              selectedTransaction.paymentStatus === 'PARTIAL' ? 'warning' :
                              'destructive') as 'success' | 'warning' | 'destructive'
                            }
                            className="ml-2 text-xs"
                          >
                            {selectedTransaction.paymentStatus === 'FULLY_PAID' ? 'Paid' :
                             selectedTransaction.paymentStatus === 'PARTIAL' ? 'Partial' :
                             'Unpaid'}
                          </Badge>
                        )}
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
                      {selectedTransaction.transactionType === 'SALE' && selectedTransaction.paidAmount && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600">Paid Amount</p>
                            <p className="font-semibold text-green-600">{formatCurrency(Number(selectedTransaction.paidAmount))}</p>
                          </div>
                          {selectedTransaction.unpaidAmount && Number(selectedTransaction.unpaidAmount) > 0 && (
                            <div>
                              <p className="text-sm text-gray-600">Unpaid Amount</p>
                              <p className="font-semibold text-red-600">{formatCurrency(Number(selectedTransaction.unpaidAmount))}</p>
                            </div>
                          )}
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

                  {/* Items Table */}
                  <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Transaction Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Quantity</th>
                                {selectedTransaction.transactionType === 'BUYBACK' && (
                                  <>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Remaining Gas (kg)</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Buyback Rate</th>
                                  </>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">{selectedTransaction.transactionType === 'BUYBACK' ? 'Buyback Price' : 'Price Per Item'}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Total Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTransaction.items.map((item: any, index: number) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {getTransactionItemDisplayName(item)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{Number(item.quantity)}</td>
                                  {selectedTransaction.transactionType === 'BUYBACK' && (
                                    <>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {item.remainingKg ? `${Number(item.remainingKg)} kg` : '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {item.buybackRate ? `${((item.buybackRate || 0) * 100).toFixed(1)}%` : '-'}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {selectedTransaction.transactionType === 'BUYBACK' 
                                      ? formatCurrency(Number(item.buybackPricePerItem || 0))
                                      : formatCurrency(Number(item.pricePerItem))}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-semibold">
                                <td colSpan={selectedTransaction.transactionType === 'BUYBACK' ? 5 : 3} className="px-4 py-3 text-right text-sm text-gray-900">Total:</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(selectedTransaction.totalAmount)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
