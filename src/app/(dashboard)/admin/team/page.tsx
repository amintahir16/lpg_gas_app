'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    BuildingOfficeIcon,
    UserPlusIcon,
    MagnifyingGlassIcon,
    PhoneIcon,
    IdentificationIcon,
    EnvelopeIcon,
    ClockIcon
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
}

export default function TeamManagementPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cnic: '',
        password: '',
        confirmPassword: ''
    });

    const fetchTeamMembers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/team?search=${search}`);
            if (response.ok) {
                const data = await response.json();
                setTeamMembers(data);
            }
        } catch (error) {
            console.error('Failed to fetch team members', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, [search]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Basic CNIC formatting as user types (12345-1234567-8)
        if (name === 'cnic') {
            let formattedCnic = value.replace(/\D/g, ''); // Remove non-digits
            if (formattedCnic.length > 5) formattedCnic = formattedCnic.slice(0, 5) + '-' + formattedCnic.slice(5);
            if (formattedCnic.length > 13) formattedCnic = formattedCnic.slice(0, 13) + '-' + formattedCnic.slice(13);
            if (formattedCnic.length > 15) formattedCnic = formattedCnic.slice(0, 15); // Max length

            setFormData(prev => ({ ...prev, [name]: formattedCnic }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        // Validate Password Match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsSubmitting(false);
            return;
        }

        // Validate CNIC format
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
        if (!cnicRegex.test(formData.cnic)) {
            setError('Invalid CNIC format. Use 12345-1234567-8');
            setIsSubmitting(false);
            return;
        }

        try {
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...submissionData } = formData;

            const response = await fetch('/api/admin/team', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create admin');
            }

            setIsDialogOpen(false);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                cnic: '',
                password: '',
                confirmPassword: ''
            });
            fetchTeamMembers(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
        return (
            <div className="p-8 text-center text-red-600">
                You do not have permission to view this page.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Team Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage admin accounts and monitor team activity
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 text-xs">
                            <UserPlusIcon className="w-3 h-3 mr-2" />
                            Add Team Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add New Admin</DialogTitle>
                            <DialogDescription>
                                Create a new admin account. They will have full access to manage the system.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-2" autoComplete="off">
                            {error && (
                                <div className="p-3 text-xs font-medium text-red-600 bg-red-50 rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="firstName" className="text-xs font-medium text-gray-700">First Name</Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        placeholder="John"
                                        className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="lastName" className="text-xs font-medium text-gray-700">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        placeholder="Doe"
                                        className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-medium text-gray-700">Email Address</Label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="john@example.com"
                                        className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                        autoComplete="new-password" // Hack to prevent autocomplete
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-medium text-gray-700">Phone Number</Label>
                                    <div className="relative">
                                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="+92 300..."
                                            className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="cnic" className="text-xs font-medium text-gray-700">CNIC</Label>
                                    <div className="relative">
                                        <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="cnic"
                                            name="cnic"
                                            required
                                            value={formData.cnic}
                                            onChange={handleInputChange}
                                            placeholder="12345-..."
                                            className="pl-9 h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                            maxLength={15}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-medium text-gray-700">Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Min 6 chars"
                                        className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Confirm password"
                                        className="h-9 text-sm bg-gray-50/50 focus:bg-white transition-colors"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-4 border-t border-gray-100 mt-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-9 text-gray-500 hover:text-gray-900">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-6 shadow-sm">
                                    {isSubmitting ? 'Creating...' : 'Create Admin'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search..."
                    className="pl-9 max-w-sm bg-white border-gray-200 h-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name / Email</th>
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">Contact</th>
                                <th className="px-4 py-3 font-medium">CNIC</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : teamMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                        No team members found
                                    </td>
                                </tr>
                            ) : (
                                teamMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{member.name}</span>
                                                <span className="text-gray-500 text-xs">{member.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={member.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className={`text-xs px-2 py-0.5 ${member.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                                                {member.role.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex items-center space-x-2 text-xs">
                                                <PhoneIcon className="w-3 h-3 text-gray-400" />
                                                <span>{member.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                            {member.cnic || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                                <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="text-gray-600 text-xs">{member.isActive ? 'Active' : 'Inactive'}</span>
                                            </div>
                                            {member.lastActiveAt && (
                                                <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-gray-400">
                                                    <ClockIcon className="w-3 h-3" />
                                                    <span>{new Date(member.lastActiveAt).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/admin/team/${member.id}`)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-7 px-2 text-xs"
                                            >
                                                Profile
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
