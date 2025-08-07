'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Rental {
  id: string;
  cylinderCode: string;
  cylinderType: string;
  rentalDate: string;
  expectedReturnDate: string;
  status: string;
  amount: number;
}

export default function CustomerDashboardPage() {
  // Modal state
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Rental form state
  const [rentalForm, setRentalForm] = useState({ cylinderId: '', rentalDate: '', expectedReturnDate: '', rentalAmount: '' });
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({ amount: '', description: '' });
  // Support form state
  const [supportForm, setSupportForm] = useState({ subject: '', description: '' });

  // Replace with actual customerId from auth/user context
  const customerId = 'demo-customer-id';

  // Handlers
  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    const res = await fetch('/api/rentals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        cylinderId: rentalForm.cylinderId,
        rentalDate: rentalForm.rentalDate,
        expectedReturnDate: rentalForm.expectedReturnDate,
        rentalAmount: Number(rentalForm.rentalAmount),
      }),
    });
    if (res.ok) {
      setSuccessMsg('Rental request submitted!');
      setShowRentalModal(false);
      setRentalForm({ cylinderId: '', rentalDate: '', expectedReturnDate: '', rentalAmount: '' });
    }
  };
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        amount: Number(paymentForm.amount),
        description: paymentForm.description,
      }),
    });
    if (res.ok) {
      setSuccessMsg('Payment submitted!');
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', description: '' });
    }
  };
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        subject: supportForm.subject,
        description: supportForm.description,
      }),
    });
    if (res.ok) {
      setSuccessMsg('Support request submitted!');
      setShowSupportModal(false);
      setSupportForm({ subject: '', description: '' });
    }
  };

  const [rentals] = useState<Rental[]>([
    {
      id: '1',
      cylinderCode: 'CYL001',
      cylinderType: '15KG',
      rentalDate: '2024-08-01',
      expectedReturnDate: '2024-09-01',
      status: 'ACTIVE',
      amount: 150,
    },
    {
      id: '2',
      cylinderCode: 'CYL002',
      cylinderType: '45KG',
      rentalDate: '2024-07-15',
      expectedReturnDate: '2024-08-15',
      status: 'RETURNED',
      amount: 300,
    },
  ]);

  const stats = [
    { name: 'Active Rentals', value: rentals.filter(r => r.status === 'ACTIVE').length },
    { name: 'Total Spent', value: `$${rentals.reduce((sum, r) => sum + r.amount, 0)}` },
    { name: 'Cylinders Rented', value: rentals.length },
    { name: 'Account Balance', value: '$0.00' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-blue-100 text-blue-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
        <p className="text-gray-600">Welcome to your customer portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📊</span>
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

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="w-full" onClick={() => setShowRentalModal(true)}>
            Request New Rental
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowPaymentModal(true)}>
            Make Payment
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowSupportModal(true)}>
            Contact Support
          </Button>
        </div>
        {successMsg && <div className="mt-4 text-green-600 font-medium">{successMsg}</div>}
      </div>
      {/* Rental Modal */}
      {showRentalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Request New Rental</h2>
            <form onSubmit={handleRentalSubmit} className="space-y-3">
              <input className="w-full border rounded p-2" placeholder="Cylinder ID" value={rentalForm.cylinderId} onChange={e => setRentalForm(f => ({ ...f, cylinderId: e.target.value }))} required />
              <input className="w-full border rounded p-2" type="date" placeholder="Rental Date" value={rentalForm.rentalDate} onChange={e => setRentalForm(f => ({ ...f, rentalDate: e.target.value }))} required />
              <input className="w-full border rounded p-2" type="date" placeholder="Expected Return Date" value={rentalForm.expectedReturnDate} onChange={e => setRentalForm(f => ({ ...f, expectedReturnDate: e.target.value }))} />
              <input className="w-full border rounded p-2" type="number" placeholder="Rental Amount" value={rentalForm.rentalAmount} onChange={e => setRentalForm(f => ({ ...f, rentalAmount: e.target.value }))} required />
              <div className="flex space-x-2">
                <Button type="submit">Submit</Button>
                <Button variant="outline" type="button" onClick={() => setShowRentalModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Make Payment</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <input className="w-full border rounded p-2" type="number" placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} required />
              <input className="w-full border rounded p-2" placeholder="Description" value={paymentForm.description} onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))} />
              <div className="flex space-x-2">
                <Button type="submit">Submit</Button>
                <Button variant="outline" type="button" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Contact Support</h2>
            <form onSubmit={handleSupportSubmit} className="space-y-3">
              <input className="w-full border rounded p-2" placeholder="Subject" value={supportForm.subject} onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))} required />
              <textarea className="w-full border rounded p-2" placeholder="Description" value={supportForm.description} onChange={e => setSupportForm(f => ({ ...f, description: e.target.value }))} required />
              <div className="flex space-x-2">
                <Button type="submit">Submit</Button>
                <Button variant="outline" type="button" onClick={() => setShowSupportModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Rentals */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            My Rentals
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cylinder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rental Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rentals.map((rental) => (
                  <tr key={rental.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rental.cylinderCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rental.cylinderType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rental.rentalDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rental.expectedReturnDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                        {rental.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${rental.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                      {rental.status === 'ACTIVE' && (
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          Return
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer ID</label>
              <p className="mt-1 text-sm text-gray-900">CUST001</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <p className="mt-1 text-sm text-gray-900">Residential</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
              <p className="mt-1 text-sm text-gray-900">$1,000.00</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <p className="mt-1 text-sm text-gray-900">Credit Card</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 