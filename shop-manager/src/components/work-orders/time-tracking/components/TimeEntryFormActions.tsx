
import React from "react";
import { Button } from "@/components/ui/button";

interface TimeEntryFormActionsProps {
  isEditing: boolean;
  onCancel: () => void;
}

export function TimeEntryFormActions({ 
  isEditing, 
  onCancel 
}: TimeEntryFormActionsProps) {
  return (
    <div className="flex justify-end space-x-2 mt-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">
        {isEditing ? "Update Entry" : "Save Entry"}
      </Button>
    </div>
  );
}
