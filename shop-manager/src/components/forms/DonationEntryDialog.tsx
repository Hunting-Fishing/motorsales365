import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { nonprofitApi } from '@/lib/services/nonprofitApi';

interface DonationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDonationAdded: () => void;
  editingDonation?: any;
}

export function DonationEntryDialog({ 
  open, 
  onOpenChange, 
  onDonationAdded,
  editingDonation 
}: DonationEntryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acknowledgmentDate, setAcknowledmentDate] = useState<Date>();

  const [formData, setFormData] = useState({
    donor_name: editingDonation?.donor_name || '',
    donor_email: editingDonation?.donor_email || '',
    donor_phone: editingDonation?.donor_phone || '',
    amount: editingDonation?.amount || '',
    donation_type: editingDonation?.donation_type || 'cash',
    campaign_name: editingDonation?.campaign_name || '',
    designation: editingDonation?.designation || '',
    payment_method: editingDonation?.payment_method || 'check',
    transaction_id: editingDonation?.transaction_id || '',
    receipt_number: editingDonation?.receipt_number || '',
    is_recurring: editingDonation?.is_recurring || false,
    recurrence_frequency: editingDonation?.recurrence_frequency || '',
    tax_deductible: editingDonation?.tax_deductible !== false,
    acknowledgment_sent: editingDonation?.acknowledgment_sent || false,
    notes: editingDonation?.notes || ''
  });

  const resetForm = () => {
    setFormData({
      donor_name: '',
      donor_email: '',
      donor_phone: '',
      amount: '',
      donation_type: 'cash',
      campaign_name: '',
      designation: '',
      payment_method: 'check',
      transaction_id: '',
      receipt_number: '',
      is_recurring: false,
      recurrence_frequency: '',
      tax_deductible: true,
      acknowledgment_sent: false,
      notes: ''
    });
    setAcknowledmentDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.donor_name || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Donor name and amount are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const donationData = {
        ...formData,
        amount: parseFloat(formData.amount),
        acknowledgment_date: acknowledgmentDate?.toISOString(),
        metadata: {}
      };

      if (editingDonation) {
        await nonprofitApi.updateDonation(editingDonation.id, donationData);
        toast({
          title: "Success",
          description: "Donation updated successfully!"
        });
      } else {
        await nonprofitApi.createDonation(donationData);
        toast({
          title: "Success",
          description: "Donation recorded successfully!"
        });
      }

      resetForm();
      onDonationAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving donation:', error);
      toast({
        title: "Error",
        description: "Failed to save donation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingDonation ? 'Edit Donation' : 'Record New Donation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Donor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Donor Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donor_name">Donor Name *</Label>
                <Input
                  id="donor_name"
                  value={formData.donor_name}
                  onChange={(e) => setFormData({...formData, donor_name: e.target.value})}
                  placeholder="Enter donor name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="donor_email">Email</Label>
                <Input
                  id="donor_email"
                  type="email"
                  value={formData.donor_email}
                  onChange={(e) => setFormData({...formData, donor_email: e.target.value})}
                  placeholder="donor@example.com"
                />
              </div>

              <div>
                <Label htmlFor="donor_phone">Phone</Label>
                <Input
                  id="donor_phone"
                  value={formData.donor_phone}
                  onChange={(e) => setFormData({...formData, donor_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Donation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Donation Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="donation_type">Donation Type</Label>
                <Select value={formData.donation_type} onValueChange={(value) => setFormData({...formData, donation_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="in_kind">In-Kind</SelectItem>
                    <SelectItem value="stock">Stock/Securities</SelectItem>
                    <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="campaign_name">Campaign</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({...formData, campaign_name: e.target.value})}
                  placeholder="Annual Fundraiser, Special Appeal, etc."
                />
              </div>

              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  placeholder="General Fund, Building Fund, etc."
                />
              </div>

              <div>
                <Label htmlFor="transaction_id">Transaction ID</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                  placeholder="Bank transaction reference"
                />
              </div>

              <div>
                <Label htmlFor="receipt_number">Receipt Number</Label>
                <Input
                  id="receipt_number"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
                  placeholder="Auto-generated or manual"
                />
              </div>
            </div>

            {/* Recurring Donation */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked})}
              />
              <Label htmlFor="is_recurring">Recurring Donation</Label>
            </div>

            {formData.is_recurring && (
              <div>
                <Label htmlFor="recurrence_frequency">Frequency</Label>
                <Select value={formData.recurrence_frequency} onValueChange={(value) => setFormData({...formData, recurrence_frequency: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tax Deductible */}
            <div className="flex items-center space-x-2">
              <Switch
                id="tax_deductible"
                checked={formData.tax_deductible}
                onCheckedChange={(checked) => setFormData({...formData, tax_deductible: checked})}
              />
              <Label htmlFor="tax_deductible">Tax Deductible</Label>
            </div>

            {/* Acknowledgment */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="acknowledgment_sent"
                  checked={formData.acknowledgment_sent}
                  onCheckedChange={(checked) => setFormData({...formData, acknowledgment_sent: checked})}
                />
                <Label htmlFor="acknowledgment_sent">Acknowledgment Sent</Label>
              </div>

              {formData.acknowledgment_sent && (
                <div>
                  <Label>Acknowledgment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !acknowledgmentDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {acknowledgmentDate ? format(acknowledgmentDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={acknowledgmentDate}
                        onSelect={setAcknowledmentDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional notes about this donation..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingDonation ? 'Update Donation' : 'Record Donation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}