
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/rateCalculations";
import { Bay, RateSettings } from "@/services/diybay/diybayService";
import { BayDetails } from "@/types/diybay";

interface EditBayDialogProps {
  bay: Bay | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bay: Bay) => Promise<boolean>;
  calculateRate: (type: 'daily' | 'weekly' | 'monthly', hourlyRate: number) => number;
  settings: RateSettings;
  isSaving: boolean;
}

export const EditBayDialog: React.FC<EditBayDialogProps> = ({
  bay,
  isOpen,
  onClose,
  onSave,
  calculateRate,
  settings,
  isSaving,
}) => {
  const [editedBay, setEditedBay] = useState<Bay | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bay) {
      setEditedBay({ ...bay });
    }
  }, [bay]);

  const handleChange = (field: keyof Bay, value: string | number | boolean) => {
    if (!editedBay) return;
    
    const updatedBay = { ...editedBay, [field]: value };
    
    // If hourly rate changes, recalculate all other rates
    if (field === 'hourly_rate' && typeof value === 'number') {
      updatedBay.daily_rate = calculateRate('daily', value);
      updatedBay.weekly_rate = calculateRate('weekly', value);
      updatedBay.monthly_rate = calculateRate('monthly', value);
    }
    
    setEditedBay(updatedBay);
  };

  const handleSubmit = async () => {
    if (!editedBay) return;
    
    setIsSubmitting(true);
    try {
      const success = await onSave(editedBay);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Bay</DialogTitle>
        </DialogHeader>
        
        {editedBay && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="bay-name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="bay-name"
                value={editedBay.bay_name}
                onChange={(e) => handleChange('bay_name' as keyof Bay, e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="bay-location" className="text-right text-sm font-medium">
                Location
              </label>
              <Input
                id="bay-location"
                value={editedBay.bay_location || ''}
                onChange={(e) => handleChange('bay_location' as keyof Bay, e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="hourly-rate" className="text-right text-sm font-medium">
                Hourly Rate ($)
              </label>
              <div className="col-span-3">
                <Input
                  id="hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedBay.hourly_rate === 0 ? '' : editedBay.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleChange('hourly_rate', value);
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">
                Daily Rate
              </label>
              <div className="col-span-3 font-medium">
                {formatCurrency(editedBay.daily_rate || 0)}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">
                Weekly Rate
              </label>
              <div className="col-span-3 font-medium">
                {formatCurrency(editedBay.weekly_rate || 0)}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">
                Monthly Rate
              </label>
              <div className="col-span-3 font-medium">
                {formatCurrency(editedBay.monthly_rate || 0)}
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isSaving || !editedBay}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
