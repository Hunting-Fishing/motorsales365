
import React from "react";
import { ArrowUpDown, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Column {
  id: string;
  name: string;
  label: string;
  visible: boolean;
}

export interface SortableColumnHeaderProps {
  column: Column;
  onSort?: () => void;
  onToggleVisibility?: (columnId: string) => void;
  key?: string;
}

export function SortableColumnHeader({ column, onSort, onToggleVisibility }: SortableColumnHeaderProps) {
  return (
    <div className="flex items-center">
      <Button 
        variant="ghost" 
        onClick={onSort} 
        className="h-8 px-2"
      >
        {column.label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      {onToggleVisibility && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(column.id)}
          className="ml-2 h-6 w-6 p-0"
        >
          <span className="sr-only">Toggle column visibility</span>
          <EyeOff className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
