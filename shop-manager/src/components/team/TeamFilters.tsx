import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTeamFilterData } from '@/hooks/team/useTeamFilterData';
import { 
  Users, 
  Filter, 
  Search, 
  X, 
  RotateCcw,
  UserCheck,
  MapPin,
  Briefcase,
  Loader2
} from 'lucide-react';

interface TeamFilter {
  searchTerm: string;
  departments: string[];
  roles: string[];
  locations: string[];
  conditions: {
    isActive: boolean;
    isRemote: boolean;
    isContractor: boolean;
  };
}

const defaultFilter: TeamFilter = {
  searchTerm: '',
  departments: [],
  roles: [],
  locations: [],
  conditions: {
    isActive: false,
    isRemote: false,
    isContractor: false,
  },
};


interface TeamFiltersProps {
  onFilterChange: (filter: TeamFilter) => void;
  className?: string;
}

export function TeamFilters({ onFilterChange, className }: TeamFiltersProps) {
  const [filter, setFilter] = useState<TeamFilter>(defaultFilter);
  const { filterData, isLoading, error } = useTeamFilterData();

  const updateFilter = (updates: Partial<TeamFilter>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const updateConditions = (conditionUpdates: Partial<TeamFilter['conditions']>) => {
    updateFilter({
      conditions: { ...filter.conditions, ...conditionUpdates }
    });
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const resetFilters = () => {
    setFilter(defaultFilter);
    onFilterChange(defaultFilter);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filter.searchTerm) count++;
    if (filter.departments.length) count++;
    if (filter.roles.length) count++;
    if (filter.locations.length) count++;
    if (Object.values(filter.conditions).some(Boolean)) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Team Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount} active
              </Badge>
            )}
          </CardTitle>
          {activeCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="space-y-2">
          <Label>Quick Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, department..."
              value={filter.searchTerm}
              onChange={(e) => updateFilter({ searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Status Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <Label className="text-sm">Active Only</Label>
            </div>
            <Switch
              checked={filter.conditions.isActive}
              onCheckedChange={(checked) => updateConditions({ isActive: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <Label className="text-sm">Remote</Label>
            </div>
            <Switch
              checked={filter.conditions.isRemote}
              onCheckedChange={(checked) => updateConditions({ isRemote: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-500" />
              <Label className="text-sm">Contractors</Label>
            </div>
            <Switch
              checked={filter.conditions.isContractor}
              onCheckedChange={(checked) => updateConditions({ isContractor: checked })}
            />
          </div>
        </div>

        {/* Departments */}
        <div className="space-y-2">
          <Label>Departments</Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[3rem]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading departments...
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load departments</div>
            ) : filterData.departments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No departments found</div>
            ) : (
              filterData.departments.map(dept => (
              <Badge
                key={dept}
                variant={filter.departments.includes(dept) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateFilter({
                  departments: toggleArrayValue(filter.departments, dept)
                })}
              >
                {dept}
                {filter.departments.includes(dept) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
              ))
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[3rem]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roles...
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load roles</div>
            ) : filterData.roles.length === 0 ? (
              <div className="text-sm text-muted-foreground">No roles found</div>
            ) : (
              filterData.roles.map(role => (
              <Badge
                key={role}
                variant={filter.roles.includes(role) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateFilter({
                  roles: toggleArrayValue(filter.roles, role)
                })}
              >
                {role}
                {filter.roles.includes(role) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
              ))
            )}
          </div>
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <Label>Locations</Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[3rem]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading locations...
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load locations</div>
            ) : filterData.locations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No locations found</div>
            ) : (
              filterData.locations.map(location => (
              <Badge
                key={location}
                variant={filter.locations.includes(location) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateFilter({
                  locations: toggleArrayValue(filter.locations, location)
                })}
              >
                {location}
                {filter.locations.includes(location) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}