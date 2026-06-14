'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BuildingOffice2Icon, MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PublicSiteSettings } from '@/lib/public-site-settings';
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  extractMapEmbedUrl,
  isValidMapEmbedUrl,
} from '@/lib/public-site-settings';

export default function PublicSiteSettingsPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState<PublicSiteSettings>(DEFAULT_PUBLIC_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/site-settings');
      if (res.ok) {
        const data = await res.json();
        setForm({ ...DEFAULT_PUBLIC_SITE_SETTINGS, ...data });
      }
    } catch (err) {
      console.error('Failed to load site settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field: keyof PublicSiteSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMapEmbedChange = (value: string) => {
    const extracted = extractMapEmbedUrl(value);
    handleChange('mapEmbedUrl', extracted || value);
  };

  const mapPreviewUrl = extractMapEmbedUrl(form.mapEmbedUrl);
  const mapUrlValid = isValidMapEmbedUrl(mapPreviewUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setForm({ ...DEFAULT_PUBLIC_SITE_SETTINGS, ...data.settings });
      setSuccess('Public site settings saved. Changes appear on the landing page, contact page, footer, and map.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-red-600">You do not have permission to view this page.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading site settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Public Site & Contact</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage business information, contact details, and map location shown on the landing page, contact page, and footer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}
        {success && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{success}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
              Business information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Business name *</Label>
              <Input
                required
                value={form.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Flamora"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Landing page hero subtitle</Label>
              <Textarea
                rows={3}
                value={form.heroSubtitle}
                onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Footer business description</Label>
              <Textarea
                rows={3}
                value={form.footerTagline}
                onChange={(e) => handleChange('footerTagline', e.target.value)}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-blue-600" />
              Phone & WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Primary phone *</Label>
              <Input
                required
                value={form.phonePrimary}
                onChange={(e) => handleChange('phonePrimary', e.target.value)}
                placeholder="+92 300 1234567"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Secondary phone</Label>
              <Input
                value={form.phoneSecondary}
                onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                placeholder="+92 301 9876543"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-gray-700">WhatsApp number (digits only)</Label>
              <Input
                value={form.whatsappNumber}
                onChange={(e) => handleChange('whatsappNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="923001234567"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-gray-500">Used for WhatsApp button on the contact page.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5 text-blue-600" />
              Email addresses
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Primary email *</Label>
              <Input
                required
                type="email"
                value={form.emailPrimary}
                onChange={(e) => handleChange('emailPrimary', e.target.value)}
                placeholder="info@flamora.pk"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Support email</Label>
              <Input
                type="email"
                value={form.emailSupport}
                onChange={(e) => handleChange('emailSupport', e.target.value)}
                placeholder="support@flamora.pk"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-gray-700">Emergency email</Label>
              <Input
                type="email"
                value={form.emailEmergency}
                onChange={(e) => handleChange('emailEmergency', e.target.value)}
                placeholder="emergency@flamora.pk"
                className="h-9 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
              Address, hours & map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Address line 1 *</Label>
                <Input
                  required
                  value={form.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Address line 2</Label>
                <Input
                  value={form.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Weekday hours</Label>
                <Input
                  value={form.businessHoursWeekday}
                  onChange={(e) => handleChange('businessHoursWeekday', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Saturday hours</Label>
                <Input
                  value={form.businessHoursSaturday}
                  onChange={(e) => handleChange('businessHoursSaturday', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Location headline (landing)</Label>
                <Input
                  value={form.locationHeadline}
                  onChange={(e) => handleChange('locationHeadline', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Location subtitle (landing)</Label>
                <Input
                  value={form.locationSubtitle}
                  onChange={(e) => handleChange('locationSubtitle', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Google Maps embed URL *</Label>
              <Textarea
                required
                rows={3}
                value={form.mapEmbedUrl}
                onChange={(e) => handleMapEmbedChange(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted.includes('<iframe') || pasted.includes('src=')) {
                    e.preventDefault();
                    handleMapEmbedChange(pasted);
                  }
                }}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-gray-500">
                Paste the full embed code from Google Maps or just the{' '}
                <code className="text-xs">src</code> URL — both work. Share → Embed a map.
              </p>
              {form.mapEmbedUrl && !mapUrlValid && (
                <p className="text-[11px] text-red-600">
                  Could not find a valid Google Maps embed URL. It must start with{' '}
                  <code className="text-xs">https://www.google.com/maps/embed?</code>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Map title (accessibility)</Label>
              <Input
                value={form.mapTitle}
                onChange={(e) => handleChange('mapTitle', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            {mapPreviewUrl && mapUrlValid && (
              <div className="rounded-lg border border-gray-200 overflow-hidden h-48">
                <iframe
                  src={mapPreviewUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={form.mapTitle || 'Map preview'}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save public site settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
