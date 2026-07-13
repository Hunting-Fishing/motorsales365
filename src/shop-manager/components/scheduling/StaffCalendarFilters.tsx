import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, X, Ship, Wrench, Truck, Users } from 'lucide-react';
import { StaffCalendarFilters as FiltersType, EmployeeOption, AssetOption, ASSET_TYPE_COLORS } from '@/types/staffScheduleCalendar';

interface StaffCalendarFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  employees: EmployeeOption[];
  vessels: AssetOption[];
  equipment: AssetOption[];
  vehicles: AssetOption[];
}

export function StaffCalendarFilters({
  filters,
  onFiltersChange,
  employees,
  vessels,
  equipment,
  vehicles,
}: StaffCalendarFiltersProps) {
  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleEmployee = (employeeId: string) => {
    const newIds = filters.employeeIds.includes(employeeId)
      ? filters.employeeIds.filter(id => id !== employeeId)
      : [...filters.employeeIds, employeeId];
    updateFilter('employeeIds', newIds);
  };

  const toggleAssetType = (type: 'vessel' | 'equipment' | 'vehicle') => {
    const newTypes = filters.assetTypes.includes(type)
      ? filters.assetTypes.filter(t => t !== type)
      : [...filters.assetTypes, type];
    updateFilter('assetTypes', newTypes);
  };

  const toggleAsset = (assetId: string) => {
    const newIds = filters.assetIds.includes(assetId)
      ? filters.assetIds.filter(id => id !== assetId)
      : [...filters.assetIds, assetId];
    updateFilter('assetIds', newIds);
  };

  const clearFilters = () => {
    onFiltersChange({
      employeeIds: [],
      assetTypes: [],
      assetIds: [],
      statuses: [],
      searchQuery: '',
    });
  };

  const activeFilterCount = 
    filters.employeeIds.length + 
    filters.assetTypes.length + 
    filters.assetIds.length + 
    filters.statuses.length +
    (filters.searchQuery ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees, assets..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Employees
            {filters.employeeIds.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.employeeIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {employees.map((employee) => (
              <label
                key={employee.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-1"
              >
                <Checkbox
                  checked={filters.employeeIds.includes(employee.id)}
                  onCheckedChange={() => toggleEmployee(employee.id)}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: employee.color }}
                />
                <span className="text-sm">{employee.name}</span>
              </label>
            ))}
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No employees found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Asset Type Filter */}
      <div className="flex items-center gap-1">
        <Button
          variant={filters.assetTypes.includes('vessel') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleAssetType('vessel')}
          className="gap-1"
        >
          <Ship className="h-4 w-4" />
          Vessels
        </Button>
        <Button
          variant={filters.assetTypes.includes('equipment') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleAssetType('equipment')}
          className="gap-1"
        >
          <Wrench className="h-4 w-4" />
          Equipment
        </Button>
        <Button
          variant={filters.assetTypes.includes('vehicle') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleAssetType('vehicle')}
          className="gap-1"
        >
          <Truck className="h-4 w-4" />
          Vehicles
        </Button>
      </div>

      {/* Specific Asset Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Assets
            {filters.assetIds.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.assetIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {vessels.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="h-4 w-4" style={{ color: ASSET_TYPE_COLORS.vessel }} />
                  <span className="text-sm font-medium">Vessels</span>
                </div>
                {vessels.map((vessel) => (
                  <label
                    key={vessel.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-1 ml-4"
                  >
                    <Checkbox
                      checked={filters.assetIds.includes(vessel.id)}
                      onCheckedChange={() => toggleAsset(vessel.id)}
                    />
                    <span className="text-sm">{vessel.name}</span>
                  </label>
                ))}
              </div>
            )}
            {equipment.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4" style={{ color: ASSET_TYPE_COLORS.equipment }} />
                  <span className="text-sm font-medium">Equipment</span>
                </div>
                {equipment.map((equip) => (
                  <label
                    key={equip.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-1 ml-4"
                  >
                    <Checkbox
                      checked={filters.assetIds.includes(equip.id)}
                      onCheckedChange={() => toggleAsset(equip.id)}
                    />
                    <span className="text-sm">{equip.name}</span>
                  </label>
                ))}
              </div>
            )}
            {vehicles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4" style={{ color: ASSET_TYPE_COLORS.vehicle }} />
                  <span className="text-sm font-medium">Vehicles</span>
                </div>
                {vehicles.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-1 ml-4"
                  >
                    <Checkbox
                      checked={filters.assetIds.includes(vehicle.id)}
                      onCheckedChange={() => toggleAsset(vehicle.id)}
                    />
                    <span className="text-sm">{vehicle.name}</span>
                  </label>
                ))}
              </div>
            )}
            {vessels.length === 0 && equipment.length === 0 && vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No assets found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Select
        value={filters.statuses[0] || 'all'}
        onValueChange={(value) => updateFilter('statuses', value === 'all' ? [] : [value])}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
