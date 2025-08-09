"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  registrationNumber: string;
  taxId: string;
  contactPerson: string;
  paymentTerms: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode: string;
  };
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorProfile>>({});

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendor/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof VendorProfile] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setProfile(formData as VendorProfile);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
        <p className="text-gray-600">No profile data found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save Changes</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              {isEditing ? (
                <Input
                  value={formData.companyName || ''}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              {isEditing ? (
                <Input
                  value={formData.contactPerson || ''}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.contactPerson}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              {isEditing ? (
                <Input
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              {isEditing ? (
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900">{profile.address}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              {isEditing ? (
                <Input
                  value={formData.registrationNumber || ''}
                  onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.registrationNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID
              </label>
              {isEditing ? (
                <Input
                  value={formData.taxId || ''}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.taxId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              {isEditing ? (
                <Input
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">{profile.paymentTerms}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Bank Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.accountName || ''}
                    onChange={(e) => handleInputChange('bankDetails.accountName', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900">{profile.bankDetails.accountName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => handleInputChange('bankDetails.accountNumber', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900">{profile.bankDetails.accountNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.bankName || ''}
                    onChange={(e) => handleInputChange('bankDetails.bankName', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900">{profile.bankDetails.bankName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Swift Code
                </label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.swiftCode || ''}
                    onChange={(e) => handleInputChange('bankDetails.swiftCode', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900">{profile.bankDetails.swiftCode}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 