import React, { useState, useEffect } from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WORK_ORDER_PART_STATUSES, PART_TYPES } from '@/types/workOrderPart';

interface EditPartDialogProps {
  part: WorkOrderPart | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  isLoading?: boolean;
}

export function EditPartDialog({ 
  part, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading = false 
}: EditPartDialogProps) {
  const [formData, setFormData] = useState<Partial<WorkOrderPart>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when part changes
  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        part_number: part.part_number || '',
        quantity: part.quantity || 1,
        unit_price: part.unit_price || 0,
        status: part.status || 'pending',
        part_type: part.part_type || 'inventory',
        category: part.category || '',
        notes: part.notes || '',
        supplierName: part.supplierName || '',
        supplierCost: part.supplierCost || 0,
        markupPercentage: part.markupPercentage || 0,
        isTaxable: part.isTaxable !== undefined ? part.isTaxable : true,
        warrantyDuration: part.warrantyDuration || '',
        invoiceNumber: part.invoiceNumber || '',
        poLine: part.poLine || ''
      });
      setErrors({});
    }
  }, [part]);

  const handleInputChange = (field: keyof WorkOrderPart, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Part name is required';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.unit_price !== undefined && formData.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!part || !validateForm()) return;

    try {
      await onSave(part.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving part:', error);
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  if (!part) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Part</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Part Name */}
          <div className="space-y-2">
            <Label htmlFor="partName">
              Part Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="partName"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Part Number */}
          <div className="space-y-2">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input
              id="partNumber"
              value={formData.part_number || ''}
              onChange={(e) => handleInputChange('part_number', e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity || 1}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity}</p>
            )}
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price</Label>
            <Input
              id="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price || 0}
              onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
              className={errors.unit_price ? 'border-red-500' : ''}
            />
            {errors.unit_price && (
              <p className="text-sm text-red-500">{errors.unit_price}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status || 'pending'} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_PART_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    <Badge variant="secondary" className="text-xs">
                      {status}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Part Type */}
          <div className="space-y-2">
            <Label>Part Type</Label>
            <Select 
              value={formData.part_type || 'inventory'} 
              onValueChange={(value) => handleInputChange('part_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
            />
          </div>

          {/* Supplier Name */}
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              value={formData.supplierName || ''}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
            />
          </div>

          {/* Supplier Cost */}
          <div className="space-y-2">
            <Label htmlFor="supplierCost">Supplier Cost</Label>
            <Input
              id="supplierCost"
              type="number"
              min="0"
              step="0.01"
              value={formData.supplierCost || 0}
              onChange={(e) => handleInputChange('supplierCost', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Markup Percentage */}
          <div className="space-y-2">
            <Label htmlFor="markupPercentage">Markup %</Label>
            <Input
              id="markupPercentage"
              type="number"
              min="0"
              step="0.1"
              value={formData.markupPercentage || 0}
              onChange={(e) => handleInputChange('markupPercentage', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber || ''}
              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
            />
          </div>

          {/* PO Line */}
          <div className="space-y-2">
            <Label htmlFor="poLine">PO Line</Label>
            <Input
              id="poLine"
              value={formData.poLine || ''}
              onChange={(e) => handleInputChange('poLine', e.target.value)}
            />
          </div>

          {/* Warranty Duration */}
          <div className="space-y-2">
            <Label htmlFor="warrantyDuration">Warranty Duration</Label>
            <Input
              id="warrantyDuration"
              value={formData.warrantyDuration || ''}
              onChange={(e) => handleInputChange('warrantyDuration', e.target.value)}
              placeholder="e.g., 12 months, 1 year"
            />
          </div>

          {/* Is Taxable Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isTaxable"
                checked={formData.isTaxable !== false}
                onCheckedChange={(checked) => handleInputChange('isTaxable', checked)}
              />
              <Label htmlFor="isTaxable">Taxable</Label>
            </div>
          </div>
        </div>

        {/* Notes - Full Width */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes about this part..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}