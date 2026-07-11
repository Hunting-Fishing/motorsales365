import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useActiveModule } from '@/hooks/useModuleWorkTypes';
import { GunsmithWorkTypeSelect } from './GunsmithWorkTypeSelect';
import { GunsmithJobSelect } from './GunsmithJobSelect';
import { format } from 'date-fns';

interface AddTimesheetEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTimesheetEntryDialog({ open, onOpenChange }: AddTimesheetEntryDialogProps) {
  const { vessels, addEntry, isAdding } = useTimesheet();
  const activeModule = useActiveModule();
  const isGunsmith = activeModule === 'gunsmith';

  const [formData, setFormData] = useState({
    work_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 30,
    work_location_type: 'yard' as 'vessel' | 'yard' | 'shop' | 'office' | 'field',
    vessel_id: null as string | null,
    work_description: '',
    job_code: '',
    is_overtime: false,
    is_billable: true,
    notes: '',
    // Gunsmith-specific fields
    work_type_id: null as string | null,
    custom_work_type: '',
    gunsmith_job_id: null as string | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.work_description.trim()) {
      return;
    }

    // For gunsmith, require work type selection
    if (isGunsmith && !formData.work_type_id && !formData.custom_work_type.trim()) {
      return;
    }

    addEntry({
      work_date: formData.work_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_minutes: formData.break_minutes,
      work_location_type: formData.work_location_type,
      vessel_id: formData.vessel_id,
      work_order_id: null,
      work_description: formData.work_description,
      job_code: isGunsmith ? null : (formData.job_code || null),
      is_overtime: formData.is_overtime,
      is_billable: formData.is_billable,
      status: 'draft',
      submitted_at: null,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      notes: formData.notes || null,
      // Include gunsmith-specific fields
      ...(isGunsmith && {
        module_type: 'gunsmith',
        work_type_id: formData.work_type_id === 'other' ? null : formData.work_type_id,
        custom_work_type: formData.work_type_id === 'other' ? formData.custom_work_type : null,
        gunsmith_job_id: formData.gunsmith_job_id,
      }),
    } as any);

    // Reset form
    setFormData({
      work_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 30,
      work_location_type: 'yard',
      vessel_id: null,
      work_description: '',
      job_code: '',
      is_overtime: false,
      is_billable: true,
      notes: '',
      work_type_id: null,
      custom_work_type: '',
      gunsmith_job_id: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Timesheet Entry</DialogTitle>
          <DialogDescription>
            Log your work hours and assignment details
            {isGunsmith && ' - Gunsmith Module'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work_date">Work Date *</Label>
              <Input
                id="work_date"
                type="date"
                value={formData.work_date}
                onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                required
              />
            </div>

            {isGunsmith ? (
              // Gunsmith-specific: Work Type selector
              <GunsmithWorkTypeSelect
                value={formData.work_type_id}
                customValue={formData.custom_work_type}
                onValueChange={(workTypeId, customValue) => 
                  setFormData({ 
                    ...formData, 
                    work_type_id: workTypeId, 
                    custom_work_type: customValue 
                  })
                }
              />
            ) : (
              // Default: Location Type selector
              <div className="space-y-2">
                <Label htmlFor="work_location_type">Location Type *</Label>
                <Select
                  value={formData.work_location_type}
                  onValueChange={(value: any) => setFormData({ ...formData, work_location_type: value, vessel_id: value !== 'vessel' ? null : formData.vessel_id })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vessel">Vessel</SelectItem>
                    <SelectItem value="yard">Yard</SelectItem>
                    <SelectItem value="shop">Shop</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="field">Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Gunsmith: Job selector */}
          {isGunsmith && (
            <GunsmithJobSelect
              value={formData.gunsmith_job_id}
              onValueChange={(jobId) => setFormData({ ...formData, gunsmith_job_id: jobId })}
            />
          )}

          {/* Default modules: Vessel selector when vessel is selected */}
          {!isGunsmith && formData.work_location_type === 'vessel' && (
            <div className="space-y-2">
              <Label htmlFor="vessel_id">Vessel/Equipment</Label>
              <Select
                value={formData.vessel_id || ''}
                onValueChange={(value) => setFormData({ ...formData, vessel_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel or equipment" />
                </SelectTrigger>
                <SelectContent>
                  {vessels?.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name} {vessel.asset_number && `(${vessel.asset_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="break_minutes">Break (minutes)</Label>
              <Input
                id="break_minutes"
                type="number"
                min="0"
                max="480"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_description">Work Description *</Label>
            <Textarea
              id="work_description"
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              placeholder="Describe the work performed..."
              rows={3}
              required
            />
          </div>

          {/* Job Code - only for non-gunsmith modules */}
          {!isGunsmith && (
            <div className="space-y-2">
              <Label htmlFor="job_code">Job Code</Label>
              <Input
                id="job_code"
                value={formData.job_code}
                onChange={(e) => setFormData({ ...formData, job_code: e.target.value })}
                placeholder="Optional job/project code"
              />
            </div>
          )}

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_overtime"
                checked={formData.is_overtime}
                onCheckedChange={(checked) => setFormData({ ...formData, is_overtime: checked as boolean })}
              />
              <Label htmlFor="is_overtime" className="text-sm font-normal">
                Overtime
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_billable"
                checked={formData.is_billable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked as boolean })}
              />
              <Label htmlFor="is_billable" className="text-sm font-normal">
                Billable
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
