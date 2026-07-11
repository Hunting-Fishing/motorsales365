
import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

interface ServiceViewModeToggleProps {
  viewMode: 'enhanced' | 'compact';
  onViewModeChange: (mode: 'enhanced' | 'compact') => void;
}

export function ServiceViewModeToggle({ viewMode, onViewModeChange }: ServiceViewModeToggleProps) {
  const handleViewModeChange = (mode: 'enhanced' | 'compact') => {
    console.log('ServiceViewModeToggle clicked:', { currentMode: viewMode, newMode: mode });
    onViewModeChange(mode);
  };

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={viewMode === 'enhanced' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleViewModeChange('enhanced')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Enhanced View
      </Button>
      <Button
        variant={viewMode === 'compact' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleViewModeChange('compact')}
        className="h-8 px-3"
      >
        <List className="h-4 w-4 mr-2" />
        Compact View
      </Button>
    </div>
  );
}
