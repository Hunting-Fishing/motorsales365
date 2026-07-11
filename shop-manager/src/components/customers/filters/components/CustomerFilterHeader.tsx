
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerFilterHeaderProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeFiltersCount: number;
  onResetFilters: () => void;
}

export const CustomerFilterHeader: React.FC<CustomerFilterHeaderProps> = ({
  searchQuery,
  onSearchChange,
  expanded,
  setExpanded,
  activeFiltersCount,
  onResetFilters,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-grow">
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-10"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <div className="flex gap-2">
        <Button
          variant={expanded ? "secondary" : "outline"}
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetFilters}
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
