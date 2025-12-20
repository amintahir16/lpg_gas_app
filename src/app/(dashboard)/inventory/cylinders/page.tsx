"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowLeftIcon,
  ChartBarIcon,
  CubeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { getCylinderTypeDisplayName, getCylinderWeight, generateCylinderTypeFromCapacity, isValidCylinderCapacity, normalizeTypeName } from '@/lib/cylinder-utils';
import { getCylinderTypeOptions } from '@/lib/cylinder-types';

interface Cylinder {
  id: string;
  code: string;
  cylinderType: string;
  typeName?: string | null; // Original type name entered by user
  capacity: number;
  currentStatus: string;
  location: string;
  storeId?: string;
  vehicleId?: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  store?: {
    name: string;
  };
  vehicle?: {
    vehicleNumber: string;
    driverName: string;
  };
}

interface CylinderTypeStats {
  type: string;
  typeEnum?: string;
  full: number;
  empty: number;
  maintenance: number;
  withCustomer: number;
  retired: number;
  total: number;
}

export default function CylindersInventoryPage() {
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [cylinderTypeStats, setCylinderTypeStats] = useState<CylinderTypeStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState<Cylinder | null>(null);
  const [isAddingCylinder, setIsAddingCylinder] = useState(false);
  const [cylinderTypeAndCapacity, setCylinderTypeAndCapacity] = useState('');
  const [editTypeAndCapacity, setEditTypeAndCapacity] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    // Initial load - fetch stats and cylinders
    fetchCylinderTypeStats();
    fetchCylinders();
  }, []);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCylinderTypeStats();
  }, [searchTerm, statusFilter, typeFilter, locationFilter]);

  useEffect(() => {
    fetchCylinders();
  }, [pagination.page, searchTerm, statusFilter, typeFilter, locationFilter]);

  const fetchCylinders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter === 'ALL' ? 'ALL' : statusFilter, // Send 'ALL' explicitly
        type: typeFilter === 'ALL' ? 'ALL' : typeFilter, // Send 'ALL' explicitly
        location: locationFilter === 'ALL' ? '' : locationFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/inventory/cylinders?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCylinders(data.cylinders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch cylinders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCylinderTypeStats = async () => {
    try {
      const response = await fetch('/api/inventory/cylinders/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Cylinder type stats received:', data);
        // Deduplicate stats on frontend as well to prevent duplicates
        const statsMap = new Map<string, typeof data.stats[0]>();
        (data.stats || []).forEach((stat: typeof data.stats[0]) => {
          const key = `${stat.type}-${stat.typeEnum || 'unknown'}`;
          if (!statsMap.has(key)) {
            statsMap.set(key, stat);
          } else {
            // Merge counts if duplicate found
            const existing = statsMap.get(key)!;
            existing.full += stat.full;
            existing.empty += stat.empty;
            existing.withCustomer += stat.withCustomer;
            existing.retired += stat.retired;
            existing.maintenance += stat.maintenance;
            existing.total = existing.full + existing.empty + existing.retired + existing.maintenance;
          }
        });
        // Sort stats to maintain consistent card positions
        // Sort by: 1) capacity (ascending), 2) typeName (alphabetically)
        const sortedStats = Array.from(statsMap.values()).sort((a, b) => {
          // Extract typeName and capacity from display type for sorting
          const aMatch = a.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
          const bMatch = b.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
          
          if (aMatch && bMatch) {
            const aTypeName = aMatch[1].trim().toLowerCase();
            const bTypeName = bMatch[1].trim().toLowerCase();
            const aCapacity = parseFloat(aMatch[2]);
            const bCapacity = parseFloat(bMatch[2]);
            
            // First sort by capacity (ascending)
            if (aCapacity !== bCapacity) {
              return aCapacity - bCapacity;
            }
            
            // If capacity is the same, sort by typeName alphabetically
            return aTypeName.localeCompare(bTypeName);
          }
          
          // Fallback: sort by display type string
          return a.type.localeCompare(b.type);
        });
        
        setCylinderTypeStats(sortedStats);
      } else {
        console.error('Failed to fetch stats, status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error data:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch cylinder type stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'success';
      case 'EMPTY':
        return 'warning';
      case 'WITH_CUSTOMER':
        return 'info';
      case 'RETIRED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Get cylinder type options for dropdowns - use stats to get all actual types including custom ones
  // Create a unique key for each type combination to enable proper filtering
  const typeFilterOptions = cylinderTypeStats.length > 0 
    ? cylinderTypeStats.map((stat, index) => {
        // Use the display name (type) as the value so API can filter by typeName + capacity
        // The display name includes typeName and capacity, making it unique
        const uniqueKey = `type-${stat.type}-${index}`;
        return {
          value: stat.type, // Use display type (e.g., "Special (10kg)") for API filtering
          label: stat.type, // Use the display name from stats (e.g., "Special (10kg)", "Domestic (11.8kg)")
          typeEnum: stat.typeEnum, // Keep for reference
          key: uniqueKey // Unique key for React
        };
      })
    : getCylinderTypeOptions().map((opt, index) => ({
        value: opt.value, // For static options, use enum value
        label: opt.label,
        typeEnum: opt.value,
        key: `static-type-${opt.value}-${index}`
      }));
  
  const getTypeDisplayName = (type: string, capacity?: number, typeName?: string | null) => {
    // Priority 1: If typeName is provided (original name entered by user), use it with capacity
    // This takes absolute precedence - if user entered a custom name, use it
    // Check for typeName first, even if it's a single word like "Special"
    const trimmedTypeName = typeName ? String(typeName).trim() : '';
    if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
      return `${trimmedTypeName} (${capacity || 'N/A'}kg)`;
    }
    
    // Priority 2: Check if this is a standard enum type that should display with a friendly name
    // Only use enum-based names if typeName is missing or empty (for existing cylinders without typeName)
    // If typeName exists but is "Cylinder", we still check the enum type
    if (!trimmedTypeName || trimmedTypeName === '' || trimmedTypeName === 'Cylinder') {
      if (type === 'DOMESTIC_11_8KG') {
        return `Domestic (${capacity !== undefined && capacity !== null ? capacity : 11.8}kg)`;
      } else if (type === 'STANDARD_15KG') {
        // Only show "Standard" if capacity matches 15kg AND no typeName was provided
        // If capacity is different (e.g., 10kg), it's a custom type stored with STANDARD_15KG fallback
        // In this case, we should have already handled it in Priority 1 if typeName exists
        const numCapacity = capacity !== undefined && capacity !== null ? Number(capacity) : null;
        if (numCapacity !== null && Math.abs(numCapacity - 15.0) > 0.1) {
          // Custom capacity - use actual capacity (no typeName, so use generic "Cylinder")
          return `Cylinder (${numCapacity}kg)`;
        }
        return `Standard (${numCapacity !== null ? numCapacity : 15}kg)`;
      } else if (type === 'COMMERCIAL_45_4KG') {
        return `Commercial (${capacity !== undefined && capacity !== null ? capacity : 45.4}kg)`;
      } else if (type === 'CYLINDER_6KG') {
        return `Cylinder (${capacity !== undefined && capacity !== null ? capacity : 6}kg)`;
      } else if (type === 'CYLINDER_30KG') {
        return `Cylinder (${capacity !== undefined && capacity !== null ? capacity : 30}kg)`;
      }
    }
    
    // Priority 3: If capacity is provided, check if it matches the expected capacity for this enum type
    // This handles custom cylinders that are stored with fallback enum but have different capacity
    // This is especially important for cylinders stored with STANDARD_15KG fallback but different capacity
    if (capacity !== undefined && capacity !== null) {
      const typeCapacity = getCylinderWeight(type);
      
      // If the capacity doesn't match the type's expected capacity, it's a custom type
      // Use the actual capacity for display instead of the enum-based name
      if (typeCapacity !== null && Math.abs(typeCapacity - capacity) > 0.1) {
        // Custom capacity - display based on actual capacity
        // If we have a typeName, it should have been handled in Priority 1
        // If no typeName, use generic "Cylinder" with actual capacity
        return `Cylinder (${capacity}kg)`;
      }
    }
    
    // Priority 4: Use the standard display name from utility function
    const standardDisplayName = getCylinderTypeDisplayName(type);
    return standardDisplayName;
  };

  const getLocationDisplay = (cylinder: Cylinder) => {
    if (cylinder.store) {
      return `Store: ${cylinder.store.name}`;
    }
    if (cylinder.vehicle) {
      return `Vehicle: ${cylinder.vehicle.vehicleNumber}`;
    }
    return cylinder.location || 'Not assigned';
  };

  const handleEditCylinder = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    // Pre-populate the edit form with current typeName and capacity
    const capacity = cylinder.capacity || 0;
    
    // If typeName exists, use it directly
    if (cylinder.typeName && cylinder.typeName.trim()) {
      const initialValue = `${cylinder.typeName.trim()} ${capacity}kg`;
      setEditTypeAndCapacity(initialValue);
    } else {
      // If no typeName, extract from display name or use standard type name
      const displayName = getTypeDisplayName(cylinder.cylinderType, cylinder.capacity, cylinder.typeName);
      // Extract type name from display name (e.g., "Domestic (11.8kg)" -> "Domestic 11.8kg")
      // Remove parentheses and "kg" suffix, then reconstruct
      const nameMatch = displayName.match(/^([^(]+)\s*\(/);
      if (nameMatch) {
        const extractedName = nameMatch[1].trim();
        const initialValue = `${extractedName} ${capacity}kg`;
        setEditTypeAndCapacity(initialValue);
      } else {
        // Fallback: just use capacity
        setEditTypeAndCapacity(`${capacity}kg`);
      }
    }
    setShowEditForm(true);
  };

  const handleViewCylinder = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    setShowViewModal(true);
  };

  const handleDeleteCylinder = async (cylinder: Cylinder) => {
    // Only allow deletion of empty cylinders
    if (cylinder.currentStatus !== 'EMPTY') {
      alert('Only empty cylinders can be deleted. Please change the status to Empty first.');
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete cylinder ${cylinder.code}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/cylinders/${cylinder.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete cylinder');
      }

      // Refresh both cylinders list and statistics
      await Promise.all([
        fetchCylinders(),
        fetchCylinderTypeStats()
      ]);

      alert('Cylinder deleted successfully!');
    } catch (error) {
      console.error('Failed to delete cylinder:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete cylinder'}`);
    }
  };

  const handleAddCylinder = async (formData: any, qty: number = 1) => {
    if (isAddingCylinder) return; // Prevent multiple submissions
    
    setIsAddingCylinder(true);
    try {
      const cylindersToCreate = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Create multiple cylinders - all codes will be auto-generated by API
      for (let i = 0; i < qty; i++) {
        const cylinderData = { ...formData };
        // No code field - API will auto-generate unique codes for each cylinder
        cylindersToCreate.push(cylinderData);
      }
      
      // Create cylinders sequentially to ensure codes are generated in order
      const results = [];
      for (let i = 0; i < cylindersToCreate.length; i++) {
        const cylinderData = cylindersToCreate[i];
        try {
          console.log(`Submitting cylinder ${i + 1} of ${qty}:`, cylinderData);
          
          const response = await fetch('/api/inventory/cylinders', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cylinderData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to create cylinder');
          }

          const result = await response.json();
          results.push(result);
          successCount++;
          
          // Small delay to ensure sequential code generation
          if (i < cylindersToCreate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Failed to add cylinder ${i + 1}:`, error);
          errorCount++;
        }
      }
      
      // Refresh both cylinders list and statistics
      await Promise.all([
        fetchCylinders(),
        fetchCylinderTypeStats()
      ]);
      
      setShowAddForm(false);
      
      // Show appropriate success message
      if (qty === 1) {
        alert('Cylinder added successfully!');
      } else {
        if (errorCount === 0) {
          alert(`Successfully added ${successCount} cylinders!`);
        } else {
          alert(`Added ${successCount} cylinders successfully. ${errorCount} failed.`);
        }
      }
    } catch (error) {
      console.error('Failed to add cylinders:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add cylinders'}`);
    } finally {
      setIsAddingCylinder(false);
    }
  };

  const handleUpdateCylinder = async (formData: any) => {
    if (!selectedCylinder) return;
    
    try {
      // Parse the type and capacity input (same logic as add form)
      const inputValue = editTypeAndCapacity.trim();
      
      if (!inputValue) {
        alert('Please enter cylinder type and capacity (e.g., "Domestic 11.8", "Standard 15", "12kg").');
        return;
      }
      
      // Extract capacity from input
      const capacityMatch = inputValue.match(/(\d+\.?\d*)/);
      
      if (!capacityMatch) {
        alert('Please include a capacity value in your input (e.g., "Domestic 11.8", "Standard 15", "12kg").');
        return;
      }
      
      const capacityValue = parseFloat(capacityMatch[1]);
      
      // Validate capacity
      if (isNaN(capacityValue) || capacityValue <= 0) {
        alert('Please enter a valid capacity (greater than 0).');
        return;
      }
      
      if (!isValidCylinderCapacity(capacityValue)) {
        alert('Capacity must be between 0.1 and 100 kg. Please enter a valid capacity.');
        return;
      }
      
      // Extract type name from input
      // IMPORTANT: Normalize to consistent case to ensure "special" and "Special" are treated the same
      const typeNameMatch = inputValue.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)/);
      const extractedTypeName = typeNameMatch ? typeNameMatch[1].trim() : 'Cylinder';
      const typeName = normalizeTypeName(extractedTypeName) || 'Cylinder';
      
      // Generate enum type dynamically from capacity - fully flexible approach
      // No hardcoded type mappings - works for any capacity
      const finalCylinderType = generateCylinderTypeFromCapacity(capacityValue);
      
      const updateData = {
        typeName: typeName,
        cylinderType: finalCylinderType,
        capacity: capacityValue,
        currentStatus: formData.currentStatus,
        location: formData.location,
        purchaseDate: formData.purchaseDate || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        nextMaintenanceDate: formData.nextMaintenanceDate || null
      };
      
      const response = await fetch(`/api/inventory/cylinders/${selectedCylinder.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update cylinder');
      }

      // Refresh both cylinders list and statistics
      // Clear stats first to prevent showing stale data
      setCylinderTypeStats([]);
      await Promise.all([
        fetchCylinders(),
        fetchCylinderTypeStats()
      ]);
      
      setShowEditForm(false);
      setSelectedCylinder(null);
      setEditTypeAndCapacity('');
      alert('Cylinder updated successfully!');
    } catch (error) {
      console.error('Failed to update cylinder:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update cylinder'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/inventory'}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cylinders Inventory</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Total cylinders inventory by type and status
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Cylinder
          </Button>
        </div>
      </div>

      {/* Type Statistics */}
      {cylinderTypeStats.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cylinderTypeStats.map((stat, index) => {
            // Use a stable key based on type and capacity to maintain position
            // Extract capacity for a more stable key
            const capacityMatch = stat.type.match(/\((\d+\.?\d*)kg\)/);
            const capacity = capacityMatch ? capacityMatch[1] : '0';
            const typeNameMatch = stat.type.match(/^([^(]+)/);
            const typeName = typeNameMatch ? typeNameMatch[1].trim().toLowerCase() : 'unknown';
            const stableKey = `${typeName}-${capacity}-${stat.typeEnum || 'unknown'}`;
            
            return (
          <Card key={stableKey} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-gray-600 truncate pr-1">
                {stat.type}
              </CardTitle>
              <CubeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg font-bold text-gray-900 mb-2">{stat.total}</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Full</span>
                  </div>
                  <span className="font-semibold text-gray-700">{stat.full}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-600 font-medium">Empty</span>
                  </div>
                  <span className="font-semibold text-gray-700">{stat.empty}</span>
                </div>
                {stat.retired > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600 font-medium">Retired</span>
                    </div>
                    <span className="font-semibold text-gray-700">{stat.retired}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No cylinder statistics available. Add cylinders to see statistics.</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search cylinders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="FULL">Full</option>
              <option value="EMPTY">Empty</option>
            </select>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              {typeFilterOptions.map((option) => (
                <option key={option.key || option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select 
              value={locationFilter} 
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Locations</option>
              <option value="STORE">In Store</option>
              <option value="VEHICLE">In Vehicle</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cylinders Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cylinders Inventory ({pagination.total} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cylinder Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="animate-pulse">Loading cylinders...</div>
                    </td>
                  </tr>
                ) : cylinders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No cylinders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  cylinders.map((cylinder) => (
                    <tr key={cylinder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{cylinder.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="font-semibold">
                          {getTypeDisplayName(cylinder.cylinderType, cylinder.capacity, cylinder.typeName)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(cylinder.currentStatus) as any} className="font-semibold">
                          {cylinder.currentStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {getLocationDisplay(cylinder)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.purchaseDate ? new Date(cylinder.purchaseDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.lastMaintenanceDate ? new Date(cylinder.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCylinder(cylinder)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewCylinder(cylinder)}
                          >
                            View
                          </Button>
                          {cylinder.currentStatus === 'EMPTY' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteCylinder(cylinder)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} cylinders
              </span>
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">Show:</label>
                <select
                  id="pageSize"
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                  className="px-2 py-1 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Cylinder Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Cylinder</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                console.log('Form submitted!');
                
                try {
                  const form = e.currentTarget;
                  console.log('Form element:', form);
                  
                  // Get form values
                  const currentStatus = form.currentStatus?.value;
                  const location = form.location?.value;
                  const purchaseDate = form.purchaseDate?.value;
                  const purchasePrice = form.purchasePrice?.value;
                  
                  console.log('Raw form values:', {
                    cylinderTypeAndCapacity,
                    quantity,
                    currentStatus,
                    location,
                    purchaseDate,
                    purchasePrice
                  });
                  
                  // Validate required fields
                  if (!currentStatus) {
                    alert('Please select a status');
                    return;
                  }
                  
                  if (!location) {
                    alert('Please enter a location');
                    return;
                  }
                  
                  // Handle combined type and capacity input
                  const inputValue = cylinderTypeAndCapacity.trim();
                  
                  // Validate input
                  if (!inputValue) {
                    alert('Please enter cylinder type and capacity (e.g., "Domestic 11.8", "Standard 15", "12kg", or "Custom 12.5").');
                    return;
                  }
                  
                  // Extract capacity from input (look for numbers, including decimals)
                  // Examples: "Domestic 11.8" -> 11.8, "Standard 15" -> 15, "12kg" -> 12, "Custom 12.5kg" -> 12.5
                  const capacityMatch = inputValue.match(/(\d+\.?\d*)/);
                  
                  if (!capacityMatch) {
                    alert('Please include a capacity value in your input (e.g., "Domestic 11.8", "Standard 15", "12kg").');
                    return;
                  }
                  
                  const capacityValue = parseFloat(capacityMatch[1]);
                  
                  // Validate capacity
                  if (isNaN(capacityValue) || capacityValue <= 0) {
                    alert('Please enter a valid capacity (greater than 0).');
                    return;
                  }
                  
                  if (!isValidCylinderCapacity(capacityValue)) {
                    alert('Capacity must be between 0.1 and 100 kg. Please enter a valid capacity.');
                    return;
                  }
                  
                  // Extract type name from input (remove numbers and "kg")
                  // Examples: "Domestic 11.8" -> "Domestic", "Standard 15" -> "Standard", "Custom 12kg" -> "Custom"
                  // IMPORTANT: Normalize to consistent case to ensure "special" and "Special" are treated the same
                  const typeNameMatch = inputValue.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)/);
                  const extractedTypeName = typeNameMatch ? typeNameMatch[1].trim() : 'Cylinder';
                  const typeName = normalizeTypeName(extractedTypeName) || 'Cylinder';
                  
                  // Generate enum type dynamically from capacity - fully flexible approach
                  // No hardcoded type mappings - works for any capacity
                  const finalCylinderType = generateCylinderTypeFromCapacity(capacityValue);
                  
                  const capacity = capacityValue;
                  
                  // Validate quantity
                  const qty = quantity || 1;
                  if (qty < 1 || qty > 1000) {
                    alert('Quantity must be between 1 and 1000.');
                    return;
                  }
                  
                  // Codes will be auto-generated by the API based on type name
                  const formData = {
                    // No code field - API will auto-generate unique codes based on typeName
                    typeName: typeName, // Pass type name for code generation
                    cylinderType: finalCylinderType,
                    capacity,
                    currentStatus,
                    location,
                    purchaseDate: purchaseDate || null,
                    purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null
                  };
                  
                  console.log('Form data to submit:', formData, 'Quantity:', qty);
                  handleAddCylinder(formData, qty);
                } catch (error) {
                  console.error('Form submission error:', error);
                  alert('Error processing form. Please check the console for details.');
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cylinder Type & Capacity <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    name="cylinderTypeAndCapacity" 
                    type="text" 
                    placeholder="e.g., Domestic 11.8, Standard 15, Commercial 45.4, Custom 12, or 12kg"
                    value={cylinderTypeAndCapacity}
                    onChange={(e) => setCylinderTypeAndCapacity(e.target.value)}
                    required
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter cylinder type name and capacity together (e.g., "Domestic 11.8", "Standard 15", "12kg", "Custom 12.5kg")
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity <span className="text-red-500">*</span></label>
                  <Input 
                    name="quantity" 
                    type="number" 
                    placeholder="1"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setQuantity(Math.max(1, Math.min(1000, value)));
                    }}
                    required
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of cylinders to add (1-1000). All will have the same type, capacity, status, and location.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    name="currentStatus"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <Input name="location" type="text" placeholder="Warehouse A" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                  <Input name="purchaseDate" type="date" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
                  <Input name="purchasePrice" type="number" placeholder="0.00" step="0.01" />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setCylinderTypeAndCapacity('');
                      setQuantity(1);
                    }}
                    disabled={isAddingCylinder}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isAddingCylinder}
                    className="min-w-[120px]"
                    onClick={(e) => {
                      console.log('Add Cylinder button clicked');
                      // Let the form handle the submission, but also trigger it manually as backup
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        console.log('Found form element, triggering submit');
                        // Don't prevent default, let the form handle it
                      }
                    }}
                  >
                    {isAddingCylinder ? 'Adding...' : 'Add Cylinder'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cylinder Modal */}
      {showEditForm && selectedCylinder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Cylinder</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateCylinder({
                  currentStatus: formData.get('currentStatus'),
                  location: formData.get('location'),
                  purchaseDate: formData.get('purchaseDate'),
                  purchasePrice: formData.get('purchasePrice'),
                  lastMaintenanceDate: formData.get('lastMaintenanceDate'),
                  nextMaintenanceDate: formData.get('nextMaintenanceDate')
                });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cylinder Type & Capacity
                    <span className="text-xs text-gray-500 ml-2">(e.g., "Domestic 11.8", "Standard 15", "Special 10kg")</span>
                  </label>
                  <Input
                    name="cylinderTypeAndCapacity"
                    type="text"
                    placeholder="e.g., Domestic 11.8kg, Standard 15, Special 10kg"
                    value={editTypeAndCapacity}
                    onChange={(e) => setEditTypeAndCapacity(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    name="currentStatus"
                    defaultValue={selectedCylinder.currentStatus}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <Input name="location" type="text" defaultValue={selectedCylinder.location} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                  <Input 
                    name="purchaseDate" 
                    type="date" 
                    defaultValue={selectedCylinder.purchaseDate ? new Date(selectedCylinder.purchaseDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
                  <Input 
                    name="purchasePrice" 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01"
                    defaultValue={selectedCylinder.purchasePrice || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Maintenance Date</label>
                  <Input 
                    name="lastMaintenanceDate" 
                    type="date"
                    defaultValue={selectedCylinder.lastMaintenanceDate ? new Date(selectedCylinder.lastMaintenanceDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Next Maintenance Date</label>
                  <Input 
                    name="nextMaintenanceDate" 
                    type="date"
                    defaultValue={selectedCylinder.nextMaintenanceDate ? new Date(selectedCylinder.nextMaintenanceDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedCylinder(null);
                      setEditTypeAndCapacity('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Cylinder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Cylinder Modal */}
      {showViewModal && selectedCylinder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cylinder Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Cylinder Code</label>
                  <p className="text-sm text-gray-900 font-medium">{selectedCylinder.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Type</label>
                  <Badge variant="secondary" className="font-semibold">
                    {getTypeDisplayName(selectedCylinder.cylinderType, selectedCylinder.capacity, selectedCylinder.typeName)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Capacity</label>
                  <p className="text-sm text-gray-900">{selectedCylinder.capacity} KG</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{getLocationDisplay(selectedCylinder)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <Badge variant={getStatusColor(selectedCylinder.currentStatus) as any} className="font-semibold">
                    {selectedCylinder.currentStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Purchase Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.purchaseDate ? new Date(selectedCylinder.purchaseDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Purchase Price</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedCylinder.purchasePrice ? `PKR ${selectedCylinder.purchasePrice.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Last Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.lastMaintenanceDate ? new Date(selectedCylinder.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Next Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.nextMaintenanceDate ? new Date(selectedCylinder.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCylinder(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditForm(true);
                  }}
                >
                  Edit Cylinder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
