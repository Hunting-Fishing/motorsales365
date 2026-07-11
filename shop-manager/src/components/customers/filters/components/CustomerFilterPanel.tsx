
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { CustomerFilters } from '../CustomerFilterControls';
import { CustomerFilterTags } from './CustomerFilterTags';
import { CustomerVehicleTypeFilter } from './CustomerVehicleTypeFilter';
import { CustomerDateRangeFilter } from './CustomerDateRangeFilter';
import { CustomerHasVehiclesFilter } from './CustomerHasVehiclesFilter';
import { SavedSearches } from '../SavedSearches';

interface CustomerFilterPanelProps {
  filters: CustomerFilters;
  onTagsChange: (tags: string[]) => void;
  onVehicleTypeChange: (type: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onHasVehiclesChange: (value: string) => void;
  onApplySearch: (filters: CustomerFilters) => void;
}

export const CustomerFilterPanel: React.FC<CustomerFilterPanelProps> = ({
  filters,
  onTagsChange,
  onVehicleTypeChange,
  onDateRangeChange,
  onHasVehiclesChange,
  onApplySearch
}) => {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Customer Tags</h3>
            <CustomerFilterTags
              tags={filters.tags || []}
              onChange={onTagsChange}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="text-sm font-medium mb-2">Vehicle Type</h3>
            <CustomerVehicleTypeFilter
              vehicleType={filters.vehicleType || ''}
              onChange={onVehicleTypeChange}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="text-sm font-medium mb-2">Has Vehicles</h3>
            <CustomerHasVehiclesFilter
              hasVehicles={filters.hasVehicles || ''}
              onChange={onHasVehiclesChange}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Date Added</h3>
            <CustomerDateRangeFilter
              dateRange={filters.dateRange}
              onDateRangeChange={onDateRangeChange}
            />
          </div>
          
          <Separator className="my-4" />
          
          <SavedSearches
            currentFilters={filters}
            onApplySearch={onApplySearch}
          />
        </div>
      </div>
    </Card>
  );
};
