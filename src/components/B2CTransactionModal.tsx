'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, CalculatorIcon, XMarkIcon, TrashIcon, CubeIcon, ArrowPathIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useInventoryValidation } from '@/hooks/useInventoryValidation';
import { ProfessionalAccessorySelector, AccessoryItem } from '@/components/ui/ProfessionalAccessorySelector';
import { getCylinderWeight, getCapacityFromTypeString, getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import { buildCylinderVariantKey, parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { CustomSelect } from '@/components/ui/select-custom';
import { todayLocalDate } from '@/lib/financial-period';

interface B2CTransactionModalProps {
    customerId: string;
    customerName: string;
    customer: any; // Using any for customer object flexibility as exact type might vary slightly
    onClose: () => void;
    onSuccess: () => void;
}

interface GasItem {
    cylinderType: string;
    cylinderVariantKey: string;
    quantity: number | '';
    pricePerItem: number | '';
    costPrice: number;
}

interface SecurityItem {
    cylinderType: string;
    cylinderVariantKey: string;
    quantity: number | '';
    pricePerItem: number | '';
    isReturn: boolean;
}

function b2cModalHoldingKey(h: { cylinderType: string; cylinderVariantKey?: string | null }) {
    if (h.cylinderVariantKey?.trim()) return h.cylinderVariantKey.trim();
    return buildCylinderVariantKey({
        cylinderType: h.cylinderType,
        typeName: null,
        capacity: getCapacityFromTypeString(h.cylinderType),
    });
}

export function B2CTransactionModal({ customerId, customerName, customer, onClose, onSuccess }: B2CTransactionModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form data
    const [date, setDate] = useState(todayLocalDate);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [deliveryCharges, setDeliveryCharges] = useState<number | ''>('');
    const [deliveryCost, setDeliveryCost] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');

    // Transaction items
    const [gasItems, setGasItems] = useState<GasItem[]>([]);
    // Initialize with one empty security item instead of empty array
    const [securityItems, setSecurityItems] = useState<SecurityItem[]>([]);
    // Accessories transaction form data
    const [accessoryItems, setAccessoryItems] = useState<AccessoryItem[]>([]);

    // Pricing information
    const [pricingInfo, setPricingInfo] = useState<any>(null);

    // State for Collapsible Sections
    const [gasExpanded, setGasExpanded] = useState(false);
    const [securityExpanded, setSecurityExpanded] = useState(false);
    const [accessoriesExpanded, setAccessoriesExpanded] = useState(false);

    // Dynamic cylinder types from inventory
    const [inventoryCylinderTypes, setInventoryCylinderTypes] = useState<any[]>([]);

    // Inventory validation
    const { validateInventory, isFieldValid, hasAnyErrors, clearAllValidationErrors } = useInventoryValidation();

    // Security return validation state
    const [hasSecurityReturnErrors, setHasSecurityReturnErrors] = useState(false);
    const [firstInvalidSecurityIndex, setFirstInvalidSecurityIndex] = useState<number | null>(null);

    // Inventory validation state
    const [hasInventoryErrors, setHasInventoryErrors] = useState(false);
    const [firstInvalidInventoryItem, setFirstInvalidInventoryItem] = useState<{ category: string, index: number } | null>(null);

    // Accessory validation state
    const [hasAccessoryErrors, setHasAccessoryErrors] = useState(false);

    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                await Promise.all([
                    fetchCalculatedPrices(),
                    fetchCylinderTypes()
                ]);
                // Initialize all sections with one empty item
                addGasItem();
                addSecurityItem();
                setAccessoryItems([{
                    id: `item-${Date.now()}`,
                    category: '',
                    itemType: '',
                    quantity: 0,
                    costPerPiece: 0,
                    pricePerItem: 0,
                    totalPrice: 0,
                    availableStock: 0,
                    isVaporizer: false,
                    usagePrice: 0,
                    sellingPrice: 0,
                    markup: 20
                }]);
            } catch (err) {
                console.error("Error initializing modal data", err);
            } finally {
                setLoading(false);
            }
        };
        if (customerId) {
            initData();
        }
    }, [customerId]);


    // Check for security return errors when securityItems change
    useEffect(() => {
        checkSecurityReturnErrors();
    }, [securityItems, customer?.cylinderHoldings]);

    // Handle inventory validation changes from ProfessionalAccessorySelector
    const handleInventoryValidationChange = (hasErrors: boolean, firstInvalidItem?: { category: string, index: number }) => {
        setHasInventoryErrors(hasErrors);
        setFirstInvalidInventoryItem(firstInvalidItem || null);
    };

    const fetchCylinderTypes = async () => {
        try {
            const response = await fetch('/api/inventory/cylinder-types');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.types) {
                    setInventoryCylinderTypes(data.types);
                }
            }
        } catch (error) {
            console.error('Error fetching cylinder types:', error);
        }
    };

    const fetchCalculatedPrices = async () => {
        try {
            const response = await fetch(`/api/pricing/calculate?customerId=${customerId}&customerType=B2C`);

            if (response.ok) {
                const pricingData = await response.json();
                setPricingInfo(pricingData);
            }
        } catch (error) {
            console.error('Error fetching calculated prices:', error);
        }
    };

    const addGasItem = () => {
        setGasItems([...gasItems, { cylinderType: '', cylinderVariantKey: '', quantity: '', pricePerItem: '', costPrice: 0 }]);
    };

    const removeGasItem = (index: number) => {
        setGasItems(gasItems.filter((_, i) => i !== index));
    };

    const updateGasItem = (index: number, field: keyof GasItem, value: any) => {
        if (error) setError(null); // Clear error when user makes changes
        const updated = [...gasItems];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-apply calculated price when a variant row is selected
        if (field === 'cylinderVariantKey' && pricingInfo) {
            const inventoryType = inventoryCylinderTypes.find(t => t.variantKey === value);
            const cylinderType = inventoryType?.cylinderType ?? '';
            updated[index].cylinderType = cylinderType;
            let calculatedPrice = 0;
            const plantPrice118 = Number(pricingInfo?.plantPrice?.price118kg) || 0;
            const costPerKg = plantPrice118 > 0 ? (plantPrice118 / 11.8) : 0;

            let cylinderWeightForCost =
                cylinderType ? getCylinderWeight(cylinderType) || 0 : 0;
            if (inventoryType) {
                cylinderWeightForCost = inventoryType.capacity;
            }

            if (pricingInfo.calculation && pricingInfo.calculation.endPricePerKg && cylinderWeightForCost > 0) {
                calculatedPrice = pricingInfo.calculation.endPricePerKg * cylinderWeightForCost;
            } else if (cylinderType) {
                switch (cylinderType) {
                    case 'DOMESTIC_11_8KG':
                        calculatedPrice = pricingInfo.finalPrices.domestic118kg;
                        break;
                    case 'STANDARD_15KG':
                        calculatedPrice = pricingInfo.finalPrices.standard15kg;
                        break;
                    case 'COMMERCIAL_45_4KG':
                        calculatedPrice = pricingInfo.finalPrices.commercial454kg;
                        break;
                    case 'CYLINDER_6KG':
                    case 'CYLINDER_30KG':
                        if (pricingInfo.finalPrices.standard15kg && cylinderWeightForCost > 0) {
                            calculatedPrice = (pricingInfo.finalPrices.standard15kg / 15.0) * cylinderWeightForCost;
                        }
                        break;
                }
            }

            if (calculatedPrice > 0) {
                updated[index].pricePerItem = Math.round(calculatedPrice);
            }

            if (costPerKg > 0 && cylinderWeightForCost > 0) {
                const autoCost = costPerKg * cylinderWeightForCost;
                updated[index].costPrice = Math.round(autoCost);
            }
        }

        setGasItems(updated);

        const runCylinderValidation = (rows: GasItem[]) => {
            const cylinders = rows
                .filter(item => item.cylinderType && Number(item.quantity) > 0)
                .map(item => ({
                    cylinderType: item.cylinderType,
                    cylinderVariantKey: item.cylinderVariantKey || undefined,
                    requested: Number(item.quantity)
                }));
            validateInventory(cylinders, []);
        };

        if (field === 'quantity') {
            runCylinderValidation(updated);
            setTimeout(() => runCylinderValidation(updated), 100);
        }
        if (field === 'cylinderVariantKey') {
            runCylinderValidation(updated);
        }
    };

    const applyCalculatedPrices = () => {
        if (!pricingInfo) return;

        const plantPrice118 = Number(pricingInfo?.plantPrice?.price118kg) || 0;
        const costPerKg = plantPrice118 > 0 ? (plantPrice118 / 11.8) : 0;

        const updatedItems = gasItems.map(item => {
            let calculatedPrice = 0;
            const inventoryType = item.cylinderVariantKey
                ? inventoryCylinderTypes.find(t => t.variantKey === item.cylinderVariantKey)
                : inventoryCylinderTypes.find(t => t.cylinderType === item.cylinderType);
            let cylinderWeightForCost =
                item.cylinderType ? getCylinderWeight(item.cylinderType) || 0 : 0;
            if (inventoryType) {
                cylinderWeightForCost = inventoryType.capacity;
            }

            // Calculate price based on weight (Universal calculation)
            if (pricingInfo.calculation && pricingInfo.calculation.endPricePerKg && cylinderWeightForCost > 0) {
                calculatedPrice = pricingInfo.calculation.endPricePerKg * cylinderWeightForCost;
            } else {
                // Fallback
                switch (item.cylinderType) {
                    case 'DOMESTIC_11_8KG':
                        calculatedPrice = pricingInfo.finalPrices.domestic118kg;
                        break;
                    case 'STANDARD_15KG':
                        calculatedPrice = pricingInfo.finalPrices.standard15kg;
                        break;
                    case 'COMMERCIAL_45_4KG':
                        calculatedPrice = pricingInfo.finalPrices.commercial454kg;
                        break;
                    case 'CYLINDER_6KG':
                    case 'CYLINDER_30KG':
                        // For new types, calculate price based on weight ratio
                        // Fallback: use cost-based calculation if pricing not available
                        if (pricingInfo.finalPrices.standard15kg && cylinderWeightForCost > 0) {
                            calculatedPrice = (pricingInfo.finalPrices.standard15kg / 15.0) * cylinderWeightForCost;
                        }
                        break;
                }
            }

            return {
                ...item,
                pricePerItem: calculatedPrice > 0 ? Math.round(calculatedPrice) : item.pricePerItem,
                // Also apply Option 1 cost auto-calculation if possible
                costPrice: (costPerKg > 0 && cylinderWeightForCost > 0)
                    ? Math.round(costPerKg * cylinderWeightForCost)
                    : item.costPrice
            };
        });

        setGasItems(updatedItems);
    };

    const addSecurityItem = () => {
        setSecurityItems([...securityItems, { cylinderType: '', cylinderVariantKey: '', quantity: '', pricePerItem: '', isReturn: false }]);
    };

    const removeSecurityItem = (index: number) => {
        setSecurityItems(securityItems.filter((_, i) => i !== index));
    };

    // Get actual security amount from customer's holdings (variant-aligned)
    const getActualSecurityAmount = (variantKey: string): number => {
        if (customer?.cylinderHoldings) {
            const activeHoldings = customer.cylinderHoldings
                .filter((holding: any) => b2cModalHoldingKey(holding) === variantKey && !holding.isReturned)
                .sort((a: any, b: any) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

            if (activeHoldings.length > 0) {
                return Number(activeHoldings[0].securityAmount);
            }
        }

        const inventoryType = inventoryCylinderTypes.find(t => t.variantKey === variantKey);
        if (inventoryType && inventoryType.securityPrice) {
            return inventoryType.securityPrice;
        }

        return 0;
    };

    const getAvailableHoldings = (variantKey: string): number => {
        if (!customer?.cylinderHoldings) return 0;

        return customer.cylinderHoldings
            .filter((holding: any) => b2cModalHoldingKey(holding) === variantKey && !holding.isReturned)
            .reduce((sum: number, holding: any) => sum + holding.quantity, 0);
    };

    const formatVariantLabel = (variantKey: string): string => {
        const inv = inventoryCylinderTypes.find(t => t.variantKey === variantKey);
        if (inv?.label) return inv.label;
        const parsed = parseCylinderVariantKey(variantKey);
        if (parsed?.normalizedTypeNameLower && parsed.normalizedTypeNameLower !== 'null') {
            const tn = parsed.normalizedTypeNameLower.replace(/\b\w/g, (c) => c.toUpperCase());
            const cap = parsed.capacity ?? getCapacityFromTypeString(parsed.cylinderType);
            return `${tn} (${cap}kg)`;
        }
        if (parsed?.cylinderType) {
            const cap = parsed.capacity ?? getCapacityFromTypeString(parsed.cylinderType);
            return `${getCylinderTypeDisplayName(parsed.cylinderType)} (${cap}kg)`;
        }
        return variantKey;
    };

    const getReturnableHoldingOptions = (): { value: string; label: string }[] => {
        if (!customer?.cylinderHoldings) return [];
        const map = new Map<string, number>();
        for (const h of customer.cylinderHoldings) {
            if (h?.isReturned) continue;
            const k = b2cModalHoldingKey(h);
            map.set(k, (map.get(k) || 0) + (Number(h?.quantity) || 0));
        }
        return Array.from(map.entries())
            .filter(([, qty]) => qty > 0)
            .map(([vk, qty]) => ({
                value: vk,
                label: `${formatVariantLabel(vk)}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    // Check if security return quantities exceed available holdings
    const checkSecurityReturnErrors = () => {
        if (!customer?.cylinderHoldings) {
            setHasSecurityReturnErrors(false);
            setFirstInvalidSecurityIndex(null);
            return;
        }

        let firstInvalidIndex: number | null = null;
        const hasErrors = securityItems.some((item, index) => {
            if (item.isReturn && item.cylinderVariantKey) {
                const available = getAvailableHoldings(item.cylinderVariantKey);
                if (Number(item.quantity) > available) {
                    if (firstInvalidIndex === null) {
                        firstInvalidIndex = index;
                    }
                    return true;
                }
            }
            return false;
        });

        setHasSecurityReturnErrors(hasErrors);
        setFirstInvalidSecurityIndex(firstInvalidIndex);
    };

    const updateSecurityItem = (index: number, field: keyof SecurityItem, value: any) => {
        if (error) setError(null); // Clear error when user makes changes
        const updated = [...securityItems];
        updated[index] = { ...updated[index], [field]: value };

        if (field === 'cylinderVariantKey') {
            const inv = inventoryCylinderTypes.find(t => t.variantKey === value);
            updated[index].cylinderType = inv?.cylinderType ?? '';
            const actualSecurityAmount = getActualSecurityAmount(value);
            updated[index].pricePerItem = updated[index].isReturn
                ? actualSecurityAmount * 0.75
                : actualSecurityAmount;
        }

        if (field === 'isReturn') {
            const vk = updated[index].cylinderVariantKey;
            const actualSecurityAmount = vk ? getActualSecurityAmount(vk) : 0;
            updated[index].pricePerItem = value
                ? actualSecurityAmount * 0.75
                : actualSecurityAmount;

            // If switching to Return, restrict types to customer's active holdings.
            // If the currently selected type isn't held, clear it.
            if (value === true) {
                const stillHeld = vk ? getAvailableHoldings(vk) > 0 : false;
                if (!stillHeld) {
                    updated[index].cylinderVariantKey = '';
                    updated[index].cylinderType = '';
                    updated[index].quantity = '';
                    updated[index].pricePerItem = '';
                }
            }
        }

        setSecurityItems(updated);

        // Check for security return validation errors after update
        setTimeout(() => {
            checkSecurityReturnErrors();
        }, 0);
    };

    const calculateTotal = (items: any[], priceField: string, quantityField: string) => {
        return items.reduce((sum, item) => {
            return sum + (Number(item[priceField]) * Number(item[quantityField]));
        }, 0);
    };

    // Calculate revenue totals
    const gasTotal = calculateTotal(gasItems, 'pricePerItem', 'quantity');
    const securityTotal = calculateTotal(securityItems, 'pricePerItem', 'quantity');
    // Accessories: use totalPrice which is already calculated (includes vaporizer logic)
    const accessoryTotal = accessoryItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const subtotal = gasTotal + securityTotal + accessoryTotal;
    const finalTotal = subtotal + Number(deliveryCharges || 0);

    // Validate security returns against customer holdings
    const validateSecurityReturns = () => {
        if (!customer?.cylinderHoldings) return true; // Skip validation if no holdings data

        for (const securityItem of securityItems) {
            if (securityItem.isReturn && securityItem.cylinderVariantKey) {
                const activeHoldings = customer.cylinderHoldings.filter(
                    (holding: any) => b2cModalHoldingKey(holding) === securityItem.cylinderVariantKey && !holding.isReturned
                );

                if (activeHoldings.length === 0) {
                    setError(`Cannot return — customer has no active security holdings for this cylinder`);
                    return false;
                }

                const totalAvailable = activeHoldings.reduce((sum: number, holding: any) => sum + holding.quantity, 0);
                if (securityItem.quantity > totalAvailable) {
                    setError(`Cannot return ${securityItem.quantity} — customer only has ${totalAvailable} active holdings for this cylinder`);
                    return false;
                }
            }
        }

        return true;
    };

    // Scroll to and focus on the first invalid security item
    const scrollToInvalidSecurityItem = () => {
        if (firstInvalidSecurityIndex !== null) {
            const elementId = `security-item-${firstInvalidSecurityIndex}`;
            const element = document.getElementById(elementId);

            if (element) {
                // Smooth scroll to the element
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                // Add a temporary highlight effect
                element.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');

                // Focus on the quantity input within that security item
                const quantityInput = element.querySelector('input[type="number"]') as HTMLInputElement;
                if (quantityInput) {
                    setTimeout(() => {
                        quantityInput.focus();
                        quantityInput.select(); // Select the text for easy editing
                    }, 500); // Wait for scroll to complete
                }

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
                }, 3000);
            }
        }
    };

    // Scroll to and focus on the first invalid inventory item
    const scrollToInvalidInventoryItem = () => {
        if (firstInvalidInventoryItem) {
            const { category, index } = firstInvalidInventoryItem;
            const elementId = `inventory-item-${category}-${index}`;
            const element = document.getElementById(elementId);

            if (element) {
                // Smooth scroll to the element
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                // Add a temporary highlight effect
                element.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');

                // Focus on the quantity input within that inventory item
                const quantityInput = element.querySelector('input[type="number"]') as HTMLInputElement;
                if (quantityInput) {
                    setTimeout(() => {
                        quantityInput.focus();
                        quantityInput.select(); // Select the text for easy editing
                    }, 500); // Wait for scroll to complete
                }

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
                }, 3000);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validGasItems = gasItems.filter(item => item.cylinderType && item.cylinderVariantKey && Number(item.quantity) > 0);
        const validSecurityItems = securityItems.filter(item => item.cylinderType && item.cylinderVariantKey && Number(item.quantity) > 0);
        const validAccessoryItems = accessoryItems.filter(item => item.quantity > 0);

        if (validGasItems.length === 0 && validSecurityItems.length === 0 && validAccessoryItems.length === 0) {
            setError('Please add at least one item before creating a transaction');
            return;
        }

        // Check for security return errors and scroll to first invalid item
        if (hasSecurityReturnErrors) {
            scrollToInvalidSecurityItem();
            return;
        }

        // Check for inventory errors and scroll to first invalid item
        if (hasInventoryErrors) {
            scrollToInvalidInventoryItem();
            return;
        }

        // Check for accessory errors
        if (hasAccessoryErrors) {
            // Error is already displayed by the component
            return;
        }

        // Validate security returns (additional backend validation)
        if (!validateSecurityReturns()) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const transactionData = {
                customerId,
                date: new Date(date),
                time: new Date(`2000-01-01T${time}`),
                deliveryCharges: Number(deliveryCharges),
                deliveryCost: Number(deliveryCost),
                paymentMethod,
                notes: notes || null,
                gasItems: gasItems.filter(item => item.cylinderType && item.cylinderVariantKey && Number(item.quantity) > 0).map(({ cylinderType, cylinderVariantKey, quantity, pricePerItem, costPrice }) => ({
                    cylinderType,
                    cylinderVariantKey,
                    quantity: Number(quantity),
                    pricePerItem: Number(pricePerItem),
                    costPrice,
                })),
                securityItems: securityItems.filter(item => item.cylinderType && item.cylinderVariantKey && Number(item.quantity) > 0).map(({ cylinderType, cylinderVariantKey, quantity, pricePerItem, isReturn }) => ({
                    cylinderType,
                    cylinderVariantKey,
                    quantity: Number(quantity),
                    pricePerItem: Number(pricePerItem),
                    isReturn,
                })),
                accessoryItems: accessoryItems.filter(item => item.quantity > 0).map(item => ({
                    itemName: `${item.category} - ${item.itemType}`,
                    itemType: item.itemType,
                    quality: '', // Not used in new structure but kept for compatibility
                    quantity: item.quantity,
                    pricePerItem: item.pricePerItem,
                    totalPrice: item.totalPrice,
                    costPrice: item.costPerPiece,
                    // Vaporizer-specific fields
                    isVaporizer: item.isVaporizer,
                    usagePrice: item.usagePrice,
                    sellingPrice: item.sellingPrice
                }))
            };

            const response = await fetch('/api/customers/b2c/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create transaction');
            }

            // Success
            onSuccess();
            onClose();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="relative top-6 mx-auto p-0 border-0 w-11/12 max-w-3xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">New Transaction</h3>
                        <p className="text-sm text-gray-500">Customer: <span className="font-semibold text-gray-700">{customerName}</span></p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-sm flex justify-between items-center">
                        <div className="flex items-center">
                            <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-500">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}

                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Top Controls: Date, Time, Payment, Delivery */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Time</label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label>
                                <CustomSelect
                                    value={paymentMethod}
                                    onChange={(val) => setPaymentMethod(val)}
                                    options={[
                                        { value: 'CASH', label: 'Cash' },
                                        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                                        { value: 'CARD', label: 'Card' }
                                    ]}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Charges</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={deliveryCharges}
                                        onChange={(e) => setDeliveryCharges(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="h-9 text-sm"
                                        placeholder="Charge"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={deliveryCost}
                                        onChange={(e) => setDeliveryCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="h-9 text-sm bg-gray-50"
                                        placeholder="Cost"
                                        title="Actual Delivery Cost (Internal)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gas Items Accordion */}
                        <div className={`border rounded-xl overflow-hidden transition-all ${gasExpanded ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                            <button
                                type="button"
                                onClick={() => setGasExpanded(!gasExpanded)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${gasExpanded ? 'bg-green-100/50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${gasExpanded ? 'bg-green-600' : 'bg-gray-300'}`}>
                                        <CubeIcon className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-medium text-sm text-gray-900">Gas Cylinders</span>
                                        {gasItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) > 0 && (
                                            <Badge className="ml-2 bg-green-50 text-green-700 border-green-200 text-[10px] px-2 py-0.5 font-normal rounded-full hover:bg-green-100">
                                                {gasItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} cylinders
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${gasExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {gasExpanded && (
                                <div className="p-4 border-t border-green-200">

                                    <Table className="min-w-[600px]">
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                                <TableHead className="py-2 h-8 w-[40%]">Type</TableHead>
                                                <TableHead className="py-2 h-8 w-[15%]">Quantity</TableHead>
                                                <TableHead className="py-2 h-8 w-[20%]">Price</TableHead>
                                                <TableHead className="py-2 h-8 w-[20%]">Total</TableHead>
                                                <TableHead className="py-2 h-8 w-[5%]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {gasItems.map((item, index) => {
                                                return (
                                                    <TableRow key={index} className="hover:bg-transparent">
                                                        <TableCell className="py-2 align-top">
                                                            <div className="relative">
                                                                <CustomSelect
                                                                    value={item.cylinderVariantKey}
                                                                    onChange={(val) => updateGasItem(index, 'cylinderVariantKey', val)}
                                                                    placeholder="Select Type"
                                                                    options={inventoryCylinderTypes.map((type) => {
                                                                        const label = type.label;
                                                                        const displayLabel = label.includes(type.capacity.toString()) || label.includes('kg')
                                                                            ? label
                                                                            : `${label} (${type.capacity}kg)`;

                                                                        return {
                                                                            value: type.variantKey,
                                                                            label: displayLabel
                                                                        };
                                                                    })}
                                                                    className="h-9 text-sm"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.quantity || ''}
                                                                onChange={(e) => updateGasItem(index, 'quantity', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                                className="h-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.pricePerItem}
                                                                onChange={(e) => updateGasItem(index, 'pricePerItem', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                                                                className="h-9 text-sm"
                                                                placeholder="0"
                                                            />
                                                            {item.costPrice > 0 && (
                                                                <div className="text-[10px] text-gray-400 mt-0.5">Cost: {item.costPrice}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top font-medium text-gray-700">
                                                            Rs {(Number(item.quantity) * Number(item.pricePerItem)) || 0}
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeGasItem(index)}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                            >
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {gasItems.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-4 text-gray-400 text-sm">
                                                        No gas items added
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-3">
                                        <Button
                                            type="button"
                                            onClick={addGasItem}
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                        >
                                            <PlusIcon className="w-3 h-3 mr-1" />
                                            Add Gas
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Security Accordion */}
                        <div className={`border rounded-xl overflow-hidden transition-all ${securityExpanded ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                            <button
                                type="button"
                                onClick={() => setSecurityExpanded(!securityExpanded)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${securityExpanded ? 'bg-orange-100/50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${securityExpanded ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                        <ArrowPathIcon className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-medium text-sm text-gray-900">Security Deposits / Returns</span>
                                        {securityItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) > 0 && (
                                            <Badge className="ml-2 bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-2 py-0.5 font-normal rounded-full hover:bg-orange-100">
                                                {securityItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} cylinders
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${securityExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {securityExpanded && (
                                <div className="p-4 border-t border-orange-200">
                                    <Table className="min-w-[650px]">
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                                <TableHead className="py-2 h-8 w-[20%]">Action</TableHead>
                                                <TableHead className="py-2 h-8 w-[30%]">Type</TableHead>
                                                <TableHead className="py-2 h-8 w-[15%]">Quantity</TableHead>
                                                <TableHead className="py-2 h-8 w-[20%]">Amount (ea)</TableHead>
                                                <TableHead className="py-2 h-8 w-[10%]">Total</TableHead>
                                                <TableHead className="py-2 h-8 w-[5%]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {securityItems.map((item, index) => {
                                                const availableHoldings = item.isReturn && item.cylinderVariantKey ? getAvailableHoldings(item.cylinderVariantKey) : 0;
                                                const isReturnInvalid = item.isReturn && item.cylinderVariantKey && Number(item.quantity) > availableHoldings;
                                                return (
                                                    <TableRow key={index} id={`security-item-${index}`} className="hover:bg-transparent">
                                                        <TableCell className="py-2 align-top">
                                                            <CustomSelect
                                                                value={item.isReturn ? 'return' : 'deposit'}
                                                                onChange={(val) => updateSecurityItem(index, 'isReturn', val === 'return')}
                                                                options={[
                                                                    { value: 'deposit', label: 'Deposit' },
                                                                    { value: 'return', label: 'Return' }
                                                                ]}
                                                                className="h-9 text-sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top">
                                                            <CustomSelect
                                                                value={item.cylinderVariantKey}
                                                                onChange={(val) => updateSecurityItem(index, 'cylinderVariantKey', val)}
                                                                placeholder="Select Type"
                                                                options={(item.isReturn ? getReturnableHoldingOptions() : inventoryCylinderTypes.map((type) => ({
                                                                    value: type.variantKey,
                                                                    label: type.label
                                                                })))}
                                                                className="h-9 text-sm"
                                                            />
                                                            {item.isReturn && item.cylinderVariantKey && (
                                                                <div className={`text-[10px] mt-0.5 ${availableHoldings === 0 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                                                                    Holdings: {availableHoldings}
                                                                </div>
                                                            )}
                                                            {!item.isReturn && item.cylinderVariantKey && (
                                                                <div className="text-[10px] mt-0.5 text-gray-400">
                                                                    {(() => {
                                                                        const typeInfo = inventoryCylinderTypes.find(t => t.variantKey === item.cylinderVariantKey);
                                                                        const typeStock = typeInfo?.fullCount ?? 0;
                                                                        const isLow = typeStock < 5;
                                                                        return (
                                                                            <span className={typeStock === 0 || isLow ? "text-red-500 font-bold" : ""}>
                                                                                Stock: {typeStock}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max={item.isReturn && item.cylinderVariantKey ? availableHoldings : undefined}
                                                                value={item.quantity || ''}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value;
                                                                    if (raw === '') {
                                                                        updateSecurityItem(index, 'quantity', '');
                                                                        return;
                                                                    }
                                                                    const n = Math.max(0, parseInt(raw, 10) || 0);
                                                                    const clamped =
                                                                        item.isReturn && item.cylinderVariantKey
                                                                            ? Math.min(n, availableHoldings)
                                                                            : n;
                                                                    updateSecurityItem(index, 'quantity', clamped);
                                                                }}
                                                                className={`h-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isReturnInvalid ? 'border-red-500' : ''}`}
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={item.pricePerItem}
                                                                onChange={(e) => updateSecurityItem(index, 'pricePerItem', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                                                                className="h-9 text-sm"
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top font-medium">
                                                            Rs {(Number(item.pricePerItem) * Number(item.quantity)) || 0}
                                                        </TableCell>
                                                        <TableCell className="py-2 align-top text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSecurityItem(index)}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                            >
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {securityItems.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-4 text-gray-400 text-sm">
                                                        No security items added
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-3">
                                        <Button
                                            type="button"
                                            onClick={addSecurityItem}
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                                        >
                                            <PlusIcon className="w-3 h-3 mr-1" />
                                            Add Security
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Accessories Accordion */}
                        <div className={`border rounded-xl overflow-hidden transition-all ${accessoriesExpanded ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'}`}>
                            <button
                                type="button"
                                onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${accessoriesExpanded ? 'bg-purple-100/50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${accessoriesExpanded ? 'bg-purple-600' : 'bg-gray-300'}`}>
                                        <CubeIcon className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-medium text-sm text-gray-900">Accessories</span>
                                        {accessoryItems.some(i => i.quantity > 0) && (
                                            <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-5">
                                                {accessoryItems.filter(i => i.quantity > 0).length}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${accessoriesExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {accessoriesExpanded && (
                                <div className="p-4 border-t border-purple-200">
                                    <ProfessionalAccessorySelector
                                        accessoryItems={accessoryItems}
                                        setAccessoryItems={(items) => {
                                            if (error) setError(null);
                                            setAccessoryItems(items);
                                        }}
                                        onValidationChange={setHasAccessoryErrors}
                                        onInventoryValidationChange={handleInventoryValidationChange}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Summary & Footer */}
                        <div className="bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add transaction notes..."
                                    rows={2}
                                    className="bg-white"
                                />
                            </div>
                            <div className="md:w-1/3 flex flex-col justify-between">
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal:</span>
                                        <span>Rs {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Delivery:</span>
                                        <span>Rs {Number(deliveryCharges).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2">
                                        <span>Total:</span>
                                        <span className="text-blue-600">Rs {finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={submitting}
                                        className="flex-1 h-9"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md h-9"
                                    >
                                        {submitting ? 'Creating...' : 'Create Transaction'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );


}
