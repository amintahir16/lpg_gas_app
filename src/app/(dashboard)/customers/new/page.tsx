'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const customerData = {
        name: formData.get('name') as string,
        contactPerson: formData.get('contactPerson') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        creditLimit: formData.get('creditLimit') as string,
        paymentTermsDays: formData.get('paymentTermsDays') as string,
        notes: formData.get('notes') as string,
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      const customer = await response.json();
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New B2B Customer</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Create a new Industries & Restaurants customer
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

      {/* Customer Form */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Enter the customer's basic information and credit terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer Name *
                </label>
                <Input 
                  name="name" 
                  type="text" 
                  placeholder="Enter customer name" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Person *
                </label>
                <Input 
                  name="contactPerson" 
                  type="text" 
                  placeholder="Enter contact person name" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input 
                  name="phone" 
                  type="tel" 
                  placeholder="Enter phone number" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <Input 
                  name="email" 
                  type="email" 
                  placeholder="Enter email address" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <Textarea 
                  name="address" 
                  placeholder="Enter customer address" 
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Credit Limit (PKR)
                </label>
                <Input 
                  name="creditLimit" 
                  type="number" 
                  placeholder="0.00" 
                  step="0.01" 
                  defaultValue="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Terms (Days)
                </label>
                <Input 
                  name="paymentTermsDays" 
                  type="number" 
                  placeholder="30" 
                  defaultValue="30"
                  min="1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <Textarea 
                  name="notes" 
                  placeholder="Enter any additional notes" 
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Customer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
