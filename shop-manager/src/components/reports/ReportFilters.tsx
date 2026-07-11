
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarRange, Filter, Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, isValid, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  timeframe: string;
  setTimeframe: (value: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  onFilterChange: (filters: Record<string, any>) => void;
}

export function ReportFilters({ 
  timeframe, 
  setTimeframe, 
  dateRange, 
  setDateRange,
  onFilterChange
}: ReportFiltersProps) {
  const [isAdvancedFilters, setIsAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: "all",
    location: "all",
    includeInactive: false
  });

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Set default date range (last 30 days)
  const setDefaultDateRange = () => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);
    setDateRange({ from: lastMonth, to: today });
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <Select 
            value={timeframe}
            onValueChange={(value) => setTimeframe(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {timeframe === "custom" && (
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => !dateRange && setDefaultDateRange()}
                  >
                    <CalendarRange className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setIsAdvancedFilters(!isAdvancedFilters)}
          >
            <Filter className="h-4 w-4" />
            {isAdvancedFilters ? "Hide Filters" : "Advanced Filters"}
          </Button>
        </div>
      </div>
      
      {isAdvancedFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/20">
          <div>
            <label className="text-sm font-medium">Department</label>
            <Select 
              value={filters.department} 
              onValueChange={(value) => handleFilterChange("department", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="parts">Parts</SelectItem>
                <SelectItem value="admin">Administration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Location</label>
            <Select 
              value={filters.location} 
              onValueChange={(value) => handleFilterChange("location", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="main">Main Shop</SelectItem>
                <SelectItem value="north">North Branch</SelectItem>
                <SelectItem value="south">South Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 pt-6">
            <input 
              type="checkbox" 
              id="includeInactive" 
              className="rounded border-gray-300"
              checked={filters.includeInactive}
              onChange={(e) => handleFilterChange("includeInactive", e.target.checked)}
            />
            <label htmlFor="includeInactive" className="text-sm">Include inactive accounts</label>
          </div>
        </div>
      )}
    </div>
  );
}
