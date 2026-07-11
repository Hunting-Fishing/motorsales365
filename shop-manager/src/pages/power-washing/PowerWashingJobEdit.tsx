import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { usePowerWashingJobs, useUpdatePowerWashingJob, PowerWashingJob } from '@/hooks/usePowerWashing';
import { CrewAssignmentPicker } from '@/components/power-washing/CrewAssignmentPicker';
import { PropertyAreaPicker } from '@/components/power-washing/PropertyAreaPicker';
import { JobPricingCalculator } from '@/components/power-washing/JobPricingCalculator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'hoa', label: 'HOA / Community' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function PowerWashingJobEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobs, isLoading: jobsLoading } = usePowerWashingJobs();
  const updateJob = useUpdatePowerWashingJob();

  const job = jobs?.find(j => j.id === id);
  const shopId = job?.shop_id;

  // Form state
  const [formData, setFormData] = useState<Partial<PowerWashingJob>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData({
        property_type: job.property_type || 'residential',
        property_address: job.property_address,
        property_city: job.property_city,
        property_state: job.property_state,
        property_zip: job.property_zip,
        square_footage: job.square_footage,
        priority: job.priority || 'normal',
        scheduled_date: job.scheduled_date,
        scheduled_time_start: job.scheduled_time_start,
        scheduled_time_end: job.scheduled_time_end,
        quoted_price: job.quoted_price,
        deposit_amount: job.deposit_amount,
        customer_notes: job.customer_notes,
        internal_notes: job.internal_notes,
        special_instructions: job.special_instructions,
        assigned_crew: job.assigned_crew || [],
      });
      setFormInitialized(true);
    }
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSaving(true);
    try {
      await updateJob.mutateAsync({ id, ...formData });
      navigate(`/power-washing/jobs/${id}`);
    } catch (error) {
      console.error('Failed to update job:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof PowerWashingJob, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Memoize crew array to prevent reference instability causing Checkbox infinite loops
  const selectedCrewStable = useMemo(() => 
    formData.assigned_crew || [], 
    [formData.assigned_crew]
  );

  // Block rendering until data is loaded AND form is initialized to prevent Select infinite loop
  if (jobsLoading || (job && !formInitialized)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <Button onClick={() => navigate('/power-washing/jobs')}>
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/power-washing/jobs/${id}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Job
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Edit Job {job.job_number}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Property Area Picker - use saved customer areas */}
            {job.customer_id && (
              <div className="md:col-span-2">
                <PropertyAreaPicker
                  customerId={job.customer_id}
                  onSelectArea={(area) => {
                    setFormData(prev => ({
                      ...prev,
                      square_footage: area.square_footage,
                      property_type: area.area_type || prev.property_type,
                    }));
                    toast.success(`Applied ${area.label || 'saved area'}: ${area.square_footage.toLocaleString()} sqft`);
                  }}
                />
              </div>
            )}
            <div>
              <Label>Property Type</Label>
              <Select 
                value={formData.property_type || 'residential'} 
                onValueChange={(v) => updateField('property_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Square Footage</Label>
              <Input
                type="number"
                value={formData.square_footage || ''}
                onChange={(e) => updateField('square_footage', parseInt(e.target.value) || null)}
                placeholder="e.g. 2500"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Street Address</Label>
              <Input
                value={formData.property_address || ''}
                onChange={(e) => updateField('property_address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.property_city || ''}
                onChange={(e) => updateField('property_city', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State</Label>
                <Input
                  value={formData.property_state || ''}
                  onChange={(e) => updateField('property_state', e.target.value)}
                  maxLength={2}
                />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input
                  value={formData.property_zip || ''}
                  onChange={(e) => updateField('property_zip', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Priority</Label>
              <Select 
                value={formData.priority || 'normal'} 
                onValueChange={(v) => updateField('priority', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date || ''}
                onChange={(e) => updateField('scheduled_date', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time_start || ''}
                  onChange={(e) => updateField('scheduled_time_start', e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time_end || ''}
                  onChange={(e) => updateField('scheduled_time_end', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crew Assignment */}
        {shopId && (
          <Card>
            <CardHeader>
              <CardTitle>Crew Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <CrewAssignmentPicker
                shopId={shopId}
                selectedCrew={selectedCrewStable}
                onCrewChange={(crew) => updateField('assigned_crew', crew)}
              />
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dynamic Price Calculator */}
            <JobPricingCalculator
              squareFootage={formData.square_footage || null}
              onPriceCalculated={(price) => {
                updateField('quoted_price', price);
                toast.success(`Quoted price set to ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)}`);
              }}
            />

            {/* Manual Price Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Quoted Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quoted_price || ''}
                  onChange={(e) => updateField('quoted_price', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Deposit Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount || ''}
                  onChange={(e) => updateField('deposit_amount', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer Notes</Label>
              <Textarea
                value={formData.customer_notes || ''}
                onChange={(e) => updateField('customer_notes', e.target.value)}
                rows={3}
                placeholder="Notes from the customer..."
              />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={formData.internal_notes || ''}
                onChange={(e) => updateField('internal_notes', e.target.value)}
                rows={3}
                placeholder="Internal team notes..."
              />
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.special_instructions || ''}
                onChange={(e) => updateField('special_instructions', e.target.value)}
                rows={3}
                placeholder="Any special instructions for the crew..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/power-washing/jobs/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
