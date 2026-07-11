import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Copy, Clock, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ScheduleBulkActionsProps {
  selectedSchedules: string[];
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkCopy: (dayOffset: number) => void;
  onBulkUpdateTime: (shiftStart: string, shiftEnd: string) => void;
}

export function ScheduleBulkActions({
  selectedSchedules,
  onClearSelection,
  onBulkDelete,
  onBulkCopy,
  onBulkUpdateTime
}: ScheduleBulkActionsProps) {
  if (selectedSchedules.length === 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedSchedules.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy to Another Day */}
          <Select onValueChange={(value) => onBulkCopy(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <Copy className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Copy to day..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>

          {/* Delete */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={onBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
