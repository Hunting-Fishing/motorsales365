
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer, getCustomerFullName } from '@/types/customer';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CreateWorkOrderFromCustomerDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkOrderFromCustomerDialog({
  customer,
  open,
  onOpenChange
}: CreateWorkOrderFromCustomerDialogProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    vehicleId: ''
  });

  const customerName = getCustomerFullName(customer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create URL parameters for the work order creation page
      const params = new URLSearchParams({
        customerId: customer.id,
        customer: customerName,
        customerEmail: customer.email || '',
        customerPhone: customer.phone || '',
        customerAddress: customer.address || '',
        title: formData.title,
        description: formData.description,
        priority: formData.priority
      });

      // Add vehicle information if selected
      if (formData.vehicleId && formData.vehicleId !== 'none' && customer.vehicles) {
        const selectedVehicle = customer.vehicles.find(v => v.id === formData.vehicleId);
        if (selectedVehicle) {
          console.log('Selected vehicle for work order:', selectedVehicle);
          
          // Add vehicle_id as the primary identifier
          params.append('vehicleId', selectedVehicle.id!);
          
          // Add vehicle details for form pre-population
          params.append('vehicleMake', selectedVehicle.make || '');
          params.append('vehicleModel', selectedVehicle.model || '');
          params.append('vehicleYear', selectedVehicle.year?.toString() || '');
          params.append('vehicleLicensePlate', selectedVehicle.license_plate || '');
          params.append('vehicleVin', selectedVehicle.vin || '');
          
          // Create vehicle info string for backward compatibility
          const vehicleInfo = `${selectedVehicle.year || ''} ${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim();
          if (vehicleInfo) {
            params.append('vehicleInfo', vehicleInfo);
          }
        }
      }

      console.log('Navigating to work order creation with params:', params.toString());

      // Navigate to work order creation page with pre-filled data
      navigate(`/work-orders/create?${params.toString()}`);
      onOpenChange(false);
      
      toast.success('Redirecting to create work order...');
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error('Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Work Order for {customerName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Work Order Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter work order title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the work to be done"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {customer.vehicles && customer.vehicles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle (Optional)</Label>
              <Select value={formData.vehicleId} onValueChange={(value) => handleInputChange('vehicleId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle selected</SelectItem>
                  {customer.vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id!}>
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.license_plate && `(${vehicle.license_plate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
