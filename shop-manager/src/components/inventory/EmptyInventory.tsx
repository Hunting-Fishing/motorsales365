
import React from 'react';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyInventoryProps {
  searchQuery?: string;
  filtersActive?: boolean;
  onReset?: () => void;
}

export const EmptyInventory: React.FC<EmptyInventoryProps> = ({ 
  searchQuery, 
  filtersActive,
  onReset
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-lg bg-gray-50">
      <Package className="h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-xl font-medium text-gray-800 mb-2">No inventory items found</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">
        {searchQuery || filtersActive ? (
          `No items match your current ${searchQuery ? 'search' : ''} ${searchQuery && filtersActive ? 'or' : ''} ${filtersActive ? 'filter' : ''} criteria.`
        ) : (
          'Your inventory database is empty. Add real inventory items to start managing your business inventory.'
        )}
      </p>
      <div className="flex gap-4">
        {(searchQuery || filtersActive) && onReset && (
          <Button 
            variant="outline" 
            onClick={onReset}
          >
            Reset Filters
          </Button>
        )}
        <Button 
          onClick={() => window.location.href = "/inventory/add"}
        >
          Add Inventory Item
        </Button>
      </div>
    </div>
  );
};
