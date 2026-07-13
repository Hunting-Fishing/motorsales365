import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, X, Filter } from 'lucide-react';

export function AdvancedFilters() {
  const [filters, setFilters] = useState({
    status: '',
    joinDate: null,
    skillLevel: '',
    workSchedule: '',
    location: ''
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    if (value && !activeFilters.includes(key)) {
      setActiveFilters(prev => [...prev, key]);
    } else if (!value && activeFilters.includes(key)) {
      setActiveFilters(prev => prev.filter(f => f !== key));
    }
  };

  const clearFilter = (key: string) => {
    handleFilterChange(key, '');
  };

  const clearAllFilters = () => {
    setFilters({
      status: '',
      joinDate: null,
      skillLevel: '',
      workSchedule: '',
      location: ''
    });
    setActiveFilters([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Advanced Filters
        </h4>
        {activeFilters.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filterKey) => (
            <Badge key={filterKey} variant="secondary" className="gap-1">
              {filterKey}: {filters[filterKey as keyof typeof filters] || 'Selected'}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => clearFilter(filterKey)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Join Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                {filters.joinDate ? filters.joinDate.toDateString() : 'Any Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.joinDate}
                onSelect={(date) => handleFilterChange('joinDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skillLevel">Skill Level</Label>
          <Select value={filters.skillLevel} onValueChange={(value) => handleFilterChange('skillLevel', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Level</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workSchedule">Work Schedule</Label>
          <Select value={filters.workSchedule} onValueChange={(value) => handleFilterChange('workSchedule', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Schedule</SelectItem>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Location</SelectItem>
              <SelectItem value="main_office">Main Office</SelectItem>
              <SelectItem value="branch_1">Branch 1</SelectItem>
              <SelectItem value="branch_2">Branch 2</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="field">Field Work</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Filter Options */}
      <div className="space-y-3 pt-4 border-t">
        <h5 className="font-medium text-sm">Additional Options</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="has_certifications" />
            <Label htmlFor="has_certifications" className="text-sm">Has Certifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="is_manager" />
            <Label htmlFor="is_manager" className="text-sm">Is Manager</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="recently_hired" />
            <Label htmlFor="recently_hired" className="text-sm">Recently Hired (30 days)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="pending_review" />
            <Label htmlFor="pending_review" className="text-sm">Pending Review</Label>
          </div>
        </div>
      </div>
    </div>
  );
}