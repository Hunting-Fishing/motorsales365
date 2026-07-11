import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  X, 
  Search, 
  Save, 
  RotateCcw 
} from 'lucide-react';

interface FilterState {
  search: string;
  status: string[];
  priority: string[];
  technician: string[];
  dateRange: { from?: Date; to?: Date };
  category: string[];
  customer: string;
  vehicle: string;
}

const initialFilters: FilterState = {
  search: '',
  status: [],
  priority: [],
  technician: [],
  dateRange: {},
  category: [],
  customer: '',
  vehicle: ''
};

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-800' }
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const technicianOptions = [
  { value: 'john_smith', label: 'John Smith' },
  { value: 'sarah_johnson', label: 'Sarah Johnson' },
  { value: 'mike_wilson', label: 'Mike Wilson' },
  { value: 'emily_davis', label: 'Emily Davis' },
  { value: 'tom_anderson', label: 'Tom Anderson' }
];

const categoryOptions = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'warranty', label: 'Warranty' }
];

export function WorkOrderAdvancedFilters() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addToArrayFilter = (key: 'status' | 'priority' | 'technician' | 'category', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) 
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const removeFromArrayFilter = (key: 'status' | 'priority' | 'technician' | 'category', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters(initialFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    count += filters.status.length;
    count += filters.priority.length;
    count += filters.technician.length;
    count += filters.category.length;
    if (filters.customer) count++;
    if (filters.vehicle) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary">{getActiveFilterCount()} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {showFilters && (
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Work Orders</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by work order number, customer name, or description..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="From date"
                value={filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => updateFilter('dateRange', { 
                  ...filters.dateRange, 
                  from: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
              <Input
                type="date"
                placeholder="To date"
                value={filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => updateFilter('dateRange', { 
                  ...filters.dateRange, 
                  to: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(value) => addToArrayFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={filters.status.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.status.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.status.map((status) => {
                    const option = statusOptions.find(o => o.value === status);
                    return (
                      <Badge 
                        key={status} 
                        className={option?.color}
                        variant="secondary"
                      >
                        {option?.label}
                        <button
                          onClick={() => removeFromArrayFilter('status', status)}
                          className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select onValueChange={(value) => addToArrayFilter('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={filters.priority.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.priority.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.priority.map((priority) => {
                    const option = priorityOptions.find(o => o.value === priority);
                    return (
                      <Badge 
                        key={priority} 
                        className={option?.color}
                        variant="secondary"
                      >
                        {option?.label}
                        <button
                          onClick={() => removeFromArrayFilter('priority', priority)}
                          className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Technician Filter */}
            <div className="space-y-2">
              <Label>Technician</Label>
              <Select onValueChange={(value) => addToArrayFilter('technician', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {technicianOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={filters.technician.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.technician.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.technician.map((tech) => {
                    const option = technicianOptions.find(o => o.value === tech);
                    return (
                      <Badge key={tech} variant="secondary">
                        {option?.label}
                        <button
                          onClick={() => removeFromArrayFilter('technician', tech)}
                          className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(value) => addToArrayFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={filters.category.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.category.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.category.map((cat) => {
                    const option = categoryOptions.find(o => o.value === cat);
                    return (
                      <Badge key={cat} variant="secondary">
                        {option?.label}
                        <button
                          onClick={() => removeFromArrayFilter('category', cat)}
                          className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Customer and Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input
                placeholder="Customer name or email..."
                value={filters.customer}
                onChange={(e) => updateFilter('customer', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Input
                placeholder="Vehicle make, model, or VIN..."
                value={filters.vehicle}
                onChange={(e) => updateFilter('vehicle', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Filter Set
            </Button>
            <Button variant="outline" onClick={clearAllFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}