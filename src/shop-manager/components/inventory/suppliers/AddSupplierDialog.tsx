import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addInventorySupplier, CreateSupplierData } from "@/services/inventory/supplierService";
import { toast } from "sonner";

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSupplierDialog({ open, onOpenChange, onSuccess }: AddSupplierDialogProps) {
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    payment_terms: "",
    lead_time_days: undefined,
    notes: "",
    type: "",
    region: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    setIsLoading(true);
    try {
      await addInventorySupplier(formData);
      setFormData({
        name: "",
        contact_name: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        payment_terms: "",
        lead_time_days: undefined,
        notes: "",
        type: "",
        region: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add supplier");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateSupplierData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Enter supplier information and contact details to add them to your inventory system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter supplier name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleInputChange("contact_name", e.target.value)}
                placeholder="Primary contact person"
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="contact@supplier.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://supplier.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Supplier Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Terms */}
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={(value) => handleInputChange("payment_terms", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
              <Input
                id="lead_time_days"
                type="number"
                min="0"
                value={formData.lead_time_days || ""}
                onChange={(e) => handleInputChange("lead_time_days", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                placeholder="e.g., North America, Europe"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Street address, city, state, zip code"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about this supplier"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}