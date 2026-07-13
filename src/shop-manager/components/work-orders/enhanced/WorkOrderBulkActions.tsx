import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserCheck, Calendar, MoreVertical, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WorkOrderBulkActionsProps {
  selectedOrders: string[];
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkAssign: (technicianId: string) => void;
  onBulkDelete: () => void;
  technicians: Array<{ id: string; name: string }>;
}

export function WorkOrderBulkActions({
  selectedOrders,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkAssign,
  onBulkDelete,
  technicians
}: WorkOrderBulkActionsProps) {
  if (selectedOrders.length === 0) return null;

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedOrders.length} selected
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
        
        <div className="flex items-center gap-2">
          {/* Status Update */}
          <Select onValueChange={onBulkStatusUpdate}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assign Technician */}
          <Select onValueChange={onBulkAssign}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Assign To" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* More Actions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48">
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={onBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}