'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    EnvelopeIcon,
    PhoneIcon,
    IdentificationIcon,
    CalendarIcon,
    ClockIcon,
    PencilIcon,
    TrashIcon,
    ArrowLeftIcon,
    BanknotesIcon,
    UserPlusIcon,
    UserMinusIcon,
    ShoppingCartIcon,
    ArrowUturnLeftIcon,
    CubeIcon,
    WrenchScrewdriverIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    ArrowTopRightOnSquareIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import RegionMultiSelect from '@/components/RegionMultiSelect';

interface ActivityLog {
    id: string;
    action: string;
    details: string;
    link?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, any> | null;
    createdAt: string;
}

const ACTIVITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    B2B_CUSTOMER_CREATED: UserPlusIcon,
    B2B_CUSTOMER_UPDATED: PencilSquareIcon,
    B2B_CUSTOMER_DELETED: UserMinusIcon,
    B2C_CUSTOMER_CREATED: UserPlusIcon,
    B2C_CUSTOMER_UPDATED: PencilSquareIcon,
    B2C_CUSTOMER_DELETED: UserMinusIcon,
    B2B_TRANSACTION_CREATED: ShoppingCartIcon,
    B2B_TRANSACTION_VOIDED: ArrowUturnLeftIcon,
    B2C_TRANSACTION_CREATED: ShoppingCartIcon,
    B2C_TRANSACTION_VOIDED: ArrowUturnLeftIcon,
    CYLINDER_CREATED: CubeIcon,
    CYLINDER_UPDATED: CubeIcon,
    CYLINDER_DELETED: CubeIcon,
    CUSTOM_ITEM_CREATED: WrenchScrewdriverIcon,
    CUSTOM_ITEM_UPDATED: WrenchScrewdriverIcon,
    CUSTOM_ITEM_DELETED: WrenchScrewdriverIcon,
    OFFICE_EXPENSE_CREATED: BuildingOfficeIcon,
    SALARY_PAID: CurrencyDollarIcon,
};

const ACTIVITY_TONE_MAP: Record<string, { dot: string; ring: string; iconColor: string; chip: string }> = {
    CREATED: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', iconColor: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    UPDATED: { dot: 'bg-blue-500', ring: 'ring-blue-100', iconColor: 'text-blue-600', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
    DELETED: { dot: 'bg-rose-500', ring: 'ring-rose-100', iconColor: 'text-rose-600', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
    VOIDED: { dot: 'bg-amber-500', ring: 'ring-amber-100', iconColor: 'text-amber-600', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
    PAID: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', iconColor: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    DEFAULT: { dot: 'bg-slate-400', ring: 'ring-slate-100', iconColor: 'text-slate-600', chip: 'bg-slate-50 text-slate-700 border-slate-200' },
};

function getActivityTone(action: string) {
    if (action.endsWith('_CREATED')) return ACTIVITY_TONE_MAP.CREATED;
    if (action.endsWith('_UPDATED')) return ACTIVITY_TONE_MAP.UPDATED;
    if (action.endsWith('_DELETED')) return ACTIVITY_TONE_MAP.DELETED;
    if (action.endsWith('_VOIDED')) return ACTIVITY_TONE_MAP.VOIDED;
    if (action === 'SALARY_PAID') return ACTIVITY_TONE_MAP.PAID;
    return ACTIVITY_TONE_MAP.DEFAULT;
}

function humanizeAction(action: string) {
    return action
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');
}

function formatRelativeTime(value: string) {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface SalaryRecord {
    id: string;
    amount: number;
    month: number;
    year: number;
    monthLabel: string;
    paidDate: string;
    paymentMethod: string;
    notes: string | null;
}

interface BranchSummary {
    id: string;
    name: string;
    code?: string | null;
    isActive: boolean;
    isPrimary: boolean;
}

interface TeamMember {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    cnic?: string;
    role: string;
    isActive: boolean;
    lastActiveAt?: string;
    createdAt: string;
    regionId?: string | null;
    region?: { id: string; name: string; code?: string | null; isActive?: boolean } | null;
    regions?: BranchSummary[];
    activityLogs?: ActivityLog[];
}

interface RegionOption {
    id: string;
    name: string;
    code?: string | null;
    isActive: boolean;
}

export default function AdminProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();
    const [member, setMember] = useState<TeamMember | null>(null);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Edit Form State. `regionIds` is ordered — index 0 is primary.
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cnic: '',
        isActive: true,
        regionIds: [] as string[],
    });
    const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
    const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);

    const profileCardRef = useRef<HTMLDivElement | null>(null);
    const [profileCardHeight, setProfileCardHeight] = useState<number | null>(null);

    useEffect(() => {
        const node = profileCardRef.current;
        if (!node) return;
        if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const next = Math.round(entry.contentRect.height);
                if (next > 0) setProfileCardHeight(next);
            }
        });
        observer.observe(node);
        setProfileCardHeight(node.getBoundingClientRect().height);
        return () => observer.disconnect();
    }, [member]);

    const fetchMemberDetails = async () => {
        setIsLoading(true);
        try {
            const [memberRes, logsRes, salaryRes] = await Promise.all([
                fetch(`/api/admin/team/${id}`),
                fetch(`/api/admin/team/${id}/activity`),
                fetch(`/api/admin/team/${id}/salaries`)
            ]);

            if (memberRes.ok) {
                const data = await memberRes.json();
                setMember(data);

                const nameParts = data.name ? data.name.split(' ') : [];
                const fallbackFirstName = nameParts[0] || '';
                const fallbackLastName = nameParts.slice(1).join(' ') || '';

                // Seed regionIds from the API's canonical accessible list
                // (primary first), falling back to the legacy single regionId.
                const seededRegionIds: string[] = Array.isArray(data.regions) && data.regions.length > 0
                    ? data.regions.map((r: BranchSummary) => r.id)
                    : data.regionId ? [data.regionId] : [];

                setFormData({
                    firstName: data.firstName || fallbackFirstName,
                    lastName: data.lastName || fallbackLastName,
                    email: data.email || '',
                    phone: data.phone || '',
                    cnic: data.cnic || '',
                    isActive: data.isActive,
                    regionIds: seededRegionIds,
                });
            }

            if (logsRes.ok) {
                const logs = await logsRes.json();
                setActivityLogs(logs);
            }

            if (salaryRes.ok) {
                const salaries = await salaryRes.json();
                setSalaryRecords(salaries);
            }
        } catch (error) {
            console.error('Failed to fetch member details', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMemberDetails();
    }, [id]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/regions?includeInactive=false', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                setRegionOptions(data);
            } catch {
                // ignore
            }
        })();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'cnic') {
            let formattedCnic = value.replace(/\D/g, '');
            if (formattedCnic.length > 5) formattedCnic = formattedCnic.slice(0, 5) + '-' + formattedCnic.slice(5);
            if (formattedCnic.length > 13) formattedCnic = formattedCnic.slice(0, 13) + '-' + formattedCnic.slice(13);
            if (formattedCnic.length > 15) formattedCnic = formattedCnic.slice(0, 15);
            setFormData(prev => ({ ...prev, [name]: formattedCnic }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const payload: Record<string, unknown> = { ...formData };
            // Only send branch assignments for ADMIN — SUPER_ADMINs aren't
            // region-scoped, so the API ignores `regionIds` for them anyway.
            if (member?.role !== 'ADMIN') {
                delete payload.regionIds;
            } else {
                payload.regionIds = formData.regionIds;
            }

            const response = await fetch(`/api/admin/team/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update admin');
            }

            setIsEditDialogOpen(false);
            fetchMemberDetails();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteDialogOpen(true);
        setDeleteConfirmationName('');
        setError('');
    };

    const handleDeleteConfirm = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!member || deleteConfirmationName !== member.name) {
            setError('Please enter the exact name to confirm.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/admin/team/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete admin');
            }

            router.push('/admin/team');
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false); // Only reset if failed, otherwise we redirect
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading profile...</div>;
    if (!member) return <div className="p-8 text-center">Admin not found</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600 h-8 text-xs"
            >
                <ArrowLeftIcon className="w-3 h-3 mr-2" />
                Back to Team
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-start">
                {/* Profile Card */}
                <Card ref={profileCardRef} className="md:col-span-1 border-t-4 border-t-blue-600 shadow-sm">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-bold">{member.name}</CardTitle>
                                <div className="text-sm text-gray-600 flex items-center mt-1">
                                    <Badge variant="secondary" className="mr-2">{member.role}</Badge>
                                    <span className={`h-2 w-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                                    <span className="text-xs">{member.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                                <EnvelopeIcon className="w-4 h-4 mr-3 text-gray-400" />
                                {member.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <PhoneIcon className="w-4 h-4 mr-3 text-gray-400" />
                                {member.phone || 'No phone'}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <IdentificationIcon className="w-4 h-4 mr-3 text-gray-400" />
                                <span className="font-mono">{member.cnic || 'No CNIC'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <CalendarIcon className="w-4 h-4 mr-3 text-gray-400" />
                                Joined {new Date(member.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <ClockIcon className="w-4 h-4 mr-3 text-gray-400" />
                                Last active {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleString() : 'Never'}
                            </div>
                            {member.role === 'ADMIN' && (
                                <div className="flex items-start text-sm text-gray-600">
                                    <BuildingOfficeIcon className="w-4 h-4 mr-3 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                                            {(member.regions?.length || 0) > 1 ? 'Branches' : 'Branch'}
                                        </div>
                                        {member.regions && member.regions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {member.regions.map((r) => (
                                                    <span
                                                        key={r.id}
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                            r.isPrimary
                                                                ? 'border-blue-300 bg-blue-50 text-blue-800'
                                                                : 'border-gray-200 bg-gray-50 text-gray-700'
                                                        }`}
                                                        title={r.isPrimary ? 'Primary (auto-selected on login)' : undefined}
                                                    >
                                                        {r.isPrimary && (
                                                            <StarIconSolid className="h-3 w-3 text-amber-500" />
                                                        )}
                                                        <span className="truncate max-w-[140px]">{r.name}</span>
                                                        {r.code && (
                                                            <span className="font-mono text-[10px] opacity-70">· {r.code}</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : member.region ? (
                                            <span className="font-medium text-gray-900">
                                                {member.region.name}
                                                {member.region.code && (
                                                    <span className="ml-1 text-xs font-mono text-gray-400">
                                                        ({member.region.code})
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-amber-700 italic">Unassigned</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex space-x-2">
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs">
                                        <PencilIcon className="w-3 h-3 mr-2" />
                                        Edit
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                                    <DialogHeader className="px-6 pt-6">
                                        <DialogTitle>Edit Admin Details</DialogTitle>
                                        <DialogDescription>
                                            Update the admin's personal information and account status.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpdate} className="space-y-4 px-6 pb-6 pt-4">
                                        {error && (
                                            <div className="p-3 text-xs font-medium text-red-600 bg-red-50 rounded-md border border-red-200">
                                                {error}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-gray-700">First Name</Label>
                                                <Input
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-gray-700">Last Name</Label>
                                                <Input
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-gray-700">Phone</Label>
                                            <div className="relative">
                                                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-gray-700">CNIC</Label>
                                            <div className="relative">
                                                <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    name="cnic"
                                                    value={formData.cnic}
                                                    onChange={handleInputChange}
                                                    className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {member.role === 'ADMIN' && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-gray-700 flex items-center gap-2">
                                                    <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    Assigned Branch{formData.regionIds.length === 1 ? '' : 'es'}
                                                </Label>
                                                <RegionMultiSelect
                                                    value={formData.regionIds}
                                                    onChange={(ids) => setFormData(prev => ({ ...prev, regionIds: ids }))}
                                                    options={regionOptions}
                                                    placeholder="Select one or more branches…"
                                                />
                                                <p className="text-[11px] text-gray-500 leading-snug">
                                                    Pick one or more branches. The first one is the <span className="font-semibold">primary</span> (auto-selected on login). Click the
                                                    <StarIconSolid className="inline-block h-3 w-3 mx-0.5 text-amber-500 align-text-top" />
                                                    on any chip to make it primary. Removing all branches forces a re-login until reassigned.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center space-x-2 pt-2">
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    id="isActive"
                                                    checked={formData.isActive}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </div>
                                            <div className="text-sm">
                                                <Label htmlFor="isActive" className="font-medium text-gray-700 cursor-pointer">Active Account</Label>
                                                <p className="text-xs text-gray-500">Allow this admin to access the system</p>
                                            </div>
                                        </div>

                                        <DialogFooter className="pt-2 border-t border-gray-100 mt-4">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(false)} className="h-9 text-gray-500 hover:text-gray-900">
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-6 shadow-sm">
                                                Save Changes
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>



                            {member.role !== 'SUPER_ADMIN' && (
                                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-8 text-xs"
                                            onClick={handleDeleteClick}
                                            disabled={isSubmitting}
                                        >
                                            <TrashIcon className="w-3 h-3 mr-2" />
                                            Delete
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-red-700 font-bold flex items-center gap-2">
                                                <TrashIcon className="w-5 h-5" />
                                                Delete Admin Account
                                            </DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone. This will permanently delete
                                                <span className="font-semibold text-gray-900 mx-1">{member.name}</span>
                                                and remove their data from our servers.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleDeleteConfirm} className="space-y-4 px-6 pb-6 pt-2">
                                            {error && (
                                                <div className="p-3 text-xs font-medium text-red-600 bg-red-50 rounded-md border border-red-200">
                                                    {error}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="confirmationName" className="text-xs font-medium text-gray-700">
                                                    To confirm, type "<span className="font-bold select-all">{member.name}</span>" below:
                                                </Label>
                                                <Input
                                                    id="confirmationName"
                                                    value={deleteConfirmationName}
                                                    onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                                    placeholder={member.name}
                                                    className="h-9 text-sm border-red-200 focus:border-red-500 focus:ring-red-500"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            <DialogFooter className="gap-2 sm:gap-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsDeleteDialogOpen(false)}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="bg-red-600 hover:bg-red-700 text-white border-none"
                                                    disabled={isSubmitting || deleteConfirmationName !== member.name}
                                                >
                                                    {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardContent>
                </Card >

                {/* Activity Log */}
                < Card
                    className="md:col-span-2 shadow-sm flex flex-col"
                    style={profileCardHeight ? { height: `${profileCardHeight}px` } : undefined}
                >
                    <CardHeader className="flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Activity Log</CardTitle>
                                <CardDescription>
                                    Every action {member.name?.split(' ')[0] || 'this admin'} has taken in the system
                                </CardDescription>
                            </div>
                            {activityLogs.length > 0 && (
                                <Badge variant="secondary" className="h-6">
                                    {activityLogs.length} entr{activityLogs.length === 1 ? 'y' : 'ies'}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-hidden">
                        {activityLogs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <ClockIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                <p className="text-sm">No activity recorded yet</p>
                                <p className="text-xs text-gray-400 mt-1">Transactions and actions will appear here</p>
                            </div>
                        ) : (
                            <div className="relative h-full overflow-y-auto pr-1">
                                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100" />
                                <ul className="space-y-4">
                                    {activityLogs.map((log) => {
                                        const Icon = ACTIVITY_ICON_MAP[log.action] || ClockIcon;
                                        const tone = getActivityTone(log.action);
                                        const isClickable = !!log.link;
                                        return (
                                            <li key={log.id} className="relative pl-12">
                                                <div className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-4 ${tone.ring}`}>
                                                    <Icon className={`h-4 w-4 ${tone.iconColor}`} />
                                                </div>
                                                <div
                                                    className={`group rounded-lg border border-gray-100 bg-white p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 ${isClickable ? 'cursor-pointer' : ''}`}
                                                    onClick={() => {
                                                        if (isClickable && log.link) router.push(log.link);
                                                    }}
                                                    role={isClickable ? 'button' : undefined}
                                                    tabIndex={isClickable ? 0 : undefined}
                                                    onKeyDown={(event) => {
                                                        if (!isClickable || !log.link) return;
                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                            event.preventDefault();
                                                            router.push(log.link);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}>
                                                                    {humanizeAction(log.action)}
                                                                </span>
                                                                <span
                                                                    className="text-[11px] text-gray-400"
                                                                    title={new Date(log.createdAt).toLocaleString()}
                                                                    suppressHydrationWarning
                                                                >
                                                                    {formatRelativeTime(log.createdAt)}
                                                                </span>
                                                            </div>
                                                            {log.details && (
                                                                <p className="mt-1.5 text-sm text-gray-700 break-words">
                                                                    {log.details}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {isClickable && (
                                                            <ArrowTopRightOnSquareIcon className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-blue-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card >
            </div >

            {/* Salary Payment History */}
            {salaryRecords.length > 0 && (
                <Card className="shadow-sm border-t-4 border-t-emerald-500">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <BanknotesIcon className="w-5 h-5 mr-2 text-emerald-600" />
                            Salary Payment History
                        </CardTitle>
                        <CardDescription>
                            All salary payments recorded for {member.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="min-w-[550px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Month</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold">Payment Method</TableHead>
                                        <TableHead className="font-semibold">Paid Date</TableHead>
                                        <TableHead className="font-semibold">Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {salaryRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.monthLabel}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-700">
                                                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(record.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{record.paymentMethod}</Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-600" suppressHydrationWarning>
                                                {new Date(record.paidDate).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-sm">{record.notes || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div >
    );
}
