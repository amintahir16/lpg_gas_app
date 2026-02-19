'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    IdentificationIcon,
    CalendarIcon,
    ClockIcon,
    PencilIcon,
    TrashIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface ActivityLog {
    id: string;
    action: string;
    details: string;
    createdAt: string;
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
    activityLogs?: ActivityLog[];
}

export default function AdminProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();
    const [member, setMember] = useState<TeamMember | null>(null);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Edit Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cnic: '',
        isActive: true
    });
    const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

    const fetchMemberDetails = async () => {
        setIsLoading(true);
        try {
            const [memberRes, logsRes] = await Promise.all([
                fetch(`/api/admin/team/${id}`),
                fetch(`/api/admin/team/${id}/activity`)
            ]);

            if (memberRes.ok) {
                const data = await memberRes.json();
                setMember(data);

                // Fallback for names if not explicitly set
                const nameParts = data.name ? data.name.split(' ') : [];
                const fallbackFirstName = nameParts[0] || '';
                const fallbackLastName = nameParts.slice(1).join(' ') || '';

                setFormData({
                    firstName: data.firstName || fallbackFirstName,
                    lastName: data.lastName || fallbackLastName,
                    email: data.email || '',
                    phone: data.phone || '',
                    cnic: data.cnic || '',
                    isActive: data.isActive
                });
            }

            if (logsRes.ok) {
                const logs = await logsRes.json();
                setActivityLogs(logs);
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
            const response = await fetch(`/api/admin/team/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to update admin');

            setIsEditDialogOpen(false);
            fetchMemberDetails();
        } catch (err: any) {
            setError(err.message);
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-1 border-t-4 border-t-blue-600 shadow-sm">
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
                < Card className="md:col-span-2 shadow-sm" >
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                        <CardDescription>
                            Recent actions performed by this admin
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activityLogs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No activity recorded yet</div>
                        ) : (
                            <div className="space-y-6">
                                {activityLogs.map((log) => (
                                    <div key={log.id} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2"></div>
                                            <div className="w-0.5 flex-1 bg-gray-100 my-1"></div>
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-sm font-medium text-gray-900">{log.action.replace('_', ' ')}</p>
                                            <p className="text-sm text-gray-500">{log.details}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card >
            </div >
        </div >
    );
}
