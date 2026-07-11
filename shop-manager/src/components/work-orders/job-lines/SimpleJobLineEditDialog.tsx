import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WorkOrderJobLine, JobLineStatus, LaborRateType } from '@/types/jobLine';
import { jobLineStatusMap, JOB_LINE_STATUSES } from '@/types/jobLine';
import { updateWorkOrderJobLine } from '@/services/workOrder/jobLinesService';
import { useLabourRates } from '@/hooks/useLabourRates';

export interface SimpleJobLineEditDialogProps {
  jobLine: WorkOrderJobLine | null;
  workOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (jobLine: WorkOrderJobLine) => Promise<void>;
}

export function SimpleJobLineEditDialog({
  jobLine,
  workOrderId,
  open,
  onOpenChange,
  onSave
}: SimpleJobLineEditDialogProps) {
  const [formData, setFormData] = useState({
    estimated_hours: 0,
    labor_rate: 0,
    labor_rate_type: 'standard' as LaborRateType,
    status: 'pending' as JobLineStatus,
    use_custom_rate: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rates, loading: ratesLoading } = useLabourRates();

  // Rate type options with actual prices
  const rateOptions = [
    { value: 'standard', label: `Standard Rate ($${Number(rates.standard_rate).toFixed(2)})`, rate: Number(rates.standard_rate) },
    { value: 'diagnostic', label: `Diagnostic Rate ($${Number(rates.diagnostic_rate).toFixed(2)})`, rate: Number(rates.diagnostic_rate) },
    { value: 'emergency', label: `Emergency Rate ($${Number(rates.emergency_rate).toFixed(2)})`, rate: Number(rates.emergency_rate) },
    { value: 'warranty', label: `Warranty Rate ($${Number(rates.warranty_rate).toFixed(2)})`, rate: Number(rates.warranty_rate) },
    { value: 'internal', label: `Internal Rate ($${Number(rates.internal_rate).toFixed(2)})`, rate: Number(rates.internal_rate) }
  ];

  useEffect(() => {
    if (jobLine) {
      setFormData({
        estimated_hours: jobLine.estimated_hours || 0.25, // Default to 0.25 hours instead of 0
        labor_rate: jobLine.labor_rate || 0,
        labor_rate_type: jobLine.labor_rate_type || 'standard',
        status: jobLine.status || 'pending',
        use_custom_rate: false
      });
    }
  }, [jobLine]);

  // Auto-load rate from labor_rates table when rates load or jobLine changes
  useEffect(() => {
    if (jobLine && rates && !ratesLoading && formData.labor_rate === 0) {
      const rateType = jobLine.labor_rate_type || 'standard';
      const selectedRate = rateOptions.find(option => option.value === rateType);
      if (selectedRate && selectedRate.rate > 0) {
        setFormData(prev => ({
          ...prev,
          labor_rate: selectedRate.rate
        }));
      }
    }
  }, [jobLine, rates, ratesLoading, formData.labor_rate, rateOptions]);

  const handleRateTypeChange = (rateType: string) => {
    const selectedRate = rateOptions.find(option => option.value === rateType);
    if (selectedRate && !formData.use_custom_rate) {
      setFormData(prev => ({
        ...prev,
        labor_rate_type: rateType as LaborRateType,
        labor_rate: selectedRate.rate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        labor_rate_type: rateType as LaborRateType
      }));
    }
  };

  const handleCustomRateToggle = (useCustom: boolean) => {
    if (!useCustom) {
      // Reset to selected rate type's default rate
      const selectedRate = rateOptions.find(option => option.value === formData.labor_rate_type);
      if (selectedRate) {
        setFormData(prev => ({
          ...prev,
          use_custom_rate: useCustom,
          labor_rate: selectedRate.rate
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        use_custom_rate: useCustom
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobLine) return;

    setIsSubmitting(true);
    try {
      const totalAmount = formData.estimated_hours * formData.labor_rate;
      const updatedJobLine: WorkOrderJobLine = {
        ...jobLine,
        estimated_hours: formData.estimated_hours,
        labor_rate: formData.labor_rate,
        labor_rate_type: formData.labor_rate_type,
        status: formData.status,
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

  if (!jobLine) return null;

  const totalAmount = formData.estimated_hours * formData.labor_rate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Edit Job Line</DialogTitle>
          <p className="text-sm text-muted-foreground">{jobLine.name}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hours */}
          <div>
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.1"
              min="0"
              value={formData.estimated_hours || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                estimated_hours: parseFloat(e.target.value) || 0
              }))}
              className="text-lg"
            />
          </div>

          {/* Rate Type */}
          <div>
            <Label htmlFor="rate_type">Rate Type</Label>
            <Select 
              value={formData.labor_rate_type} 
              onValueChange={handleRateTypeChange}
              disabled={ratesLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Rate Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-rate"
              checked={formData.use_custom_rate}
              onCheckedChange={handleCustomRateToggle}
            />
            <Label htmlFor="custom-rate" className="text-sm">Use custom rate</Label>
          </div>

          {/* Custom Rate Input */}
          {formData.use_custom_rate && (
            <div>
              <Label htmlFor="custom_rate">Custom Rate ($)</Label>
              <Input
                id="custom_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.labor_rate || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  labor_rate: parseFloat(e.target.value) || 0
                }))}
                className="text-lg"
              />
            </div>
          )}

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                status: value as JobLineStatus
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_LINE_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {jobLineStatusMap[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total Amount Display */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formData.estimated_hours}h × ${formData.labor_rate.toFixed(2)}/h
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}