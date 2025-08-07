'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
}

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export default function FinancialPage() {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      category: 'FUEL',
      amount: 2500,
      description: 'Fuel for delivery vehicles',
      expenseDate: '2024-08-01',
    },
    {
      id: '2',
      category: 'SALARY',
      amount: 8000,
      description: 'Employee salaries',
      expenseDate: '2024-08-01',
    },
    {
      id: '3',
      category: 'MAINTENANCE',
      amount: 1500,
      description: 'Vehicle maintenance',
      expenseDate: '2024-08-02',
    },
  ]);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const financialStats: FinancialStats = {
    totalRevenue: 45000,
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    netProfit: 45000 - expenses.reduce((sum, expense) => sum + expense.amount, 0),
    profitMargin: ((45000 - expenses.reduce((sum, expense) => sum + expense.amount, 0)) / 45000) * 100,
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'ALL' || expense.category === categoryFilter)
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'FUEL':
        return 'bg-red-100 text-red-800';
      case 'SALARY':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'UTILITIES':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-600">Track expenses and monitor financial performance</p>
        </div>
        <Button onClick={() => setShowAddExpense(true)}>
          Add Expense
        </Button>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Total Revenue', value: `$${financialStats.totalRevenue.toLocaleString()}`, color: 'bg-green-500' },
          { name: 'Total Expenses', value: `$${financialStats.totalExpenses.toLocaleString()}`, color: 'bg-red-500' },
          { name: 'Net Profit', value: `$${financialStats.netProfit.toLocaleString()}`, color: 'bg-blue-500' },
          { name: 'Profit Margin', value: `${financialStats.profitMargin.toFixed(1)}%`, color: 'bg-purple-500' },
        ].map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          <option value="FUEL">Fuel</option>
          <option value="SALARY">Salary</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="UTILITIES">Utilities</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Expense Tracking
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.expenseDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Expense</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>FUEL</option>
                    <option>SALARY</option>
                    <option>MAINTENANCE</option>
                    <option>UTILITIES</option>
                    <option>OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <Input type="text" placeholder="Expense description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <Input type="number" placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <Input type="date" />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddExpense(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Expense
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 