'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  address: string | null;
  creditLimit: number;
  paymentTermsDays: number;
  ledgerBalance: number;
  domestic118kgDue: number;
  standard15kgDue: number;
  commercial454kgDue: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  transactionType: string;
  billSno: string;
  date: string;
  time: string;
  totalAmount: number;
  paymentReference: string | null;
  notes: string | null;
  voided: boolean;
  items: TransactionItem[];
}

interface TransactionItem {
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
  customer: Customer;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (customerId) {
      fetchCustomerLedger();
    }
  }, [customerId, pagination.page]);

  // Refresh data when page becomes visible (e.g., when navigating back from new sale/payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && customerId) {
        console.log('Page became visible, refreshing customer data...');
        fetchCustomerLedger();
        
        // Force refresh after short delay (similar to gas buyback logic)
        setTimeout(async () => {
          console.log('Force refreshing customer data...');
          await fetchCustomerLedger();
        }, 1000);
        
        // Another refresh after longer delay
        setTimeout(async () => {
          console.log('Final refresh of customer data...');
          await fetchCustomerLedger();
        }, 2000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [customerId]);

  // Also refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (customerId) {
        console.log('Window focused, refreshing customer data...');
        fetchCustomerLedger();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [customerId]);

  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/customers/${customerId}/ledger?page=${pagination.page}&limit=${pagination.limit}&t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer ledger');
      }
      
      const data: CustomerLedgerResponse = await response.json();
      console.log('Fetched customer data - Balance:', data.customer.ledgerBalance);
      setCustomer(data.customer);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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

  // Calculate running balance for transactions
  const calculateRunningBalance = (transactions: Transaction[]) => {
    // Sort transactions by date and time ascending (oldest first) for proper running balance calculation
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time);
      const dateB = new Date(b.date + 'T' + b.time);
      return dateA.getTime() - dateB.getTime();
    });

    let runningBalance = 0;
    const transactionsWithBalance = sortedTransactions.map(transaction => {
      let transactionAmount = 0;
      
      switch (transaction.transactionType) {
        case 'SALE':
          transactionAmount = transaction.totalAmount;
          runningBalance += transactionAmount;
          break;
        case 'PAYMENT':
          transactionAmount = -transaction.totalAmount;
          runningBalance += transactionAmount;
          break;
        case 'BUYBACK':
          transactionAmount = -transaction.totalAmount;
          runningBalance += transactionAmount;
          break;
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          transactionAmount = -transaction.totalAmount;
          runningBalance += transactionAmount;
          break;
        case 'RETURN_EMPTY':
          // No ledger impact
          transactionAmount = 0;
          break;
      }

      return {
        ...transaction,
        runningBalance: runningBalance
      };
    });

    // Return transactions in original order (newest first) but with calculated running balance
    return transactions.map(transaction => {
      const transactionWithBalance = transactionsWithBalance.find(t => t.id === transaction.id);
      return transactionWithBalance || { ...transaction, runningBalance: 0 };
    });
  };

  const generateStatement = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/statement`);
      if (response.ok) {
        const statementData = await response.json();
        // Here you would typically generate a PDF or open print dialog
        console.log('Statement data:', statementData);
        alert('Statement generated successfully! (Check console for data)');
      }
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Failed to generate statement');
    }
  };

  const exportCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/export?format=csv&includeTransactions=true&customerId=${customerId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customer-${customer?.name}-export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'success';
      case 'PAYMENT':
        return 'info';
      case 'BUYBACK':
        return 'warning';
      case 'RETURN_EMPTY':
        return 'secondary';
      case 'ADJUSTMENT':
      case 'CREDIT_NOTE':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'Sale';
      case 'PAYMENT':
        return 'Payment';
      case 'BUYBACK':
        return 'Buyback';
      case 'RETURN_EMPTY':
        return 'Empty Return';
      case 'ADJUSTMENT':
        return 'Adjustment';
      case 'CREDIT_NOTE':
        return 'Credit Note';
      default:
        return type;
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
            onClick={() => router.push('/customers')}
            className="mt-4"
          >
            Back to Customers
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
          onClick={() => router.push('/customers')}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Account Receivables & Transaction History
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchCustomerLedger}
          disabled={loading}
          className="flex items-center"
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
            <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
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
            {/* Ledger Balance */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Account Receivables</p>
              <p className={`text-3xl font-bold ${
                customer.ledgerBalance > 0 ? 'text-red-600' : 
                customer.ledgerBalance < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {formatCurrency(customer.ledgerBalance)}
              </p>
            </div>

            {/* Cylinders Due */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Remaining Cylinders Due</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Domestic (11.8kg)</span>
                  <Badge variant={customer.domestic118kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.domestic118kgDue}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Standard (15kg)</span>
                  <Badge variant={customer.standard15kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.standard15kgDue}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Commercial (45.4kg)</span>
                  <Badge variant={customer.commercial454kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.commercial454kgDue}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/customers/${customerId}/new-sale`)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                New Sale
              </Button>
              <Button
                onClick={() => router.push(`/customers/${customerId}/new-payment`)}
                variant="outline"
                className="w-full"
              >
                <CreditCardIcon className="w-4 h-4 mr-2" />
                New Payment
              </Button>
              <Button
                onClick={() => router.push(`/customers/${customerId}/new-return`)}
                variant="outline"
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                New Return
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => generateStatement()}
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print Statement
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => exportCustomerData()}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Ledger */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Transaction Ledger</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete transaction history with running balance
          </CardDescription>
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
                {calculateRunningBalance(transactions).map((transaction) => (
                  <tr key={transaction.id} className={transaction.voided ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatTime(transaction.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.billSno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getTransactionTypeColor(transaction.transactionType) as any}>
                        {getTransactionTypeLabel(transaction.transactionType)}
                        {transaction.voided && ' (VOIDED)'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-xs">
                        {transaction.items.map((item, index) => (
                          <div key={index} className="text-xs">
                            {item.productName} x{item.quantity}
                            {item.cylinderType && ` (${item.cylinderType})`}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {transaction.transactionType === 'SALE' ? formatCurrency(transaction.totalAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType) 
                        ? formatCurrency(transaction.totalAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.runningBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* Open transaction details modal */}}
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
    </div>
  );
}
