import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduling } from '@/hooks/useScheduling';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useShopId } from '@/hooks/useShopId';
import { differenceInDays } from 'date-fns';
import type { TimeOffType } from '@/types/scheduling';

interface AddTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTimeOffDialog({ open, onOpenChange }: AddTimeOffDialogProps) {
  const { createTimeOffRequest } = useScheduling();
  const { user } = useAuthUser();
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [timeOffTypes, setTimeOffTypes] = useState<TimeOffType[]>([]);
  const [formData, setFormData] = useState({
    time_off_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    if (open && shopId) {
      fetchTimeOffTypes();
    }
  }, [open, shopId]);

  const fetchTimeOffTypes = async () => {
    const { data, error } = await supabase
      .from('time_off_types')
      .select('*')
      .eq('shop_id', shopId);

    if (!error && data) {
      setTimeOffTypes(data);
    }
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const days = differenceInDays(
        new Date(formData.end_date),
        new Date(formData.start_date)
      ) + 1;
      return days;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      const totalDays = calculateDays();

      await createTimeOffRequest({
        ...formData,
        employee_id: user.id,
        total_days: totalDays,
        status: 'pending'
      });

      toast({
        title: 'Success',
        description: 'Time off request submitted'
      });

      onOpenChange(false);
      setFormData({
        time_off_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
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
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Time Off Type *</Label>
            <Select
              value={formData.time_off_type_id}
              onValueChange={(value) => setFormData({ ...formData, time_off_type_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {timeOffTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} {type.is_paid && '(Paid)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          {formData.start_date && formData.end_date && (
            <div className="text-sm text-muted-foreground">
              Total days: {calculateDays()}
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Optional reason for time off"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
