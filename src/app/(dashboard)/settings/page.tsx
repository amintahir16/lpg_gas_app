"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

interface SystemSettings {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  businessHours: string;
  deliveryRadius: number;
  defaultCreditLimit: number;
  taxRate: number;
  currency: string;
  timezone: string;
  maintenanceInterval: number;
  safetyInspectionInterval: number;
  totalCustomers?: number;
  totalVendors?: number;
  totalCylinders?: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setFormData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings(formData as SystemSettings);
      setIsEditing(false);
      toast.success('Settings updated successfully!');
      
      // Refresh settings to get updated data
      await fetchSettings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(errorMessage);
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(settings || {});
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 mb-2">Error: {error}</p>
          <Button onClick={fetchSettings} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
        <p className="text-gray-600">No settings data found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Manage your business configuration and preferences</p>
        </div>
        {!isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/pricing')}>
              Price Management
            </Button>
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* System Statistics */}
      {settings.totalCustomers !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-blue-50/50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{settings.totalCustomers}</p>
                <p className="text-sm text-gray-600">Total Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-green-50/50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{settings.totalVendors}</p>
                <p className="text-sm text-gray-600">Total Vendors</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-purple-50/50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{settings.totalCylinders}</p>
                <p className="text-sm text-gray-600">Total Cylinders</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  placeholder="Enter company name"
                />
              ) : (
                <p className="text-gray-900">{settings.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="w-full"
                  placeholder="Enter contact email"
                />
              ) : (
                <p className="text-gray-900">{settings.contactEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={formData.contactPhone || ''}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="w-full"
                  placeholder="Enter contact phone"
                />
              ) : (
                <p className="text-gray-900">{settings.contactPhone}</p>
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
                  placeholder="Enter company address"
                />
              ) : (
                <p className="text-gray-900">{settings.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Hours
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.businessHours || ''}
                  onChange={(e) => handleInputChange('businessHours', e.target.value)}
                  className="w-full"
                  rows={2}
                  placeholder="Enter business hours"
                />
              ) : (
                <p className="text-gray-900">{settings.businessHours}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Configuration */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Business Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Radius (miles)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={formData.deliveryRadius || 0}
                  onChange={(e) => handleInputChange('deliveryRadius', Number(e.target.value))}
                  className="w-full"
                  placeholder="Enter delivery radius"
                />
              ) : (
                <p className="text-gray-900">{settings.deliveryRadius} miles</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Credit Limit ($)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.defaultCreditLimit || 0}
                  onChange={(e) => handleInputChange('defaultCreditLimit', Number(e.target.value))}
                  className="w-full"
                  placeholder="Enter default credit limit"
                />
              ) : (
                <p className="text-gray-900">${settings.defaultCreditLimit.toFixed(2)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate || 0}
                  onChange={(e) => handleInputChange('taxRate', Number(e.target.value))}
                  className="w-full"
                  placeholder="Enter tax rate"
                />
              ) : (
                <p className="text-gray-900">{settings.taxRate}%</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              {isEditing ? (
                <Select
                  value={formData.currency || ''}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                >
                  <option value="">Select currency</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </Select>
              ) : (
                <p className="text-gray-900">{settings.currency}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              {isEditing ? (
                <Select
                  value={formData.timezone || ''}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                >
                  <option value="">Select timezone</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                </Select>
              ) : (
                <p className="text-gray-900">{settings.timezone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Settings */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Maintenance & Safety Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Interval (days)
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    value={formData.maintenanceInterval || 0}
                    onChange={(e) => handleInputChange('maintenanceInterval', Number(e.target.value))}
                    className="w-full"
                    placeholder="Enter maintenance interval"
                  />
                ) : (
                  <p className="text-gray-900">{settings.maintenanceInterval} days</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Inspection Interval (days)
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    value={formData.safetyInspectionInterval || 0}
                    onChange={(e) => handleInputChange('safetyInspectionInterval', Number(e.target.value))}
                    className="w-full"
                    placeholder="Enter safety inspection interval"
                  />
                ) : (
                  <p className="text-gray-900">{settings.safetyInspectionInterval} days</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 