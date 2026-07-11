import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { format, isToday, isThisWeek } from "date-fns";
import type { TimeEntry } from "@/types/projectResource";
import type { Json } from "@/integrations/supabase/types";

interface ResourceTimeEntriesProps {
  assignmentId: string;
  entries: TimeEntry[];
  hourlyRate?: number;
  onUpdate: () => void;
}

export const ResourceTimeEntries = ({ 
  assignmentId, 
  entries, 
  hourlyRate = 0,
  onUpdate 
}: ResourceTimeEntriesProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ hours: 0, notes: '' });

  const handleEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditData({ hours: entry.hours, notes: entry.notes || '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ hours: 0, notes: '' });
  };

  const handleSaveEdit = async (entry: TimeEntry) => {
    try {
      const { data: assignment, error: fetchError } = await supabase
        .from('project_resource_assignments')
        .select('time_entries, actual_hours, actual_cost')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      const currentEntries = parseTimeEntries(assignment?.time_entries);
      const oldEntry = currentEntries.find((e) => e.id === entry.id);
      const hoursDiff = editData.hours - (oldEntry?.hours || 0);

      const updatedEntries = currentEntries.map((e) => 
        e.id === entry.id 
          ? { ...e, hours: editData.hours, notes: editData.notes.trim() || null }
          : e
      );

      const newActualHours = (assignment?.actual_hours || 0) + hoursDiff;
      const newActualCost = newActualHours * hourlyRate;

      const { error: updateError } = await supabase
        .from('project_resource_assignments')
        .update({
          time_entries: updatedEntries as unknown as Json,
          actual_hours: newActualHours,
          actual_cost: newActualCost,
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      toast.success('Time entry updated');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update time entry:', error);
      toast.error('Failed to update time entry');
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;

    try {
      const { data: assignment, error: fetchError } = await supabase
        .from('project_resource_assignments')
        .select('time_entries, actual_hours, actual_cost')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      const currentEntries = parseTimeEntries(assignment?.time_entries);
      const entryToDelete = currentEntries.find((e) => e.id === entryId);
      const hoursToRemove = entryToDelete?.hours || 0;

      const updatedEntries = currentEntries.filter((e) => e.id !== entryId);
      const newActualHours = Math.max(0, (assignment?.actual_hours || 0) - hoursToRemove);
      const newActualCost = newActualHours * hourlyRate;

      const { error: updateError } = await supabase
        .from('project_resource_assignments')
        .update({
          time_entries: updatedEntries as unknown as Json,
          actual_hours: newActualHours,
          actual_cost: newActualCost,
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      toast.success('Time entry deleted');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete time entry:', error);
      toast.error('Failed to delete time entry');
    }
  };

  const getEntryColor = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'bg-green-500/10 border-green-500/30';
    if (isThisWeek(date)) return 'bg-blue-500/10 border-blue-500/30';
    return 'bg-muted/50';
  };

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalCost = totalHours * hourlyRate;

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        No time entries logged
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          className={`flex items-center justify-between p-2 rounded border ${getEntryColor(entry.date)}`}
        >
          {editingId === entry.id ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                value={editData.hours}
                onChange={(e) => setEditData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                className="w-20 h-8"
              />
              <Input
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
                className="flex-1 h-8"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(entry)}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.hours}h</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(entry)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      
      <div className="flex justify-between items-center pt-2 border-t text-sm">
        <span className="text-muted-foreground">Total</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{totalHours}h</span>
          {hourlyRate > 0 && (
            <span className="text-muted-foreground">(${totalCost.toFixed(2)})</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to parse time entries from JSON
function parseTimeEntries(entries: Json | null): TimeEntry[] {
  if (!entries || !Array.isArray(entries)) return [];
  return entries.map((e: any) => ({
    id: e.id || '',
    date: e.date || '',
    hours: e.hours || 0,
    notes: e.notes || null,
    logged_by: e.logged_by,
    logged_at: e.logged_at || '',
  }));
}
