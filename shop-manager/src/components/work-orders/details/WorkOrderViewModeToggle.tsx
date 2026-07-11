import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkOrderViewMode = 'tabbed' | 'detailed';

interface WorkOrderViewModeToggleProps {
  mode: WorkOrderViewMode;
  onModeChange: (mode: WorkOrderViewMode) => void;
  className?: string;
}

export function WorkOrderViewModeToggle({ 
  mode, 
  onModeChange, 
  className 
}: WorkOrderViewModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 border rounded-lg p-1 bg-muted/50 w-full", className)}>
      <Button
        variant={mode === 'tabbed' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('tabbed')}
        className="h-10 px-3 flex-1 min-h-[44px]"
      >
        <LayoutGrid className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Tabbed View</span>
      </Button>
      <Button
        variant={mode === 'detailed' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('detailed')}
        className="h-10 px-3 flex-1 min-h-[44px]"
      >
        <FileText className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Detailed Form</span>
      </Button>
    </div>
  );
}