"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CreditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  availableCredit: number;
  purchaseAmount: number;
  onApplyCredit: (amount: number, notes: string) => void;
}

export default function CreditApplicationModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  availableCredit,
  purchaseAmount,
  onApplyCredit
}: CreditApplicationModalProps) {
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  const handleApplyCredit = () => {
    if (creditAmount > 0 && creditAmount <= availableCredit) {
      onApplyCredit(creditAmount, notes);
      setCreditAmount(0);
      setNotes('');
      onClose();
    }
  };

  const handleClose = () => {
    setCreditAmount(0);
    setNotes('');
    onClose();
  };

  const remainingPurchaseAmount = Math.max(0, purchaseAmount - creditAmount);
  const remainingCredit = availableCredit - creditAmount;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-blue-600" />
            Apply Vendor Credit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">{vendorName}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Available Credit:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(availableCredit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Purchase Amount:</span>
                <span className="font-medium">
                  {formatCurrency(purchaseAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Credit Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="creditAmount">Credit Amount to Apply</Label>
            <Input
              id="creditAmount"
              type="number"
              placeholder="Enter amount to apply from credit"
              value={creditAmount || ''}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              max={Math.min(availableCredit, purchaseAmount)}
              min={0}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreditAmount(Math.min(availableCredit, purchaseAmount))}
              >
                Use Maximum
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreditAmount(0)}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Calculation Preview */}
          {creditAmount > 0 && (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Payment Calculation</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Purchase Amount:</span>
                  <span>{formatCurrency(purchaseAmount)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Credit Applied:</span>
                  <span>-{formatCurrency(creditAmount)}</span>
                </div>
                <div className="border-t border-blue-200 pt-1 flex justify-between font-medium">
                  <span>Amount to Pay:</span>
                  <span>{formatCurrency(remainingPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Remaining Credit:</span>
                  <span>{formatCurrency(remainingCredit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {creditAmount > availableCredit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Credit amount exceeds available credit
                </span>
              </div>
            </div>
          )}

          {creditAmount > purchaseAmount && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Credit amount exceeds purchase amount
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this credit application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyCredit}
            disabled={creditAmount <= 0 || creditAmount > availableCredit}
          >
            Apply Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
