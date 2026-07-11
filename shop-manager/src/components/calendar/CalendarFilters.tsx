import { Filter, RefreshCw, Clock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { getMaintenanceTechnicians, getUniqueEquipment } from "@/services/calendar/calendarFilterService";
import { statusMap } from "@/types/workOrder";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BusinessHoursInfo } from "./BusinessHoursInfo";

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface CalendarFiltersProps {
  technicianFilter: string;
  setTechnicianFilter: (technician: string) => void;
  statusFilter: string[];
  setStatusFilter: (status: string[]) => void;
  equipmentFilter: string;
  setEquipmentFilter: (equipment: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  businessHours: BusinessHour[];
  currentDate: Date;
}

export function CalendarFilters({
  technicianFilter,
  setTechnicianFilter,
  statusFilter,
  setStatusFilter,
  equipmentFilter,
  setEquipmentFilter,
  searchQuery,
  setSearchQuery,
  businessHours,
  currentDate,
}: CalendarFiltersProps) {
  // State to hold technicians and equipment once fetched
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch technicians and equipment on component mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [techData, equipData] = await Promise.all([
          getMaintenanceTechnicians(),
          getUniqueEquipment()
        ]);
        setTechnicians(techData);
        setEquipment(equipData);
      } catch (error) {
        console.error("Error loading filters:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFilters();
  }, []);

  // Reset all filters
  const resetFilters = () => {
    setTechnicianFilter("all");
    setEquipmentFilter("all");
    setStatusFilter([]);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events, customers, locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Select
        value={technicianFilter}
        onValueChange={(value) => setTechnicianFilter(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Technicians" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="all">All Technicians</SelectItem>
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              {tech.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={equipmentFilter}
        onValueChange={(value) => setEquipmentFilter(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Equipment" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="all">All Equipment</SelectItem>
          {equipment.map((eq) => (
            <SelectItem key={eq} value={eq}>
              {eq}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Status Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border-border z-50">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(statusMap).map(([key, value]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={statusFilter.includes(key)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setStatusFilter([...statusFilter, key]);
                } else {
                  setStatusFilter(statusFilter.filter((s) => s !== key));
                }
              }}
            >
              {String(value)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={resetFilters}
      >
        <RefreshCw className="h-4 w-4" />
        Reset Filters
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Business Hours
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <BusinessHoursInfo 
            businessHours={businessHours} 
            currentDate={currentDate} 
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
