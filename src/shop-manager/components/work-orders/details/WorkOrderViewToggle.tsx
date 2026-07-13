
import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, FileText } from 'lucide-react';

interface WorkOrderViewToggleProps {
  view: 'detailed' | 'invoice';
  onViewChange: (view: 'detailed' | 'invoice') => void;
}

export function WorkOrderViewToggle({ view, onViewChange }: WorkOrderViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={view === 'detailed' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('detailed')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Detailed View
      </Button>
      <Button
        variant={view === 'invoice' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('invoice')}
        className="h-8 px-3"
      >
        <FileText className="h-4 w-4 mr-2" />
        Invoice View
      </Button>
    </div>
  );
}
