
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WorkOrderPartFormValues, PART_TYPES, WORK_ORDER_PART_STATUSES } from '@/types/workOrderPart';
import { PartsFormValidator } from '@/utils/partsErrorHandler';

interface AddPartFormProps {
  onSubmit: (formData: WorkOrderPartFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddPartForm({ onSubmit, onCancel, isSubmitting = false }: AddPartFormProps) {
  const [formData, setFormData] = useState<WorkOrderPartFormValues>({
    name: '',
    part_number: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    status: 'pending',
    part_type: 'inventory',
    isTaxable: true
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = PartsFormValidator.validatePartForm(formData);
    if (errors.length > 0) {
      const errorMap = errors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {} as {[key: string]: string});
      
      setValidationErrors(errorMap);
      PartsFormValidator.showValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    await onSubmit(formData);
  };

  const handleInputChange = (field: keyof WorkOrderPartFormValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Part Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={validationErrors.name ? 'border-red-500' : ''}
            required
          />
          {validationErrors.name && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="part_number">Part Number *</Label>
          <Input
            id="part_number"
            value={formData.part_number}
            onChange={(e) => handleInputChange('part_number', e.target.value)}
            className={validationErrors.part_number ? 'border-red-500' : ''}
            required
          />
          {validationErrors.part_number && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.part_number}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
            className={validationErrors.quantity ? 'border-red-500' : ''}
            required
          />
          {validationErrors.quantity && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.quantity}</p>
          )}
        </div>

        <div>
          <Label htmlFor="unit_price">Customer Price *</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.unit_price}
            onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
            className={validationErrors.unit_price ? 'border-red-500' : ''}
            required
          />
          {validationErrors.unit_price && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.unit_price}</p>
          )}
        </div>

        <div>
          <Label htmlFor="supplierCost">Supplier Cost</Label>
          <Input
            id="supplierCost"
            type="number"
            step="0.01"
            min="0"
            value={formData.supplierCost || ''}
            onChange={(e) => handleInputChange('supplierCost', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="part_type">Part Type *</Label>
          <Select
            value={formData.part_type}
            onValueChange={(value) => handleInputChange('part_type', value)}
          >
            <SelectTrigger className={validationErrors.part_type ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select part type" />
            </SelectTrigger>
            <SelectContent>
              {PART_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'inventory' ? 'Inventory Item' : 'Non-Inventory Item'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.part_type && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.part_type}</p>
          )}
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_ORDER_PART_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isTaxable"
          checked={formData.isTaxable || false}
          onCheckedChange={(checked) => handleInputChange('isTaxable', checked)}
        />
        <Label htmlFor="isTaxable">Taxable</Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Part'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
