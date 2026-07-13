import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduling } from '@/hooks/useScheduling';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';

interface AddScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function AddScheduleDialog({ open, onOpenChange }: AddScheduleDialogProps) {
  const { createSchedule } = useScheduling();
  const { teamMembers } = useTeamMembers();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    schedule_name: '',
    day_of_week: '',
    shift_start: '09:00',
    shift_end: '17:00',
    effective_from: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createSchedule({
        ...formData,
        day_of_week: parseInt(formData.day_of_week)
      });

      toast({
        title: 'Success',
        description: 'Schedule added successfully'
      });

      onOpenChange(false);
      setFormData({
        employee_id: '',
        schedule_name: '',
        day_of_week: '',
        shift_start: '09:00',
        shift_end: '17:00',
        effective_from: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add schedule',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Work Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Schedule Name</Label>
            <Input
              value={formData.schedule_name}
              onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
              placeholder="e.g., Morning Shift"
            />
          </div>

          <div className="space-y-2">
            <Label>Day of Week *</Label>
            <Select
              value={formData.day_of_week}
              onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.shift_start}
                onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.shift_end}
                onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Effective From *</Label>
            <Input
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
