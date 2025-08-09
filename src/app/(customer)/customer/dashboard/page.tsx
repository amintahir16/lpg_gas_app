"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Rental {
  id: string;
  cylinderCode: string;
  cylinderType: string;
  rentalDate: string;
  expectedReturnDate: string;
  status: string;
  amount: number;
}

interface CustomerStats {
  activeRentals: number;
  totalRentals: number;
  totalSpent: number;
  accountBalance: number;
}

export default function CustomerDashboardPage() {
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    activeRentals: 0,
    totalRentals: 0,
    totalSpent: 0,
    accountBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [rentalsResponse, statsResponse] = await Promise.all([
        fetch('/api/customer/rentals'),
        fetch('/api/customer/dashboard')
      ]);

      if (!rentalsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch customer data');
      }

      const rentalsData = await rentalsResponse.json();
      const statsData = await statsResponse.json();

      setRentals(rentalsData.rentals || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    // Simulate rental request submission
    setTimeout(() => {
      setSuccessMsg('Rental request submitted successfully!');
      setShowRentalModal(false);
      fetchCustomerData(); // Refresh data
    }, 1000);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    // Simulate payment submission
    setTimeout(() => {
      setSuccessMsg('Payment submitted successfully!');
      setShowPaymentModal(false);
      fetchCustomerData(); // Refresh data
    }, 1000);
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    // Simulate support request submission
    setTimeout(() => {
      setSuccessMsg('Support request submitted!');
      setShowSupportModal(false);
      fetchCustomerData(); // Refresh data
    }, 1000);
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  const dashboardStats = [
    { name: 'Active Rentals', value: stats.activeRentals },
    { name: 'Total Spent', value: `$${(Number(stats.totalSpent) || 0).toFixed(2)}` },
    { name: 'Cylinders Rented', value: stats.totalRentals },
    { name: 'Account Balance', value: `$${(Number(stats.accountBalance) || 0).toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
        <p className="text-gray-600">Welcome to your customer portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card key={stat.name} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {/* Recent Rentals */}
      {rentals.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cylinder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rental Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Return Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rentals.slice(0, 5).map((rental) => (
                    <tr key={rental.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rental.cylinderCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {rental.cylinderType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {rental.rentalDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {rental.expectedReturnDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className={getStatusColor(rental.status)}>
                          {rental.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${(Number(rental.amount) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rental Request Modal */}
      {showRentalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request New Rental</h3>
              <form className="space-y-4" onSubmit={handleRentalSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg" required>
                    <option value="">Select cylinder type</option>
                    <option value="15KG">15KG</option>
                    <option value="45KG">45KG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (days)</label>
                  <input type="number" className="w-full p-3 border border-gray-300 rounded-lg" min="1" max="30" required />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowRentalModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit Request
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Payment</h3>
              <form className="space-y-4" onSubmit={handlePaymentSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                  <input type="number" className="w-full p-3 border border-gray-300 rounded-lg" step="0.01" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg" required>
                    <option value="">Select payment method</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h3>
              <form className="space-y-4" onSubmit={handleSupportSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea className="w-full p-3 border border-gray-300 rounded-lg" rows={4} required></textarea>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowSupportModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Send Message
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