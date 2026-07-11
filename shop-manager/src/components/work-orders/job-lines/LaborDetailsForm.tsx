import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkOrderJobLine, LABOR_RATE_TYPES } from '@/types/jobLine';

interface LaborDetailsFormProps {
  jobLine: WorkOrderJobLine;
  onSubmit: (data: Partial<WorkOrderJobLine>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function LaborDetailsForm({ 
  jobLine, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: LaborDetailsFormProps) {
  const [formData, setFormData] = useState({
    name: jobLine.name || '',
    description: jobLine.description || '',
    estimated_hours: jobLine.estimated_hours || 1,
    labor_rate: jobLine.labor_rate || 85,
    labor_rate_type: jobLine.labor_rate_type || 'standard' as const,
    notes: jobLine.notes || '',
    subcategory: jobLine.subcategory || '',
    total_amount: jobLine.total_amount || (jobLine.estimated_hours || 1) * (jobLine.labor_rate || 85)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate total amount
    const calculatedTotal = formData.estimated_hours * formData.labor_rate;
    
    await onSubmit({
      ...formData,
      total_amount: calculatedTotal
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total when hours or rate changes
      if (field === 'estimated_hours' || field === 'labor_rate') {
        updated.total_amount = updated.estimated_hours * updated.labor_rate;
      }
      
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Service Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            placeholder="e.g., Oil Change, Brake Inspection"
          />
        </div>

        <div>
          <Label htmlFor="subcategory">Service Category</Label>
          <Input
            id="subcategory"
            value={formData.subcategory}
            onChange={(e) => handleInputChange('subcategory', e.target.value)}
            placeholder="e.g., Maintenance, Repair, Diagnostic"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Detailed Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          placeholder="Detailed description of work to be performed..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="estimated_hours">Hours *</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.25"
            min="0.25"
            value={formData.estimated_hours}
            onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div>
          <Label htmlFor="labor_rate">Labor Rate ($) *</Label>
          <Input
            id="labor_rate"
            type="number"
            step="0.01"
            min="0"
            value={formData.labor_rate}
            onChange={(e) => handleInputChange('labor_rate', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div>
          <Label htmlFor="total_amount">Total Amount</Label>
          <Input
            id="total_amount"
            type="number"
            step="0.01"
            value={formData.total_amount}
            readOnly
            className="bg-muted"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="labor_rate_type">Rate Type</Label>
        <Select
          value={formData.labor_rate_type}
          onValueChange={(value) => handleInputChange('labor_rate_type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LABOR_RATE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={2}
          placeholder="Special instructions, required tools, etc..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Labor Details'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}