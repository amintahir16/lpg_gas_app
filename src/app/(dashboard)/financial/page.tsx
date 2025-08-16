"use client";
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ExpensesResponse {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function FinancialPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showViewExpense, setShowViewExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm, categoryFilter]);

  const fetchExpenses = async () => {
    try {
      if (expenses.length === 0) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        category: categoryFilter === 'ALL' ? '' : categoryFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/expenses?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data: ExpensesResponse = await response.json();
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearchTerm, categoryFilter, pagination.page]);

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpense(true);
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowViewExpense(true);
  };

  const handleUpdateExpense = async (formData: any) => {
    if (!selectedExpense) return;
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedExpense.id,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update expense');
      }

      // Refresh expenses after updating
      fetchExpenses();
      setShowEditExpense(false);
      setSelectedExpense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    }
  };

  const handleAddExpense = async (formData: any) => {
    try {
      console.log('Form data being sent:', formData);
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to create expense');
      }

      const result = await response.json();
      console.log('Success response:', result);

      // Refresh expenses after creating
      await fetchExpenses();
      setShowAddExpense(false);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Add expense error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    }
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="mt-2 text-gray-600 font-medium">Loading expenses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="mt-2 text-red-600 font-medium">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Track expenses and manage financial records
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddExpense(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">This month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {expenses.filter(e => e.status === 'PENDING' || !e.status).length}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {expenses.filter(e => e.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Approved expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {expenses.filter(e => e.status === 'REJECTED').length}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Rejected expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            onFocus={(e) => e.target.select()}
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="ALL">All Categories</option>
          <option value="FUEL">Fuel</option>
          <option value="SALARY">Salary</option>
          <option value="MEALS">Meals</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="UTILITIES">Utilities</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No expenses found. Add your first expense to get started.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{expense.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="font-semibold">
                          {expense.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${Number(expense.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(expense.status || 'PENDING') as any} className="font-semibold">
                          {getStatusText(expense.status || 'PENDING')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewExpense(expense)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} expenses
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

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddExpense(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              
              const category = formData.get('category') as string;
              const description = formData.get('description') as string;
              const amount = formData.get('amount') as string;
              const dateValue = formData.get('date') as string;
              const receiptUrl = formData.get('receiptUrl') as string;
              
              console.log('Raw form values:', { category, description, amount, dateValue, receiptUrl });
              
              if (!category || !description || !amount || !dateValue) {
                setError('All required fields must be filled');
                return;
              }
              
              handleAddExpense({
                category,
                description,
                amount: parseFloat(amount),
                expenseDate: dateValue,
                receiptUrl: receiptUrl || null
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <Select name="category" required>
                  <option value="">Select category</option>
                  <option value="FUEL">Fuel</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <Input name="description" type="text" placeholder="Expense description" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <Input name="amount" type="number" placeholder="0.00" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt URL (Optional)</label>
                <Input name="receiptUrl" type="url" placeholder="https://..." />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddExpense(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpense && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Expense</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditExpense(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateExpense({
                category: formData.get('category'),
                amount: formData.get('amount'),
                description: formData.get('description'),
                expenseDate: formData.get('expenseDate'),
                receiptUrl: formData.get('receiptUrl')
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <Select name="category" defaultValue={selectedExpense.category} required>
                  <option value="FUEL">Fuel</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <Input 
                  name="description" 
                  type="text" 
                  defaultValue={selectedExpense.description}
                  placeholder="Expense description" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <Input 
                  name="amount" 
                  type="number" 
                  defaultValue={Number(selectedExpense.amount).toString()}
                  placeholder="0.00" 
                  step="0.01" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <Input 
                  name="expenseDate" 
                  type="date" 
                  defaultValue={new Date(selectedExpense.expenseDate).toISOString().split('T')[0]}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt URL (Optional)</label>
                <Input 
                  name="receiptUrl" 
                  type="url" 
                  defaultValue={selectedExpense.receiptUrl || ''}
                  placeholder="https://..." 
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditExpense(false);
                    setSelectedExpense(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Update Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {showViewExpense && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Expense Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewExpense(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <div className="p-2 bg-gray-50 rounded border">
                  <Badge variant="outline" className="text-sm">
                    {selectedExpense.category.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {selectedExpense.description}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                <div className="p-2 bg-gray-50 rounded border text-green-600 font-semibold">
                  ${Number(selectedExpense.amount).toFixed(2)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Created By</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {selectedExpense.user?.name || 'Unknown'}
                </div>
              </div>
              {selectedExpense.receiptUrl && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt</label>
                  <div className="p-2 bg-gray-50 rounded border">
                    <a 
                      href={selectedExpense.receiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Receipt
                    </a>
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => {
                    setShowViewExpense(false);
                    setSelectedExpense(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}