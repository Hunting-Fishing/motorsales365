import { Search, Filter, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { BudgetFilters, BudgetPeriodFilter, BudgetStatusFilter } from "@/hooks/useBudgetFilters";

interface BudgetFiltersBarProps {
  filters: BudgetFilters;
  onUpdateFilter: <K extends keyof BudgetFilters>(key: K, value: BudgetFilters[K]) => void;
  onResetFilters: () => void;
  resultCount: number;
}

export function BudgetFiltersBar({
  filters,
  onUpdateFilter,
  onResetFilters,
  resultCount,
}: BudgetFiltersBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.period !== 'all' ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.dateRange.start ||
    filters.dateRange.end;

  return (
    <div className="space-y-4">
      {/* Main Search and Filters Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search budgets by name or description..."
            value={filters.search}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2">
          {/* Period Filter */}
          <Select
            value={filters.period}
            onValueChange={(value) => onUpdateFilter('period', value as BudgetPeriodFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => onUpdateFilter('status', value as BudgetStatusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="exceeded">Exceeded</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.category}
            onValueChange={(value) => onUpdateFilter('category', value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="safety">Safety & PPE</SelectItem>
              <SelectItem value="tools">Tools & Equipment</SelectItem>
              <SelectItem value="fuels">Fuels & Lubricants</SelectItem>
              <SelectItem value="parts">Parts & Materials</SelectItem>
              <SelectItem value="maintenance">Maintenance Services</SelectItem>
              <SelectItem value="fleet">Fleet & Vehicles</SelectItem>
              <SelectItem value="marine">Marine Equipment</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {filters.dateRange.start ? (
                  filters.dateRange.end ? (
                    <span className="text-xs">
                      {format(filters.dateRange.start, "MMM d")} - {format(filters.dateRange.end, "MMM d")}
                    </span>
                  ) : (
                    format(filters.dateRange.start, "MMM d, yyyy")
                  )
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{
                  from: filters.dateRange.start || undefined,
                  to: filters.dateRange.end || undefined,
                }}
                onSelect={(range) => {
                  onUpdateFilter('dateRange', {
                    start: range?.from || null,
                    end: range?.to || null,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onResetFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters & Results Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter('search', '')}
              />
            </Badge>
          )}
          {filters.period !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {filters.period}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter('period', 'all')}
              />
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter('status', 'all')}
              />
            </Badge>
          )}
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter('category', 'all')}
              />
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {resultCount} budget{resultCount !== 1 ? 's' : ''} found
        </span>
      </div>
    </div>
  );
}
