
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter, RotateCcw, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InvoiceFilters as InvoiceFiltersType } from "@/types/invoice";

interface InvoiceFiltersProps {
  filters: InvoiceFiltersType;
  onFilterChange: (filters: InvoiceFiltersType) => void;
}

export function InvoiceFilters({ filters, onFilterChange }: InvoiceFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFilterChange({
      ...filters,
      status
    });
  };

  const handleSearchChange = (search: string) => {
    onFilterChange({
      ...filters,
      search
    });
  };

  const handleDateRangeChange = (dateRange: string) => {
    onFilterChange({
      ...filters,
      dateRange
    });
  };

  const handleCustomerChange = (customer: string) => {
    onFilterChange({
      ...filters,
      customer
    });
  };

  const resetFilters = () => {
    onFilterChange({
      status: 'all',
      dateRange: 'all',
      search: '',
      customer: 'all'
    });
  };

  const isFiltered = filters.status !== 'all' || 
                   filters.dateRange !== 'all' || 
                   filters.search !== '' || 
                   (filters.customer && filters.customer !== 'all');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Date Range</label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.customer && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <Select value={filters.customer} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isFiltered && (
          <Button 
            onClick={resetFilters}
            variant="outline" 
            className="w-full"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
