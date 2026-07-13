import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkOrderJobLine } from '@/types/jobLine';
import { jobLineStatusMap, JOB_LINE_STATUSES, LABOR_RATE_TYPES } from '@/types/jobLine';
import { updateWorkOrderJobLine } from '@/services/workOrder/jobLinesService';
export interface UnifiedJobLineEditDialogProps {
  jobLine: WorkOrderJobLine | null;
  workOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (jobLine: WorkOrderJobLine) => Promise<void>;
}
export function UnifiedJobLineEditDialog({
  jobLine,
  workOrderId,
  open,
  onOpenChange,
  onSave
}: UnifiedJobLineEditDialogProps) {
  const [formData, setFormData] = useState<Partial<WorkOrderJobLine>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (jobLine) {
      setFormData({
        name: jobLine.name || '',
        category: jobLine.category || '',
        subcategory: jobLine.subcategory || '',
        description: jobLine.description || '',
        estimated_hours: jobLine.estimated_hours || 0,
        labor_rate: jobLine.labor_rate || 0,
        labor_rate_type: jobLine.labor_rate_type || 'standard',
        status: jobLine.status || 'pending',
        notes: jobLine.notes || ''
      });
    }
  }, [jobLine]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobLine) return;
    setIsSubmitting(true);
    try {
      const totalAmount = (formData.estimated_hours || 0) * (formData.labor_rate || 0);
      const updatedJobLine: WorkOrderJobLine = {
        ...jobLine,
        ...formData,
        total_amount: totalAmount
      };
      await updateWorkOrderJobLine(jobLine.id, updatedJobLine);
      await onSave(updatedJobLine);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating job line:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleInputChange = (field: keyof WorkOrderJobLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  if (!jobLine) return null;
  const totalAmount = (formData.estimated_hours || 0) * (formData.labor_rate || 0);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle>Edit Job Line</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Job Line Name *</Label>
                <Input id="name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={formData.category || ''} onChange={e => handleInputChange('category', e.target.value)} />
              </div>

              <div>
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input id="subcategory" value={formData.subcategory || ''} onChange={e => handleInputChange('subcategory', e.target.value)} />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status || 'pending'} onValueChange={value => handleInputChange('status', value)}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_LINE_STATUSES.map(status => <SelectItem key={status} value={status}>
                        {jobLineStatusMap[status].label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input id="estimated_hours" type="number" step="0.25" min="0" value={formData.estimated_hours || ''} onChange={e => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)} />
              </div>

              <div>
                <Label htmlFor="labor_rate">Labor Rate ($)</Label>
                <Input id="labor_rate" type="number" step="0.01" min="0" value={formData.labor_rate || ''} onChange={e => handleInputChange('labor_rate', parseFloat(e.target.value) || 0)} />
              </div>

              <div>
                <Label htmlFor="labor_rate_type">Rate Type</Label>
                <Select value={formData.labor_rate_type || 'standard'} onValueChange={value => handleInputChange('labor_rate_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABOR_RATE_TYPES.map(type => <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Total Amount</Label>
                <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Description and Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} rows={3} />
            </div>

            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea id="notes" value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} rows={2} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
}