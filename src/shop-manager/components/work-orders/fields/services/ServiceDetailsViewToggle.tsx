
import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutList, LayoutGrid } from 'lucide-react';

interface ServiceDetailsViewToggleProps {
  viewMode: 'list' | 'cards';
  onViewModeChange: (mode: 'list' | 'cards') => void;
}

export function ServiceDetailsViewToggle({ viewMode, onViewModeChange }: ServiceDetailsViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="h-8 px-3"
      >
        <LayoutList className="h-4 w-4 mr-2" />
        List View
      </Button>
      <Button
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('cards')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Card View
      </Button>
    </div>
  );
}
