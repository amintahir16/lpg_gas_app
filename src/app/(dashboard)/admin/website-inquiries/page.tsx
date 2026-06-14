'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  EnvelopeIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/select-custom';
import { Textarea } from '@/components/ui/textarea';

type InquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type InquiryType = 'CONTACT' | 'SHOP_ORDER';

interface WebsiteInquiry {
  id: string;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  deliveryAddress: string | null;
  cartItems: Array<{ name: string; quantity: number; price: number; size?: string | null }> | null;
  totalAmount: string | number | null;
  adminNotes: string | null;
  createdAt: string;
}

const statusVariant = (status: InquiryStatus) => {
  switch (status) {
    case 'NEW':
      return 'destructive';
    case 'IN_PROGRESS':
      return 'default';
    case 'RESOLVED':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function WebsiteInquiriesPage() {
  const { data: session } = useSession();
  const [inquiries, setInquiries] = useState<WebsiteInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | InquiryType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InquiryStatus>('ALL');
  const [newCount, setNewCount] = useState(0);
  const [selected, setSelected] = useState<WebsiteInquiry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState<InquiryStatus>('NEW');
  const [saving, setSaving] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/website-inquiries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
        setNewCount(data.summary?.newCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch website inquiries', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    if (selected) {
      setAdminNotes(selected.adminNotes || '');
      setStatus(selected.status);
    }
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/website-inquiries/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated);
        await fetchInquiries();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-red-600">You do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Website Inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contact form messages and shop trolley checkout requests from the public website.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">New leads</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{newCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Contact inquiries</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {inquiries.filter((i) => i.type === 'CONTACT').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Shop orders</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {inquiries.filter((i) => i.type === 'SHOP_ORDER').length}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, phone, email, subject..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CustomSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as 'ALL' | InquiryType)}
          options={[
            { value: 'ALL', label: 'All types' },
            { value: 'CONTACT', label: 'Contact form' },
            { value: 'SHOP_ORDER', label: 'Shop checkout' },
          ]}
          className="w-full lg:w-48"
        />
        <CustomSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'ALL' | InquiryStatus)}
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'NEW', label: 'New' },
            { value: 'IN_PROGRESS', label: 'In progress' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' },
          ]}
          className="w-full lg:w-48"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No inquiries yet</td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      onClick={() => setSelected(inquiry)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === inquiry.id ? 'bg-blue-50/60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{inquiry.name}</div>
                        <div className="text-xs text-gray-500">{inquiry.phone || inquiry.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {inquiry.type === 'CONTACT' ? 'Contact' : 'Shop order'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate">
                        {inquiry.subject || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(inquiry.status)} className="text-[10px]">
                          {inquiry.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(inquiry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-5 min-h-[420px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-6">
              Select an inquiry to view details, update status, and add internal notes.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {selected.type === 'CONTACT' ? (
                      <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <ShoppingCartIcon className="w-5 h-5 text-orange-600" />
                    )}
                    <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={statusVariant(selected.status)}>{selected.status.replace('_', ' ')}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                {selected.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${selected.email}`} className="hover:text-blue-600">{selected.email}</a>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${selected.phone}`} className="hover:text-blue-600">{selected.phone}</a>
                  </div>
                )}
                {selected.deliveryAddress && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>{selected.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {selected.subject && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Subject</p>
                  <p className="text-sm text-gray-800">{selected.subject}</p>
                </div>
              )}

              {selected.message && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Message</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}

              {selected.type === 'SHOP_ORDER' && Array.isArray(selected.cartItems) && selected.cartItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Cart items</p>
                  <div className="space-y-2">
                    {selected.cartItems.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex justify-between text-sm border border-gray-100 rounded-md px-3 py-2">
                        <span>{item.name}{item.size ? ` (${item.size})` : ''} × {item.quantity}</span>
                        <span className="font-medium">PKR {(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {selected.totalAmount != null && (
                    <p className="text-sm font-bold text-gray-900 mt-2">
                      Total: PKR {Number(selected.totalAmount).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <CustomSelect
                  value={status}
                  onChange={(v) => setStatus(v as InquiryStatus)}
                  options={[
                    { value: 'NEW', label: 'New' },
                    { value: 'IN_PROGRESS', label: 'In progress' },
                    { value: 'RESOLVED', label: 'Resolved' },
                    { value: 'CLOSED', label: 'Closed' },
                  ]}
                />
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes (not visible to customer)"
                  rows={3}
                />
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save updates'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
