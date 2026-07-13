
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { Customer } from "@/types/customer";
import { CustomerReferralView } from "@/types/referral";
import { createCustomerReferral } from "@/services/referral/referralService";
import { CustomerSearchInput } from "@/components/customers/CustomerSearchInput";

interface AddReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onReferralAdded: (referral: CustomerReferralView) => void;
}

export const AddReferralDialog: React.FC<AddReferralDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onReferralAdded
}) => {
  const [notes, setNotes] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer?.id || !customer.id) {
      toast({
        title: "Missing information",
        description: "Please select a customer to refer",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const referralData = {
        referrer_id: customer.id,
        referred_id: selectedCustomer.id,
        notes: notes
      };
      
      const newReferral = await createCustomerReferral(referralData);
      
      toast({
        title: "Referral added",
        description: `Successfully added referral for ${selectedCustomer.first_name} ${selectedCustomer.last_name}`
      });
      
      // Convert to view format for the table
      const viewReferral: CustomerReferralView = {
        ...newReferral,
        referrer_first_name: customer.first_name,
        referrer_last_name: customer.last_name,
        referrer_email: customer.email || "",
        referred_first_name: selectedCustomer.first_name,
        referred_last_name: selectedCustomer.last_name,
        referred_email: selectedCustomer.email || ""
      };
      
      onReferralAdded(viewReferral);
      
      // Reset form
      setNotes("");
      setSelectedCustomer(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating referral:", error);
      toast({
        title: "Failed to create referral",
        description: "An error occurred while adding the referral",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Customer Referral
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referrer">Referring Customer</Label>
            <Input
              id="referrer"
              value={`${customer.first_name} ${customer.last_name}`}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referred">Referred Customer</Label>
            <CustomerSearchInput
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              selectedCustomer={selectedCustomer}
              placeholderText="Search for customer"
              disabledCustomerIds={[customer.id]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this referral"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedCustomer}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                "Add Referral"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
