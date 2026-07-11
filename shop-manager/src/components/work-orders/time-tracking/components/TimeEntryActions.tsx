
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { TimeEntry } from "@/types/workOrder";

interface TimeEntryActionsProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
}

export function TimeEntryActions({ entry, onEdit, onDelete }: TimeEntryActionsProps) {
  return (
    <div className="flex justify-end space-x-2">
      <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onDelete(entry.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
