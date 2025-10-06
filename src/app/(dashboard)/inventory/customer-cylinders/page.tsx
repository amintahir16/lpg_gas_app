"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  UserGroupIcon, 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface CustomerCylinder {
  id: string;
  code: string;
  cylinderType: string;
  currentStatus: string;
  customer: {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email?: string;
    address?: string;
  };
  rental: {
    id: string;
    rentalDate: string;
    expectedReturnDate?: string;
    rentalAmount?: number;
    depositAmount?: number;
    status: string;
  };
}

interface CustomerCylinderStats {
  type: string;
  count: number;
  totalValue: number;
}

export default function CustomerCylindersPage() {
  const [customerCylinders, setCustomerCylinders] = useState<CustomerCylinder[]>([]);
  const [stats, setStats] = useState<CustomerCylinderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchCustomerCylinders();
    fetchStats();
  }, [searchTerm, typeFilter, statusFilter]);

  const fetchCustomerCylinders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        type: typeFilter === 'ALL' ? '' : typeFilter,
        status: statusFilter === 'ALL' ? '' : statusFilter
      });

      const response = await fetch(`/api/inventory/customer-cylinders?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerCylinders(data.customerCylinders);
      }
    } catch (error) {
      console.error('Failed to fetch customer cylinders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/inventory/customer-cylinders/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch customer cylinder stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'OVERDUE':
        return 'destructive';
      case 'RETURNED':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const getCylinderStatusColor = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'success';
      case 'EMPTY':
        return 'warning';
      case 'WITH_CUSTOMER':
        return 'info';
      case 'RETIRED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'DOMESTIC_11_8KG':
        return 'Domestic (11.8kg)';
      case 'STANDARD_15KG':
        return 'Standard (15kg)';
      case 'COMMERCIAL_45_4KG':
        return 'Commercial (45.4kg)';
      default:
        return type;
    }
  };

  const isOverdue = (expectedReturnDate: string) => {
    if (!expectedReturnDate) return false;
    return new Date(expectedReturnDate) < new Date();
  };

  const handleViewDetails = (item: CustomerCylinder) => {
    // Create a detailed view modal or navigate to a details page
    const details = `
Cylinder: ${item.code}
Type: ${getTypeDisplayName(item.cylinderType)}
Status: ${item.currentStatus}
Customer: ${item.customer.name}
Contact Person: ${item.customer.contactPerson}
Phone: ${item.customer.phone}
Email: ${item.customer.email || 'N/A'}
Address: ${item.customer.address || 'N/A'}
Rental Date: ${new Date(item.rental.rentalDate).toLocaleDateString()}
Expected Return: ${item.rental.expectedReturnDate ? new Date(item.rental.expectedReturnDate).toLocaleDateString() : 'N/A'}
Rental Amount: ${item.rental.rentalAmount ? `PKR ${item.rental.rentalAmount.toLocaleString()}` : 'N/A'}
Deposit: ${item.rental.depositAmount ? `PKR ${item.rental.depositAmount.toLocaleString()}` : 'N/A'}
Status: ${item.rental.status}
    `;
    alert(details);
  };

  const handleContactCustomer = (customer: any) => {
    // Open contact options (phone, email, etc.)
    const contactInfo = `
Customer: ${customer.name}
Contact Person: ${customer.contactPerson}
Phone: ${customer.phone}
${customer.email ? `Email: ${customer.email}` : ''}
Address: ${customer.address || 'N/A'}
    `;
    
    if (confirm(`${contactInfo}\n\nWould you like to call ${customer.phone}?`)) {
      window.open(`tel:${customer.phone}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/inventory'}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cylinders with Customers</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Track cylinders currently rented by customers
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">
                {getTypeDisplayName(stat.type)}
              </CardTitle>
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.count}</div>
              <p className="text-sm text-gray-600">With Customers</p>
              {stat.totalValue > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Total Value: PKR {stat.totalValue.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers or cylinders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Cylinder Types</option>
              <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
              <option value="STANDARD_15KG">Standard (15kg)</option>
              <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Rental Status</option>
              <option value="ACTIVE">Active</option>
              <option value="OVERDUE">Overdue</option>
              <option value="RETURNED">Returned</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Cylinders Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cylinders with Customers ({customerCylinders.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cylinder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rental Details
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="animate-pulse">Loading customer cylinders...</div>
                    </td>
                  </tr>
                ) : customerCylinders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No cylinders with customers found.
                    </td>
                  </tr>
                ) : (
                  customerCylinders.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.code}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeDisplayName(item.cylinderType)}
                            </Badge>
                            <Badge variant={getCylinderStatusColor(item.currentStatus) as any} className="text-xs">
                              {item.currentStatus.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {item.customer.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Contact: {item.customer.contactPerson}
                          </div>
                          {item.customer.email && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <PhoneIcon className="w-3 h-3 mr-1" />
                          {item.customer.phone}
                        </div>
                        {item.customer.address && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {item.customer.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {new Date(item.rental.rentalDate).toLocaleDateString()}
                          </div>
                          {item.rental.expectedReturnDate && (
                            <div className={`text-xs mt-1 ${
                              isOverdue(item.rental.expectedReturnDate) ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              Due: {new Date(item.rental.expectedReturnDate).toLocaleDateString()}
                              {isOverdue(item.rental.expectedReturnDate) && ' (Overdue)'}
                            </div>
                          )}
                          {item.rental.rentalAmount && (
                            <div className="text-xs text-gray-500 mt-1">
                              Amount: PKR {item.rental.rentalAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(item.rental.status) as any} className="font-semibold">
                          {item.rental.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(item)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleContactCustomer(item.customer)}
                          >
                            Contact
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
    </div>
  );
}
