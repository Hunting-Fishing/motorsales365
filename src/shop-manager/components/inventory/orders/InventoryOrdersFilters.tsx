
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface InventoryOrdersFiltersProps {
  statusFilter: string[];
  setStatusFilter: (value: string[]) => void;
  supplierFilter: string;
  setSupplierFilter: (value: string) => void;
  dateRangeFilter: {from?: Date, to?: Date};
  setDateRangeFilter: (value: {from?: Date, to?: Date}) => void;
}

export function InventoryOrdersFilters({
  statusFilter,
  setStatusFilter,
  supplierFilter,
  setSupplierFilter,
  dateRangeFilter,
  setDateRangeFilter
}: InventoryOrdersFiltersProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(dateRangeFilter.from);
  const [toDate, setToDate] = useState<Date | undefined>(dateRangeFilter.to);

  const statusOptions = [
    { id: 'ordered', label: 'Ordered' },
    { id: 'partially received', label: 'Partially Received' },
    { id: 'received', label: 'Received' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const handleStatusChange = (checked: boolean | string, statusId: string) => {
    if (checked) {
      setStatusFilter([...statusFilter, statusId]);
    } else {
      setStatusFilter(statusFilter.filter(id => id !== statusId));
    }
  };

  const handleFromDateChange = (date?: Date) => {
    setFromDate(date);
    setDateRangeFilter({ ...dateRangeFilter, from: date });
  };

  const handleToDateChange = (date?: Date) => {
    setToDate(date);
    setDateRangeFilter({ ...dateRangeFilter, to: date });
  };

  const handleClearFilters = () => {
    setStatusFilter([]);
    setSupplierFilter('');
    setDateRangeFilter({});
    setFromDate(undefined);
    setToDate(undefined);
  };

  return (
    <Card className="p-4 bg-white shadow-sm border border-gray-100 rounded-xl">
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <div key={status.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`status-${status.id}`} 
                  checked={statusFilter.includes(status.id)} 
                  onCheckedChange={(checked) => handleStatusChange(checked, status.id)}
                />
                <Label 
                  htmlFor={`status-${status.id}`} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 min-w-[200px]">
          <Label htmlFor="supplierFilter">Supplier</Label>
          <Input
            id="supplierFilter"
            placeholder="Filter by supplier"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label>Order Date</Label>
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[130px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP") : <span>From date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[130px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP") : <span>To date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="ml-auto"
          onClick={handleClearFilters}
        >
          Clear Filters
        </Button>
      </div>
    </Card>
  );
}
