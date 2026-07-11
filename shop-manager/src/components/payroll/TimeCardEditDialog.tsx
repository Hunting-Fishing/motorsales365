import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TimeCardEditDialogProps {
  timeCard: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function TimeCardEditDialog({ timeCard, open, onOpenChange, onSave }: TimeCardEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [clockInTime, setClockInTime] = useState(
    format(new Date(timeCard.clock_in_time), "yyyy-MM-dd'T'HH:mm")
  );
  const [clockOutTime, setClockOutTime] = useState(
    timeCard.clock_out_time 
      ? format(new Date(timeCard.clock_out_time), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [status, setStatus] = useState(timeCard.status);
  const [notes, setNotes] = useState(timeCard.notes || '');
  const [hourlyRate, setHourlyRate] = useState(timeCard.hourly_rate?.toString() || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const clockIn = new Date(clockInTime);
      const clockOut = clockOutTime ? new Date(clockOutTime) : null;
      
      let totalHours = null;
      let regularHours = null;
      let overtimeHours = null;
      let totalPay = null;

      if (clockOut) {
        totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        regularHours = Math.min(totalHours, 8);
        overtimeHours = Math.max(0, totalHours - 8);
        
        if (hourlyRate) {
          const rate = parseFloat(hourlyRate);
          totalPay = (regularHours * rate) + (overtimeHours * rate * 1.5);
        }
      }

      const { error } = await supabase
        .from('time_card_entries')
        .update({
          clock_in_time: clockIn.toISOString(),
          clock_out_time: clockOut?.toISOString() || null,
          status,
          notes,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          total_hours: totalHours,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          total_pay: totalPay,
        })
        .eq('id', timeCard.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Time card updated successfully',
      });
      onSave();
    } catch (error: any) {
      console.error('Error updating time card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Time Card</DialogTitle>
          <DialogDescription>
            Make changes to this time card entry
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="clockIn">Clock In Time</Label>
            <Input
              id="clockIn"
              type="datetime-local"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clockOut">Clock Out Time</Label>
            <Input
              id="clockOut"
              type="datetime-local"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              placeholder="25.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
