import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table } from 'lucide-react';

export type WorkOrdersListView = 'table' | 'cards';

interface WorkOrdersViewToggleProps {
  view: WorkOrdersListView;
  onChange: (view: WorkOrdersListView) => void;
  className?: string;
}

export function WorkOrdersViewToggle({ view, onChange, className }: WorkOrdersViewToggleProps) {
  return (
    <div className={`flex items-center gap-1 border rounded-lg p-1 bg-muted/50 ${className ?? ''}`}>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        className="h-8 px-3"
        aria-pressed={view === 'table'}
        aria-label="Table view"
      >
        <Table className="h-4 w-4 mr-2" />
        Table
      </Button>
      <Button
        variant={view === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('cards')}
        className="h-8 px-3"
        aria-pressed={view === 'cards'}
        aria-label="Cards view"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Cards
      </Button>
    </div>
  );
}
