'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/select-custom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHOP_ACCENT_COLORS, SHOP_ICON_OPTIONS } from '@/lib/shop-catalog';

type ShopCatalogIcon = 'HOME' | 'BUILDING' | 'FACTORY' | 'FLAME' | 'PACKAGE' | 'TRUCK';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  sizeLabel: string | null;
  deliveryTimeNote: string | null;
  icon: ShopCatalogIcon;
  accentColor: string;
  inStock: boolean;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  sizeLabel: '',
  deliveryTimeNote: '',
  icon: 'PACKAGE' as ShopCatalogIcon,
  accentColor: '#f36523',
  inStock: true,
  isActive: true,
  sortOrder: '0',
};

export default function ShopCatalogAdminPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ShopItem | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shop-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch shop items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: ShopItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      sizeLabel: item.sizeLabel || '',
      deliveryTimeNote: item.deliveryTimeNote || '',
      icon: item.icon,
      accentColor: item.accentColor,
      inStock: item.inStock,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        sizeLabel: form.sizeLabel,
        deliveryTimeNote: form.deliveryTimeNote,
        icon: form.icon,
        accentColor: form.accentColor,
        inStock: form.inStock,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      };
      const url = editing ? `/api/admin/shop-items/${editing.id}` : '/api/admin/shop-items';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save item');
      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/shop-items/${deleteConfirm.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete item');
      }
      setDeleteConfirm(null);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-red-600">You do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Shop Catalogue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage products shown on the public shop page — name, price, delivery time, and visibility.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
          <PlusIcon className="w-3 h-3 mr-2" />
          Add Shop Item
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Delivery time</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Visible</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No shop items yet</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${item.accentColor}18`, border: `1px solid ${item.accentColor}30` }}
                        >
                          <ShoppingBagIcon className="w-4 h-4" style={{ color: item.accentColor }} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.sizeLabel && (
                            <div className="text-xs text-gray-500">{item.sizeLabel}</div>
                          )}
                          <div className="text-xs text-gray-400 line-clamp-1 max-w-xs">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.price > 0 ? `Rs ${item.price.toLocaleString()}` : 'Custom quote'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.deliveryTimeNote ? (
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                          {item.deliveryTimeNote}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.inStock ? 'secondary' : 'destructive'} className="text-[10px]">
                        {item.inStock ? 'In stock' : 'Out of stock'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.isActive ? 'default' : 'outline'} className="text-[10px]">
                        {item.isActive ? 'Live' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(item)}>
                          <PencilIcon className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(item)}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Shop Item' : 'Add Shop Item'}</DialogTitle>
            <DialogDescription>
              Changes appear on the public shop page. Set price to 0 for quote-only items.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-2">
            {error && (
              <div className="p-3 text-xs font-medium text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Item name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Domestic Cylinder"
                  className="h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Description *</Label>
                <Textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short marketing description for the shop card"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Price (PKR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="2500"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Size label</Label>
                <Input
                  value={form.sizeLabel}
                  onChange={(e) => setForm((f) => ({ ...f, sizeLabel: e.target.value }))}
                  placeholder="11.8 KG"
                  className="h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Delivery time note</Label>
                <Input
                  value={form.deliveryTimeNote}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryTimeNote: e.target.value }))}
                  placeholder="Same-day delivery"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Icon</Label>
                <CustomSelect
                  value={form.icon}
                  onChange={(v) => setForm((f) => ({ ...f, icon: v as ShopCatalogIcon }))}
                  options={SHOP_ICON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Accent colour</Label>
                <CustomSelect
                  value={form.accentColor}
                  onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))}
                  options={SHOP_ACCENT_COLORS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Sort order</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.inStock}
                    onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  In stock (customers can add to cart)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  Visible on public shop page
                </label>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="bg-blue-600 hover:bg-blue-700">
                {submitting ? 'Saving...' : editing ? 'Save changes' : 'Add item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete shop item?</DialogTitle>
              <DialogDescription>
                Remove <strong>{deleteConfirm.name}</strong> from the public shop. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
