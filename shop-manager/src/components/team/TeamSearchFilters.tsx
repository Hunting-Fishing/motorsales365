
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface TeamSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: string[];
  onRoleFilterChange: (roles: string[]) => void;
  departmentFilter: string[];
  onDepartmentFilterChange: (depts: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  availableRoles: string[];
  availableDepartments: string[];
  availableStatuses: string[];
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function TeamSearchFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  availableRoles,
  availableDepartments,
  availableStatuses,
  onClearFilters,
  activeFilterCount
}: TeamSearchFiltersProps) {
  const toggleFilter = (currentFilters: string[], value: string): string[] => {
    if (currentFilters.includes(value)) {
      return currentFilters.filter(f => f !== value);
    }
    return [...currentFilters, value];
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or job title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            onClick={onClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Filter Badges */}
      <div className="space-y-3">
        {/* Status Filters */}
        {availableStatuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map(status => (
                <Badge
                  key={status}
                  variant={statusFilter.includes(status) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onStatusFilterChange(toggleFilter(statusFilter, status))}
                >
                  {status}
                  {statusFilter.includes(status) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Role Filters */}
        {availableRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map(role => (
                <Badge
                  key={role}
                  variant={roleFilter.includes(role) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onRoleFilterChange(toggleFilter(roleFilter, role))}
                >
                  {role}
                  {roleFilter.includes(role) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Department Filters */}
        {availableDepartments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Department</p>
            <div className="flex flex-wrap gap-2">
              {availableDepartments.map(dept => (
                <Badge
                  key={dept}
                  variant={departmentFilter.includes(dept) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onDepartmentFilterChange(toggleFilter(departmentFilter, dept))}
                >
                  {dept}
                  {departmentFilter.includes(dept) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
