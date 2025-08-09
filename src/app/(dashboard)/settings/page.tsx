"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
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
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setSettings(formData as SystemSettings);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleCancel = () => {
    setFormData(settings || {});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
        <p className="text-red-600">Error: {error}</p>
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
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
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
                <p className="text-gray-900">{settings.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              {isEditing ? (
                <Input
                  value={formData.contactEmail || ''}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="w-full"
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
                  value={formData.contactPhone || ''}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="w-full"
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
                  value={formData.deliveryRadius || 0}
                  onChange={(e) => handleInputChange('deliveryRadius', Number(e.target.value))}
                  className="w-full"
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
                  value={formData.defaultCreditLimit || 0}
                  onChange={(e) => handleInputChange('defaultCreditLimit', Number(e.target.value))}
                  className="w-full"
                />
              ) : (
                <p className="text-gray-900">${settings.defaultCreditLimit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.1"
                  value={formData.taxRate || 0}
                  onChange={(e) => handleInputChange('taxRate', Number(e.target.value))}
                  className="w-full"
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
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
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
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
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
                    value={formData.maintenanceInterval || 0}
                    onChange={(e) => handleInputChange('maintenanceInterval', Number(e.target.value))}
                    className="w-full"
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
                    value={formData.safetyInspectionInterval || 0}
                    onChange={(e) => handleInputChange('safetyInspectionInterval', Number(e.target.value))}
                    className="w-full"
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