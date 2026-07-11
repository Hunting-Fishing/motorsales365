
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw, Search, Filter } from "lucide-react";

interface HistoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  actionTypeFilter: string;
  onActionTypeFilterChange: (value: string) => void;
  onRefresh: () => void;
}

export function HistoryFilters({
  searchTerm,
  onSearchChange,
  actionTypeFilter,
  onActionTypeFilterChange,
  onRefresh,
}: HistoryFiltersProps) {
  return (
    <div className="flex flex-col gap-4 w-full sm:w-auto sm:flex-row items-start lg:items-center">
      <div className="relative w-full sm:w-[220px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-full"
        />
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={actionTypeFilter}
          onValueChange={onActionTypeFilterChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="role_change">Role Change</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
            <SelectItem value="permission">Permission Change</SelectItem>
            <SelectItem value="navigation_access">Navigation Access</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="flagged">Flagged Only</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
