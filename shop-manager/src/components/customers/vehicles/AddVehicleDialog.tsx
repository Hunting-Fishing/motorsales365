
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomerVehicle } from '@/types/customer';
import { useToast } from '@/hooks/use-toast';

interface AddVehicleDialogProps {
  customerId: string;
  onClose: () => void;
  onVehicleAdded: (vehicle: CustomerVehicle) => void;
}

export const AddVehicleDialog: React.FC<AddVehicleDialogProps> = ({
  customerId,
  onClose,
  onVehicleAdded
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    license_plate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.make || !formData.model || !formData.year) {
      toast({
        title: "Missing Information",
        description: "Please fill in make, model, and year.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the vehicle object
      const newVehicle: CustomerVehicle = {
        id: `temp-${Date.now()}`, // Temporary ID for UI purposes
        customer_id: customerId,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        vin: formData.vin || undefined,
        license_plate: formData.license_plate || undefined
      };

      // In a real app, you would save this to the database here
      // For now, we'll just pass it back to the parent
      onVehicleAdded(newVehicle);
      
      toast({
        title: "Vehicle Added",
        description: "Vehicle has been added successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add vehicle. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="make">Make *</Label>
          <Input
            id="make"
            value={formData.make}
            onChange={(e) => handleInputChange('make', e.target.value)}
            placeholder="Toyota"
            required
          />
        </div>
        <div>
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            placeholder="Camry"
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="year">Year *</Label>
        <Input
          id="year"
          value={formData.year}
          onChange={(e) => handleInputChange('year', e.target.value)}
          placeholder="2023"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="vin">VIN</Label>
        <Input
          id="vin"
          value={formData.vin}
          onChange={(e) => handleInputChange('vin', e.target.value)}
          placeholder="Enter VIN (optional)"
        />
      </div>
      
      <div>
        <Label htmlFor="license_plate">License Plate</Label>
        <Input
          id="license_plate"
          value={formData.license_plate}
          onChange={(e) => handleInputChange('license_plate', e.target.value)}
          placeholder="ABC123"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Vehicle"}
        </Button>
      </div>
    </form>
  );
};
