
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RolesSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
}

export function RolesSearch({ 
  searchQuery, 
  onSearchChange, 
  typeFilter, 
  onTypeFilterChange 
}: RolesSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          type="search"
          placeholder="Search roles by name or description..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        value={typeFilter}
        onValueChange={onTypeFilterChange}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="default">Default Roles</SelectItem>
          <SelectItem value="custom">Custom Roles</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
