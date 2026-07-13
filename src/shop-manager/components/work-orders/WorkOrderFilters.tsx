
import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusMap } from "@/types/workOrder";

interface WorkOrderFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  selectedTechnician: string;
  setSelectedTechnician: (technician: string) => void;
  technicians: string[];
  resetFilters: () => void;
}

export default function WorkOrderFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  selectedTechnician,
  setSelectedTechnician,
  technicians,
  resetFilters
}: WorkOrderFiltersProps) {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Toggle status in filter array
  const toggleStatus = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  // Handle technician selection
  const handleTechnicianChange = (value: string) => {
    setSelectedTechnician(value);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter.length > 0) count++;
    if (selectedTechnician !== "all") count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Search and filter buttons */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-3 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-full border-blue-100 focus:border-blue-300"
            placeholder="Search work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button 
          variant={isFilterExpanded ? "secondary" : "outline"}
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="rounded-full font-medium border-blue-100 hover:border-blue-300 hover:bg-blue-50"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
        
        {getActiveFilterCount() > 0 && (
          <Button 
            variant="ghost" 
            onClick={resetFilters}
            className="text-sm text-muted-foreground hover:text-blue-600 rounded-full"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isFilterExpanded && (
        <div className="bg-white dark:bg-slate-900 p-4 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
          {/* Status filters */}
          <div>
            <h3 className="font-medium text-sm mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusMap).map(([key, label]) => (
                <Badge 
                  key={key}
                  variant={statusFilter.includes(key) ? "default" : "outline"}
                  className={`cursor-pointer rounded-full px-3 py-1 text-sm ${
                    statusFilter.includes(key) 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "hover:bg-blue-50"
                  }`}
                  onClick={() => toggleStatus(key)}
                >
                  {String(label)}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Technician filter */}
          <div>
            <h3 className="font-medium text-sm mb-2">Technician</h3>
            <Select value={selectedTechnician} onValueChange={handleTechnicianChange}>
              <SelectTrigger className="w-full sm:w-[220px] rounded-full border-blue-100 focus:border-blue-300">
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
