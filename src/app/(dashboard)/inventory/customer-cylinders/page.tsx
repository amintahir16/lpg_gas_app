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
import { CustomSelect } from '@/components/ui/select-custom';
import { getCylinderTypeDisplayName, getCapacityFromTypeString } from '@/lib/cylinder-utils';
import { getCylinderTypeOptions } from '@/lib/cylinder-types';

interface CustomerCylinder {
  id: string;
  code: string;
  cylinderType: string;
  typeName?: string | null;
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
  isB2B?: boolean;
}

interface CustomerCylinderStats {
  type: string;
  typeName?: string | null;
  capacity?: number;
  count: number;
  totalValue: number;
}

export default function CustomerCylindersPage() {
  const [customerCylinders, setCustomerCylinders] = useState<CustomerCylinder[]>([]);
  const [stats, setStats] = useState<CustomerCylinderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchCustomerCylinders();
    fetchStats();
  }, [searchTerm, typeFilter, customerTypeFilter]);

  const fetchCustomerCylinders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        type: typeFilter === 'ALL' ? '' : typeFilter,
        customerType: customerTypeFilter === 'ALL' ? '' : customerTypeFilter
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

  // Get cylinder type options for dropdowns - use stats to get all actual types including custom ones
  // Create a unique key for each type combination to enable proper filtering
  const typeFilterOptions = stats.length > 0
    ? stats.map((stat, index) => {
      const displayLabel = stat.typeName
        ? `${stat.typeName} (${stat.capacity || getCapacityFromTypeString(stat.type)}kg)`
        : getTypeDisplayName(stat.type);
      const uniqueKey = `type-${stat.type}-${index}`;
      return {
        value: displayLabel, // Use display type for API filtering to match capacity and name pairs
        label: displayLabel,
        key: uniqueKey
      };
    })
    : getCylinderTypeOptions().map((opt, index) => ({
      value: opt.value,
      label: opt.label,
      key: `static-type-${opt.value}-${index}`
    }));

  const getTypeDisplayName = (type: string) => {
    return getCylinderTypeDisplayName(type);
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
            className="text-gray-500 hover:text-gray-900 -ml-2"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-gray-600 truncate pr-1">
                {stat.typeName
                  ? `${stat.typeName} (${getCapacityFromTypeString(stat.type)}kg)`
                  : getTypeDisplayName(stat.type)}
              </CardTitle>
              <UserGroupIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg font-bold text-gray-900 mb-2">{stat.count}</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-600 font-medium">With Customers</span>
                  </div>
                </div>
                {stat.totalValue > 0 && (
                  <div className="flex justify-between items-center text-gray-500 pt-0.5">
                    <span>Value</span>
                    <span className="font-semibold text-gray-700">PKR {stat.totalValue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers or cylinders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2 min-w-48 items-center">
              <div className="flex-1 min-w-[140px]">
                <CustomSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "ALL", label: "All Cylinder Types" },
                    ...typeFilterOptions.map(opt => ({ value: opt.value, label: opt.label }))
                  ]}
                  placeholder="All Cylinder Types"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <CustomSelect
                  value={customerTypeFilter}
                  onChange={setCustomerTypeFilter}
                  options={[
                    { value: "ALL", label: "All Customers" },
                    { value: "B2B", label: "B2B Only" },
                    { value: "B2C", label: "B2C Only" }
                  ]}
                  placeholder="All Customers"
                />
              </div>
            </div>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cylinder
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rental Details
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center border-b">
                      <div className="animate-pulse">Loading customer cylinders...</div>
                    </td>
                  </tr>
                ) : customerCylinders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center text-gray-500 border-b">
                      No cylinders with customers found.
                    </td>
                  </tr>
                ) : (
                  customerCylinders.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.code}</div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <Badge variant="secondary" className="font-semibold text-xs py-0 px-2 h-5">
                              {item.typeName
                                ? `${item.typeName} (${getCapacityFromTypeString(item.cylinderType)}kg)`
                                : getTypeDisplayName(item.cylinderType)}
                            </Badge>
                            <Badge variant={getCylinderStatusColor(item.currentStatus) as any} className="font-semibold text-xs py-0 px-2 h-5">
                              {item.currentStatus.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {item.customer.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Contact: {item.customer.contactPerson}
                          </div>
                          {item.customer.email && (
                            <div className="text-xs text-gray-500">
                              {item.customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center text-xs text-gray-700">
                          <PhoneIcon className="w-3 h-3 mr-1" />
                          {item.customer.phone}
                        </div>
                        {item.customer.address && (
                          <div className="text-xs text-gray-500 mt-0.5 max-w-[12rem] truncate">
                            {item.customer.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-700">
                          <div className="flex items-center">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {new Date(item.rental.rentalDate).toLocaleDateString()}
                          </div>
                          {item.rental.expectedReturnDate && (
                            <div className={`mt-0.5 ${isOverdue(item.rental.expectedReturnDate) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              Due: {new Date(item.rental.expectedReturnDate).toLocaleDateString()}
                              {isOverdue(item.rental.expectedReturnDate) && ' (Overdue)'}
                            </div>
                          )}
                          {item.rental.rentalAmount && (
                            <div className="text-gray-500 mt-0.5">
                              Value: PKR {item.rental.rentalAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge variant={getStatusColor(item.rental.status) as any} className="font-semibold text-xs py-0 px-2 h-5">
                          {item.rental.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleViewDetails(item)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
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
