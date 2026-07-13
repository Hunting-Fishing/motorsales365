import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { nonprofitApi } from '@/lib/services/nonprofitApi';

interface ImpactMeasurementEntryDialogProps {
  onMeasurementAdded?: () => void;
  children?: React.ReactNode;
}

interface ImpactMeasurementFormData {
  measurement_name: string;
  category: 'general' | 'environment' | 'community' | 'health' | 'education';
  measurement_type: 'quantitative' | 'qualitative' | 'percentage';
  current_value: number;
  target_value?: number;
  unit_of_measure: string;
  measurement_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  data_source: string;
  verification_method: string;
  last_measured_date?: Date;
  next_measurement_date?: Date;
  baseline_value?: number;
  baseline_date?: Date;
  notes?: string;
}

export const ImpactMeasurementEntryDialog: React.FC<ImpactMeasurementEntryDialogProps> = ({
  onMeasurementAdded,
  children
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ImpactMeasurementFormData>({
    measurement_name: '',
    category: 'general',
    measurement_type: 'quantitative',
    current_value: 0,
    unit_of_measure: '',
    measurement_period: 'monthly',
    data_source: '',
    verification_method: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.measurement_name.trim()) {
      newErrors.measurement_name = 'Measurement name is required';
    }

    if (!formData.unit_of_measure.trim()) {
      newErrors.unit_of_measure = 'Unit of measure is required';
    }

    if (!formData.data_source.trim()) {
      newErrors.data_source = 'Data source is required';
    }

    if (!formData.verification_method.trim()) {
      newErrors.verification_method = 'Verification method is required';
    }

    if (formData.current_value < 0) {
      newErrors.current_value = 'Current value cannot be negative';
    }

    if (formData.target_value !== undefined && formData.target_value < 0) {
      newErrors.target_value = 'Target value cannot be negative';
    }

    if (formData.baseline_value !== undefined && formData.baseline_value < 0) {
      newErrors.baseline_value = 'Baseline value cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const measurementData = {
        measurement_name: formData.measurement_name,
        category: formData.category,
        measurement_type: formData.measurement_type,
        current_value: formData.current_value,
        target_value: formData.target_value,
        unit_of_measure: formData.unit_of_measure,
        measurement_period: formData.measurement_period,
        data_source: formData.data_source,
        verification_method: formData.verification_method,
        last_measured_date: formData.last_measured_date ? formData.last_measured_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        next_measurement_date: formData.next_measurement_date ? formData.next_measurement_date.toISOString().split('T')[0] : undefined,
        baseline_value: formData.baseline_value,
        baseline_date: formData.baseline_date ? formData.baseline_date.toISOString().split('T')[0] : undefined,
        notes: formData.notes
      };

      await nonprofitApi.createImpactMeasurement({
        program_id: '', // Will be handled in the API
        metric_name: measurementData.measurement_name,
        metric_value: measurementData.current_value,
        measurement_unit: measurementData.unit_of_measure,
        measurement_date: measurementData.last_measured_date,
        measurement_period: measurementData.measurement_period,
        notes: measurementData.notes
      });

      toast({
        title: "Success",
        description: "Impact measurement created successfully",
      });

      setOpen(false);
      setFormData({
        measurement_name: '',
        category: 'general',
        measurement_type: 'quantitative',
        current_value: 0,
        unit_of_measure: '',
        measurement_period: 'monthly',
        data_source: '',
        verification_method: ''
      });
      
      if (onMeasurementAdded) {
        onMeasurementAdded();
      }
    } catch (error) {
      console.error('Error creating impact measurement:', error);
      toast({
        title: "Error",
        description: "Failed to create impact measurement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof ImpactMeasurementFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Measurement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Impact Measurement</DialogTitle>
          <DialogDescription>
            Create a new impact measurement to track your organization's outcomes
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Measurement Name"
              required
              value={formData.measurement_name}
              onChange={(e) => updateFormData('measurement_name', e.target.value)}
              error={errors.measurement_name}
              placeholder="e.g. People Helped, Meals Served"
            />
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="measurement_type">Measurement Type *</Label>
              <Select value={formData.measurement_type} onValueChange={(value) => updateFormData('measurement_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantitative">Quantitative</SelectItem>
                  <SelectItem value="qualitative">Qualitative</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Current Value"
              type="number"
              required
              value={formData.current_value}
              onChange={(e) => updateFormData('current_value', parseFloat(e.target.value) || 0)}
              error={errors.current_value}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Target Value"
              type="number"
              value={formData.target_value || ''}
              onChange={(e) => updateFormData('target_value', e.target.value ? parseFloat(e.target.value) : undefined)}
              error={errors.target_value}
              placeholder="Optional target"
            />

            <FormField
              label="Unit of Measure"
              required
              value={formData.unit_of_measure}
              onChange={(e) => updateFormData('unit_of_measure', e.target.value)}
              error={errors.unit_of_measure}
              placeholder="e.g. people, meals, kg, hours"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="measurement_period">Measurement Period *</Label>
              <Select value={formData.measurement_period} onValueChange={(value) => updateFormData('measurement_period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Data Source"
              required
              value={formData.data_source}
              onChange={(e) => updateFormData('data_source', e.target.value)}
              error={errors.data_source}
              placeholder="e.g. Registration forms, surveys"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Verification Method"
              required
              value={formData.verification_method}
              onChange={(e) => updateFormData('verification_method', e.target.value)}
              error={errors.verification_method}
              placeholder="e.g. Staff count, documentation review"
            />

            <FormField
              label="Baseline Value"
              type="number"
              value={formData.baseline_value || ''}
              onChange={(e) => updateFormData('baseline_value', e.target.value ? parseFloat(e.target.value) : undefined)}
              error={errors.baseline_value}
              placeholder="Starting measurement value"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last Measured Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.last_measured_date ? format(formData.last_measured_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.last_measured_date}
                    onSelect={(date) => updateFormData('last_measured_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Next Measurement Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.next_measurement_date ? format(formData.next_measurement_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.next_measurement_date}
                    onSelect={(date) => updateFormData('next_measurement_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Baseline Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.baseline_date ? format(formData.baseline_date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.baseline_date}
                  onSelect={(date) => updateFormData('baseline_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Additional notes about this measurement..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Measurement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};