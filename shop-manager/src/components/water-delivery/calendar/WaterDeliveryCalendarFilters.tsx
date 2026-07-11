import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Filter, X, Route, Droplets, User, Truck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventType, EventStatus, EventPriority } from '@/hooks/water-delivery/useWaterDeliveryCalendarEvents';

interface FilterOption {
  id: string;
  label: string;
}

interface WaterDeliveryCalendarFiltersProps {
  drivers: FilterOption[];
  trucks: FilterOption[];
  selectedDrivers: string[];
  selectedTrucks: string[];
  selectedTypes: EventType[];
  selectedStatuses: EventStatus[];
  selectedPriorities: EventPriority[];
  onDriversChange: (ids: string[]) => void;
  onTrucksChange: (ids: string[]) => void;
  onTypesChange: (types: EventType[]) => void;
  onStatusesChange: (statuses: EventStatus[]) => void;
  onPrioritiesChange: (priorities: EventPriority[]) => void;
  onClearAll: () => void;
}

const typeOptions: { id: EventType; label: string; icon: React.ElementType }[] = [
  { id: 'route', label: 'Routes', icon: Route },
  { id: 'order', label: 'Orders', icon: Droplets },
];

const statusOptions: { id: EventStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { id: EventPriority; label: string; color: string }[] = [
  { id: 'emergency', label: 'Emergency', color: 'bg-red-500' },
  { id: 'high', label: 'High', color: 'bg-orange-500' },
  { id: 'normal', label: 'Normal', color: 'bg-cyan-500' },
  { id: 'low', label: 'Low', color: 'bg-gray-400' },
];

export function WaterDeliveryCalendarFilters({
  drivers,
  trucks,
  selectedDrivers,
  selectedTrucks,
  selectedTypes,
  selectedStatuses,
  selectedPriorities,
  onDriversChange,
  onTrucksChange,
  onTypesChange,
  onStatusesChange,
  onPrioritiesChange,
  onClearAll,
}: WaterDeliveryCalendarFiltersProps) {
  const totalFilters = 
    selectedDrivers.length + 
    selectedTrucks.length + 
    selectedTypes.length + 
    selectedStatuses.length + 
    selectedPriorities.length;

  const handleToggle = <T extends string>(
    value: T,
    selected: T[],
    onChange: (values: T[]) => void
  ) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Event Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Route className="h-4 w-4" />
            Type
            {selectedTypes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-2">
            {typeOptions.map(option => (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${option.id}`}
                  checked={selectedTypes.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id, selectedTypes, onTypesChange)}
                />
                <Label htmlFor={`type-${option.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Driver Filter */}
      {drivers.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <User className="h-4 w-4" />
              Driver
              {selectedDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedDrivers.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {drivers.map(driver => (
                <div key={driver.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`driver-${driver.id}`}
                    checked={selectedDrivers.includes(driver.id)}
                    onCheckedChange={() => handleToggle(driver.id, selectedDrivers, onDriversChange)}
                  />
                  <Label htmlFor={`driver-${driver.id}`} className="text-sm cursor-pointer">
                    {driver.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Truck Filter */}
      {trucks.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Truck className="h-4 w-4" />
              Truck
              {selectedTrucks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedTrucks.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {trucks.map(truck => (
                <div key={truck.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`truck-${truck.id}`}
                    checked={selectedTrucks.includes(truck.id)}
                    onCheckedChange={() => handleToggle(truck.id, selectedTrucks, onTrucksChange)}
                  />
                  <Label htmlFor={`truck-${truck.id}`} className="text-sm cursor-pointer">
                    {truck.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Priority Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Priority
            {selectedPriorities.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedPriorities.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-2">
            {priorityOptions.map(option => (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={`priority-${option.id}`}
                  checked={selectedPriorities.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id, selectedPriorities, onPrioritiesChange)}
                />
                <Label htmlFor={`priority-${option.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  <div className={cn('w-3 h-3 rounded', option.color)} />
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Status
            {selectedStatuses.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedStatuses.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-2">
            {statusOptions.map(option => (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${option.id}`}
                  checked={selectedStatuses.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id, selectedStatuses, onStatusesChange)}
                />
                <Label htmlFor={`status-${option.id}`} className="text-sm cursor-pointer capitalize">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All */}
      {totalFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1.5 text-muted-foreground">
          <X className="h-4 w-4" />
          Clear ({totalFilters})
        </Button>
      )}
    </div>
  );
}
