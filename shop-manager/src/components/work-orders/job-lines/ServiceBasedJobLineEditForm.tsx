
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkOrderJobLine, JOB_LINE_STATUSES, LABOR_RATE_TYPES } from '@/types/jobLine';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import { toast } from '@/hooks/use-toast';

interface ServiceBasedJobLineEditFormProps {
  jobLine: WorkOrderJobLine;
  onSave: (jobLine: WorkOrderJobLine) => Promise<void>;
  onCancel: () => void;
}

export function ServiceBasedJobLineEditForm({
  jobLine,
  onSave,
  onCancel
}: ServiceBasedJobLineEditFormProps) {
  const { sectors, loading: sectorsLoading } = useServiceSectors();
  const [formData, setFormData] = useState<WorkOrderJobLine>({
    ...jobLine,
    category: jobLine.category || '',
    subcategory: jobLine.subcategory || '',
    name: jobLine.name || '',
    description: jobLine.description || '',
    estimated_hours: jobLine.estimated_hours || 0,
    labor_rate: jobLine.labor_rate || 0,
    labor_rate_type: jobLine.labor_rate_type || 'standard',
    status: jobLine.status || 'pending',
    notes: jobLine.notes || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string, name: string}>>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{id: string, name: string}>>([]);

  // Extract categories from sectors
  useEffect(() => {
    if (sectors.length > 0) {
      const categories = sectors.flatMap(sector => 
        sector.categories.map(category => ({
          id: category.id,
          name: category.name
        }))
      );
      setAvailableCategories(categories);
    }
  }, [sectors]);

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category && sectors.length > 0) {
      const selectedCategory = sectors
        .flatMap(sector => sector.categories)
        .find(category => category.name === formData.category);
      
      if (selectedCategory) {
        const subcategories = selectedCategory.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name
        }));
        setAvailableSubcategories(subcategories);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [formData.category, sectors]);

  // Calculate total amount when hours or rate changes
  useEffect(() => {
    const totalAmount = (formData.estimated_hours || 0) * (formData.labor_rate || 0);
    setFormData(prev => ({ ...prev, total_amount: totalAmount }));
  }, [formData.estimated_hours, formData.labor_rate]);

  const handleInputChange = (field: keyof WorkOrderJobLine, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      category: categoryName,
      subcategory: '' // Reset subcategory when category changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Job line name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      toast({
        title: "Success",
        description: "Job line updated successfully"
      });
    } catch (error) {
      console.error('Error saving job line:', error);
      toast({
        title: "Error",
        description: "Failed to update job line",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 4-Column Grid Layout */}
      <div className="grid grid-cols-4 gap-4">
        {/* Column 1: Name, Category */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Job Line Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter job line name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category">Service Category</Label>
            <Select
              value={formData.category || ''}
              onValueChange={handleCategoryChange}
              disabled={sectorsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column 2: Description, Subcategory */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter description"
            />
          </div>
          
          <div>
            <Label htmlFor="subcategory">Service Subcategory</Label>
            <Select
              value={formData.subcategory || ''}
              onValueChange={(value) => handleInputChange('subcategory', value)}
              disabled={!formData.category || availableSubcategories.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.name}>
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column 3: Hours, Labor Rate Type */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.1"
              min="0"
              value={formData.estimated_hours || ''}
              onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)}
              placeholder="0.0"
            />
          </div>
          
          <div>
            <Label htmlFor="labor_rate_type">Labor Rate Type</Label>
            <Select
              value={formData.labor_rate_type || 'standard'}
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
        </div>

        {/* Column 4: Rate, Status */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="labor_rate">Labor Rate ($)</Label>
            <Input
              id="labor_rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.labor_rate || ''}
              onChange={(e) => handleInputChange('labor_rate', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || 'pending'}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_LINE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Full-width Notes section */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      {/* Total Amount Display */}
      <div className="bg-slate-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Amount:</span>
          <span className="text-lg font-bold text-green-600">
            ${(formData.total_amount || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
