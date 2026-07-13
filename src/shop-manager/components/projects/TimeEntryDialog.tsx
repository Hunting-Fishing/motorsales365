import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TimeEntryDialogProps {
  assignmentId: string;
  resourceName: string;
  hourlyRate?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TimeEntryDialog = ({ 
  assignmentId, 
  resourceName,
  hourlyRate = 0,
  open, 
  onOpenChange,
  onSuccess,
}: TimeEntryDialogProps) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast.error('Please enter valid hours');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current assignment data
      const { data: assignment, error: fetchError } = await supabase
        .from('project_resource_assignments')
        .select('actual_hours, actual_cost, time_entries')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      // Create new time entry
      const newEntry = {
        id: crypto.randomUUID(),
        date,
        hours: hoursNum,
        notes: notes.trim() || null,
        logged_by: user?.id,
        logged_at: new Date().toISOString(),
      };

      const currentEntries = Array.isArray(assignment.time_entries) ? assignment.time_entries : [];
      const updatedEntries = [...currentEntries, newEntry];
      const newActualHours = (assignment.actual_hours || 0) + hoursNum;
      const newActualCost = newActualHours * hourlyRate;

      // Update assignment
      const { error: updateError } = await supabase
        .from('project_resource_assignments')
        .update({
          actual_hours: newActualHours,
          actual_cost: newActualCost,
          time_entries: updatedEntries,
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      toast.success('Time entry logged');
      onSuccess();
      onOpenChange(false);
      setHours('');
      setNotes('');
    } catch (error) {
      console.error('Failed to log time:', error);
      toast.error('Failed to log time entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{resourceName}</p>
            {hourlyRate > 0 && (
              <p className="text-xs text-muted-foreground">
                Rate: ${hourlyRate.toFixed(2)}/hr
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-date">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="entry-hours">Hours</Label>
            <Input
              id="entry-hours"
              type="number"
              step="0.5"
              min="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter hours worked"
            />
            {hours && hourlyRate > 0 && (
              <p className="text-xs text-muted-foreground">
                Cost: ${(parseFloat(hours) * hourlyRate).toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-notes">Notes (optional)</Label>
            <Textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was worked on?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hours}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
