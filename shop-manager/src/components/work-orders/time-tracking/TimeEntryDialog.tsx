import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface TimeEntryDialogProps {
  workOrderId: string;
  onTimeEntryAdded: () => void;
  isEditMode: boolean;
  children?: React.ReactNode;
}

export function TimeEntryDialog({ 
  workOrderId, 
  onTimeEntryAdded, 
  isEditMode,
  children 
}: TimeEntryDialogProps) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_name: '',
    start_time: '',
    end_time: '',
    duration: 0,
    notes: '',
    billable: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode) return;

    setIsSubmitting(true);
    try {
      // Calculate duration if not set
      let duration = formData.duration;
      if (formData.start_time && formData.end_time && !duration) {
        const start = new Date(`2023-01-01T${formData.start_time}`);
        const end = new Date(`2023-01-01T${formData.end_time}`);
        duration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
      }

      const { error } = await supabase.rpc('insert_work_order_time_entry', {
        p_work_order_id: workOrderId,
        p_employee_id: user?.id || '',
        p_employee_name: formData.employee_name || user?.email || 'Unknown User',
        p_start_time: formData.start_time,
        p_end_time: formData.end_time,
        p_duration: Math.round(duration),
        p_notes: formData.notes,
        p_billable: formData.billable
      });

      if (error) throw error;

      toast.success('Time entry added successfully');
      setOpen(false);
      setFormData({
        employee_name: '',
        start_time: '',
        end_time: '',
        duration: 0,
        notes: '',
        billable: true
      });
      onTimeEntryAdded();
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error('Failed to add time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trigger = children || (
    <Button size="sm" disabled={!isEditMode} className="gap-2">
      <Plus className="h-4 w-4" />
      Add Time Entry
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Add Time Entry
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_name">Employee Name</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
                placeholder="Enter employee name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Entry Type</Label>
              <Select 
                value={formData.billable ? "billable" : "non-billable"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, billable: value === "billable" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billable">Billable</SelectItem>
                  <SelectItem value="non-billable">Non-billable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              step="15"
              value={formData.duration || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
              placeholder="Auto-calculated from start/end time"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this time entry..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isEditMode}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Add Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}