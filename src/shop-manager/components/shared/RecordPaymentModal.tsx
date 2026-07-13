
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodSelect } from './PaymentMethodSelect';
import { DollarSign, CheckCircle } from 'lucide-react';

export interface PaymentData {
  paymentMethod: string;
  amount: number;
  reference?: string;
  notes?: string;
}

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentData) => void;
  invoiceTotal: number;
  balanceDue: number;
  isLoading?: boolean;
}

export function RecordPaymentModal({
  open,
  onClose,
  onSubmit,
  invoiceTotal,
  balanceDue,
  isLoading = false,
}: RecordPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState(balanceDue > 0 ? balanceDue : invoiceTotal);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!paymentMethod) return;
    onSubmit({
      paymentMethod,
      amount,
      reference: reference || undefined,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    setPaymentMethod('');
    setAmount(balanceDue > 0 ? balanceDue : invoiceTotal);
    setReference('');
    setNotes('');
    onClose();
  };

  const isValid = paymentMethod && amount > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for this invoice. Balance due: ${balanceDue.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <PaymentMethodSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-7"
              />
            </div>
            {amount > balanceDue && balanceDue > 0 && (
              <p className="text-xs text-amber-600">
                Amount exceeds balance due (${balanceDue.toFixed(2)})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference # (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, Transaction ID, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
