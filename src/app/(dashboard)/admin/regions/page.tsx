'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ArrowPathIcon,
  PhoneIcon,
  MapPinIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Region {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: {
    users?: number;
    customers?: number;
    b2cCustomers?: number;
    cylinders?: number;
  };
}

interface RegionForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: string;
}

const emptyForm: RegionForm = {
  name: '',
  code: '',
  address: '',
  phone: '',
  description: '',
  isActive: true,
  isDefault: false,
  sortOrder: '0',
};

export default function RegionsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState<RegionForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Region | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const fetchRegions = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/regions?includeInactive=${includeInactive ? 'true' : 'false'}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setRegions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) {
      fetchRegions();
    }
  }, [status, isSuperAdmin, includeInactive]);

  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter((r) =>
      [r.name, r.code, r.address, r.phone, r.description]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [regions, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setDialogMode('create');
  };

  const openEdit = (region: Region) => {
    setEditing(region);
    setForm({
      name: region.name,
      code: region.code || '',
      address: region.address || '',
      phone: region.phone || '',
      description: region.description || '',
      isActive: region.isActive,
      isDefault: region.isDefault,
      sortOrder: String(region.sortOrder ?? 0),
    });
    setFormError('');
    setDialogMode('edit');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
        isDefault: form.isDefault,
        sortOrder: Number(form.sortOrder) || 0,
      };

      const url = dialogMode === 'edit' && editing
        ? `/api/admin/regions/${editing.id}`
        : '/api/admin/regions';
      const method = dialogMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save region');
      }
      closeDialog();
      await fetchRegions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/regions/${confirmDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to delete region');
      }
      setConfirmDelete(null);
      await fetchRegions();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-600 font-medium">
        Only Super Administrators can manage regions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
            Regions / Branches
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage the branches your business operates across.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRegions}
            className="h-8 text-xs"
            disabled={loading}
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            New Region
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search regions by name, code, address…"
            className="pl-9 bg-white border-gray-200 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show inactive regions
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Address / Phone</th>
                <th className="px-4 py-3 font-medium">Counts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading regions…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRegions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    <BuildingOffice2Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    No regions found. Create your first branch to get started.
                  </td>
                </tr>
              ) : (
                filteredRegions.map((region) => (
                  <tr key={region.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {region.isDefault ? (
                          <StarIconSolid className="w-4 h-4 text-amber-500" />
                        ) : (
                          <StarIcon className="w-4 h-4 text-gray-300" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{region.name}</div>
                          {region.description && (
                            <div className="text-xs text-gray-500 line-clamp-1 max-w-[280px]">
                              {region.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {region.code || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>{region.address || '—'}</div>
                      <div className="text-gray-400">{region.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      <div>Users: {region._count?.users ?? 0}</div>
                      <div>Customers: {(region._count?.customers ?? 0) + (region._count?.b2cCustomers ?? 0)}</div>
                      <div>Cylinders: {region._count?.cylinders ?? 0}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={
                            region.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-2 py-0 h-5'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-200 text-[10px] px-2 py-0 h-5'
                          }
                        >
                          {region.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {region.isDefault && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-2 py-0 h-5">
                            Default
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 border-blue-200"
                        onClick={() => openEdit(region)}
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          setDeleteError('');
                          setConfirmDelete(region);
                        }}
                        disabled={region.isDefault}
                        title={region.isDefault ? 'Cannot delete the default region' : undefined}
                      >
                        <TrashIcon className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'edit' ? 'Edit Region' : 'New Region'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'edit'
                ? 'Update branch details. Set this branch as the default to make it the fallback for unscoped data.'
                : 'Add a new branch to operate. Existing data will not be assigned automatically.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-2" autoComplete="off">
            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-700 bg-red-50 rounded-md border border-red-200">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-gray-700 flex items-center gap-2">
                <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400" />
                Region Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Hayatabad Branch"
                className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-medium text-gray-700">Code</Label>
                <div className="relative">
                  <HashtagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="code"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="e.g. HYT"
                    className="pl-9 h-9 text-sm font-mono uppercase bg-gray-50/50 focus:bg-white transition-colors"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-gray-700">Phone</Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+92 300..."
                    className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium text-gray-700">Address</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Street, City"
                  className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-gray-700">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={2}
                value={form.description}
                onChange={handleChange}
                placeholder="Internal notes about this branch"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50/50 focus:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sortOrder" className="text-xs font-medium text-gray-700">Sort Order</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={handleChange}
                  className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2 justify-center pt-5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  Active
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={form.isDefault}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Default region
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeDialog}
                className="h-9 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 shadow-sm"
              >
                {submitting
                  ? 'Saving…'
                  : dialogMode === 'edit'
                  ? 'Save changes'
                  : 'Create region'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrashIcon className="w-5 h-5 text-red-600" />
              Delete Region
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete <span className="font-semibold">{confirmDelete?.name}</span>.
              This will fail if any data is still attached to this region. Reassign or remove
              that data first.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 p-3 text-xs font-medium text-red-700 bg-red-50 rounded-md border border-red-200">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting…' : 'Delete region'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
