
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CollapsedServiceSelectorProps {
  onExpand: () => void;
  serviceCount: number;
}

export function CollapsedServiceSelector({ onExpand, serviceCount }: CollapsedServiceSelectorProps) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
      <Button 
        onClick={onExpand}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {serviceCount > 0 ? 'Add More Services' : 'Add Services'}
      </Button>
    </div>
  );
}
